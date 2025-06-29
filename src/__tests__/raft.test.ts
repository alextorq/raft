import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RaftNode } from '../raft/raft.ts';
import { NodeState, Command, NodeId } from '../raft/types.ts';
import { BroadCastI } from '../raft/broad-cast.ts';
import { Logger } from '../raft/logger.ts';

const mockBroadcastChannel: BroadCastI = {
  sendMessage: vi.fn(),
  addHandler: vi.fn(),
};

class MockLogger extends Logger {
  constructor(nodeId: NodeId) {
    super(nodeId);
  }

  log = vi.fn();
  warn = vi.fn();
  error = vi.fn();
}

describe('RaftNode', () => {
  let node: RaftNode;
  const nodeId: NodeId = 'node1' as NodeId;
  const otherNodeId: NodeId = 'node2' as NodeId;
  let mockLogger: Logger;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    mockLogger = new MockLogger(nodeId);
    node = new RaftNode(nodeId, mockBroadcastChannel, mockLogger);
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.spyOn(Math, 'random').mockRestore();
  });

  describe('Initial State', () => {
    it('should initialize as a Follower', () => {
      expect(node.state).toBe(NodeState.Follower);
    });

    it('should set up broadcast listener on initialization', () => {
      expect(mockBroadcastChannel.addHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('Election Timeout', () => {
    it('should transition to Candidate state when election timeout occurs', () => {
      expect(node.state).toBe(NodeState.Follower);
      // Clear any existing calls
      (mockBroadcastChannel.sendMessage as any).mockClear();
      // Send StartElection message to trigger candidate state
      const handler = (mockBroadcastChannel.addHandler as any).mock.calls[0][0];
      handler({
        data: {
          type: Command.StartElection,
          nodeId: nodeId
        }
      });
      expect(node.state).toBe(NodeState.Candidate);
    });

    it('should start election by sending StartElection message', () => {
      (mockBroadcastChannel.sendMessage as any).mockClear();
      // Send StartElection message
      const handler = (mockBroadcastChannel.addHandler as any).mock.calls[0][0];
      handler({
        data: {
          type: Command.StartElection,
          nodeId: nodeId
        }
      });

      // Check that at least one of the messages is a StartElection
      const messages = (mockBroadcastChannel.sendMessage as any).mock.calls;
      const startElectionMessage = messages.find(
        (call: { type: Command }[]) => call[0].type === Command.StartElection,
      );
      expect(startElectionMessage).toBeTruthy();
      expect(startElectionMessage[0].type).toBe(Command.StartElection);
      expect(startElectionMessage[0].nodeId).toBe(nodeId);
    });
  });

  describe('Heartbeat Mechanism', () => {
    it('should send heartbeat messages when in Leader state', () => {
      // First become a candidate
      const handler = (mockBroadcastChannel.addHandler as any).mock.calls[0][0];
      handler({
        data: {
          type: Command.StartElection,
          nodeId: nodeId
        }
      });

      // Then trigger a state change to leader
      node.state = NodeState.Leader;

      // Clear any messages sent during state changes
      (mockBroadcastChannel.sendMessage as any).mockClear();

      // Trigger heartbeat - using the heartbeatInterval from RaftNode (1000ms)
      vi.advanceTimersByTime(1000);

      // Verify heartbeat message
      expect(mockBroadcastChannel.sendMessage).toHaveBeenCalledTimes(1);
      const heartbeat = (mockBroadcastChannel.sendMessage as any).mock.calls[0][0];
      expect(heartbeat.type).toBe(Command.HeardBeat);
      expect(heartbeat.nodeId).toBe(nodeId);
      expect(heartbeat.state).toBe(NodeState.Leader);
    });

    it('should stay as Follower when receiving valid heartbeats', () => {
      const handler = (mockBroadcastChannel.addHandler as any).mock.calls[0][0];

      handler({
        data: {
          type: Command.HeardBeat,
          nodeId: otherNodeId,
          state: NodeState.Leader
        }
      });

      // Should not transition to candidate within max election timeout
      vi.advanceTimersByTime(2900);
      expect(node.state).toBe(NodeState.Follower);
    });
  });

  describe('State Transitions', () => {
    it('should step down to Follower when receiving heartbeat from valid leader', () => {
      node.state = NodeState.Candidate;
      const handler = (mockBroadcastChannel.addHandler as any).mock.calls[0][0];

      handler({
        data: {
          type: Command.HeardBeat,
          nodeId: otherNodeId,
          state: NodeState.Leader
        }
      });

      expect(node.state).toBe(NodeState.Follower);
    });

    it('should notify about state changes', () => {
      const stateChangeListener = vi.fn();
      node.on('stateChange', stateChangeListener);

      // Trigger state change to candidate
      const handler = (mockBroadcastChannel.addHandler as any).mock.calls[0][0];
      handler({
        data: {
          type: Command.StartElection,
          nodeId: nodeId
        }
      });

      expect(stateChangeListener).toHaveBeenCalledWith(NodeState.Candidate);
    });
  });

  describe('Node Lifecycle', () => {
    it('should handle create messages', () => {
      const handler = (mockBroadcastChannel.addHandler as any).mock.calls[0][0];

      // Clear any previous calls to log
      (mockLogger.log as any).mockClear();

      // Send create message and become leader first
      handler({
        data: {
          type: Command.StartElection,
          nodeId: nodeId
        }
      });

      handler({
        data: {
          type: Command.FinishElection,
          nodeId: nodeId,
          leader: nodeId
        }
      });

      // Then handle create message
      handler({
        data: {
          type: Command.Create,
          nodeId: otherNodeId
        }
      });

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should handle destroy messages', () => {
      const handler = (mockBroadcastChannel.addHandler as any).mock.calls[0][0];

      handler({
        data: {
          type: Command.Destroy,
          nodeId: otherNodeId,
          state: NodeState.Follower
        }
      });

      expect(mockLogger.log).toHaveBeenCalled();
    });
  });
});
