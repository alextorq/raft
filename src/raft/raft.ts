import { EventEmitter } from './emitter.ts';
import {
  BroadCastI,
  Command,
  CreateMessage, DestroyMessage,
  FinishElectionMessage, HeartbeatMessage,
  LoggerI,
  Message,
  NodeId,
  NodeState, StartElectionMessage
} from './types.ts';

// TODO replace Inheritance to Composition
export class RaftNode extends EventEmitter {
  public state: NodeState = NodeState.Follower;

  private leaderId: NodeId | null = null;

  private lastHeartbeatLeader = Date.now();
  private readonly heartbeatInterval = 1000;
  private readonly startElectionTimeout = 10000;
  private readonly electionTimeoutRange = { min: 2000, max: 3000 };
  private readonly multiply = 5;

  private readonly nodeId: NodeId;
  private readonly channel: BroadCastI;
  private readonly logger: LoggerI;

  private readonly activeNodes: Set<NodeId>;
  private electionTimer: number;

  constructor(nodeId: NodeId, broadcast: BroadCastI, logger: LoggerI) {
    super();
    this.nodeId = nodeId;
    this.logger = logger;
    this.electionTimer = 0;
    this.channel = broadcast;
    this.activeNodes = new Set();
    this.election = this.election.bind(this);
    this.sendHeartBeat = this.sendHeartBeat.bind(this);
    this.sendDestroyMessage = this.sendDestroyMessage.bind(this);
  }

  public init() {
    this.startHeartbeat();
    this.startElectionTimer();
    this.setupBroadcastListener();
  }

  private setState(newState: NodeState) {
    if (this.state !== newState) {
      this.state = newState;
      this.logger.log(`State changed to ${newState}`);
      this.emit('stateChange', newState);
      this.sendHeartBeat();
    }
  }

  private setupBroadcastListener() {
    this.channel.addHandler((event: MessageEvent<Message>) => {
      this.handleMessage(event.data);
    });
  }

  private handleMessage(message: Message) {
    switch (message.type) {
      case Command.HeardBeat:
        this.heartBeatHandler(message);
        break;
      case Command.Destroy:
        this.destroyMessageHandler(message);
        break;
      case Command.StartElection:
        this.becomeCandidate();
        break;
      case Command.Create:
        this.createMessageHandler(message);
        break;
      case Command.FinishElection:
        this.finishMessageHandler(message);
        break;
    }
  }

  private finishMessageHandler(message: FinishElectionMessage) {
    const leader = this.getLeader();
    if (leader !== message.leader) {
      this.logger.warn('collision leader');
      // this.becomeCandidate();
    }
  }

  private createMessageHandler(message: CreateMessage) {
    this.activeNodes.add(message.nodeId);
    switch (this.state) {
      case NodeState.Leader:
        this.sendHeartBeat();
        break;
      case NodeState.Candidate:
        this.sendElectionEvent();
        break;
    }
  }

  public sendDestroyMessage() {
    const message: DestroyMessage = {
      type: Command.Destroy,
      nodeId: this.nodeId,
      state: this.state,
    };
    this.channel.sendMessage(message);
  }

  public resume() {
    this.sendHeartBeat();
  }

  private destroyMessageHandler(message: DestroyMessage) {
    this.logger.log(`handlerDestroy ${message.nodeId}`);
    this.activeNodes.delete(message.nodeId);
    if (message.state === NodeState.Leader) {
      this.becomeCandidate();
    }
  }

  private becameFollower(leaderId: NodeId | null) {
    this.setState(NodeState.Follower);
    this.stopElectionTimer();
    this.leaderId = leaderId;
    this.lastHeartbeatLeader = Date.now();
  }

  private becameLeader() {
    this.setState(NodeState.Leader);
    this.stopElectionTimer();
    this.leaderId = this.nodeId;
  }

  private heartBeatHandler(message: HeartbeatMessage) {
    this.activeNodes.add(message.nodeId);

    switch (message.state) {
      case NodeState.Leader:
        this.lastHeartbeatLeader = Date.now();

        // При колизии инициируем перевыборы
        if (this.isLeader) {
          this.logger.log(`Collision with ${message.nodeId}`);
          this.becameFollower(null);
          return this.becomeCandidate();
        }

        this.leaderId = message.nodeId;

        if (this.state !== NodeState.Follower) {
          this.logger.log(`Became follower of leader ${this.leaderId}`);
        }
        // Вызываем на каждый бит поскольку вкладки могут досылать case NodeState.Candidate: поле выборов
        this.becameFollower(message.nodeId);
        break;
      //  WARNING Не обрабатываем
      // case NodeState.Candidate:
      //   this.becomeCandidate();
      //   break;
    }
  }

  private startElectionTimer() {
    const timeout =
      Math.random() *
        (this.electionTimeoutRange.max - this.electionTimeoutRange.min) +
      this.electionTimeoutRange.min;

    setTimeout(() => {
      if (this.state === NodeState.Leader) return;

      const now = Date.now();
      const heardBeatIsExpired =
        now - this.lastHeartbeatLeader > this.heartbeatInterval * this.multiply;

      if (heardBeatIsExpired) {
        this.becomeCandidate();
      }

      this.startElectionTimer();
    }, timeout);
  }

  private becomeCandidate() {
    if (this.state !== NodeState.Follower) return;
    this.logger.log(`Started election`);
    this.sendElectionEvent();

    this.leaderId = null;
    this.stopElectionTimer();

    this.setState(NodeState.Candidate);
    this.activeNodes.clear();
    this.activeNodes.add(this.nodeId);

    this.electionTimer = setTimeout(this.election, this.startElectionTimeout);
  }

  private stopElectionTimer() {
    clearTimeout(this.electionTimer);
  }

  private sendElectionEvent() {
    const event: StartElectionMessage = {
      type: Command.StartElection,
      nodeId: this.nodeId,
    };
    this.channel.sendMessage(event);
  }

  private get isLeader() {
    return this.state === NodeState.Leader;
  }

  private election() {
    // Если во время выборов приходит heartbeat и вкладка становится follower
    if (this.state !== NodeState.Candidate) return;
    const leader = this.getLeader();
    this.lastHeartbeatLeader = Date.now();
    if (leader === this.nodeId) {
      this.becameLeader();
    } else {
      this.becameFollower(leader);
    }
    this.finishElectionMessage(leader);
  }

  private getLeader() {
    // Стабильная сортировка (modern browsers) гарантирует
    return [...this.activeNodes.values()].sort()[0];
  }

  private sendHeartBeat() {
    const message: HeartbeatMessage = {
      type: Command.HeardBeat,
      nodeId: this.nodeId,
      state: this.state,
    };
    this.channel.sendMessage(message);
  }

  /**
   * При начальной загрузке увеличиваем время когда таб входит в кластер
   * На этапе голосование это позволяет сразу перейти в режим Candidate
   */
  private sendCreateMessage() {
    const message: CreateMessage = {
      type: Command.Create,
      nodeId: this.nodeId,
    };
    this.channel.sendMessage(message);
  }

  private finishElectionMessage(leader: NodeId) {
    const message: FinishElectionMessage = {
      type: Command.FinishElection,
      nodeId: this.nodeId,
      leader: leader,
    };
    this.channel.sendMessage(message);
  }

  /**
   * Посылаем одно событие сразу по создание
   * Если создание вкладки произошло во время выборов
   */
  private startHeartbeat() {
    this.sendCreateMessage();
    setInterval(this.sendHeartBeat, this.heartbeatInterval);
  }
}
