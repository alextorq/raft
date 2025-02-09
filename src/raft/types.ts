export type NodeId = string;

export enum NodeState {
  Follower = 'Follower',
  Candidate = 'Candidate',
  Leader = 'Leader',
}

export enum Command {
  HeardBeat = 'HeardBeat',
  StartElection = 'StartElection',
  Destroy = 'Destroy',
  Create = 'Create',
  FinishElection = 'FinishElection',
}

export interface RaftMessage {
  type: Command;
  nodeId: NodeId;
}

export interface HeartbeatMessage extends RaftMessage {
  type: Command.HeardBeat;
  state: NodeState;
}

export interface StartElectionMessage extends RaftMessage {
  type: Command.StartElection;
}

export interface FinishElectionMessage extends RaftMessage {
  type: Command.FinishElection;
  leader: NodeId;
}

export interface CreateMessage extends RaftMessage {
  type: Command.Create;
}

export interface DestroyMessage extends RaftMessage {
  type: Command.Destroy;
  state: NodeState;
}

export type Message =
  | HeartbeatMessage
  | StartElectionMessage
  | DestroyMessage
  | CreateMessage
  | FinishElectionMessage;
