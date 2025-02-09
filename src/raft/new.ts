enum RaftState {
    FOLLOWER = "follower",
    CANDIDATE = "candidate",
    LEADER = "leader",
}

interface RaftMessage {
    type: "vote_request" | "vote_response" | "heartbeat";
    term: number;
    senderId: string;
    voteGranted?: boolean;
}

class Logger {
    static log(message: string) {
        console.log(`[Raft] ${message}`);
    }
}

class EventEmitter {
    private events: { [key: string]: Function[] } = {};

    on(event: string, listener: Function) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);
    }

    emit(event: string, ...args: any[]) {
        if (this.events[event]) {
            this.events[event].forEach(listener => listener(...args));
        }
    }
}

export class RaftNode extends EventEmitter {
    public state: RaftState = RaftState.FOLLOWER;
    private term: number = 0;
    private votedFor: string | null = null;
    private votesReceived: Set<string> = new Set();
    private id: string = Math.random().toString(36).substring(2);
    private channel: BroadcastChannel;
    private heartbeatInterval?: number;
    private electionTimeout?: number;

    constructor() {
        super();
        this.channel = new BroadcastChannel("raft_channel");
        this.channel.onmessage = (event) => this.handleMessage(event.data);
        this.resetElectionTimeout();
    }

    private setState(newState: RaftState) {
        if (this.state !== newState) {
            Logger.log(`State change: ${this.state} -> ${newState}`);
            this.state = newState;
            this.emit("stateChange", newState);
        }
    }

    private resetElectionTimeout() {
        if (this.electionTimeout) clearTimeout(this.electionTimeout);
        this.electionTimeout = window.setTimeout(() => this.startElection(), 1500 + Math.random() * 1500);
    }

    private startElection() {
        Logger.log("Starting election");
        this.setState(RaftState.CANDIDATE);
        this.term++;
        this.votedFor = this.id;
        this.votesReceived.clear();
        this.votesReceived.add(this.id);
        this.broadcast({ type: "vote_request", term: this.term, senderId: this.id });
        this.resetElectionTimeout();
    }

    private handleMessage(message: RaftMessage) {
        if (message.term > this.term) {
            this.term = message.term;
            this.votedFor = null;
            this.setState(RaftState.FOLLOWER);
            this.resetElectionTimeout();
        }

        switch (message.type) {
            case "vote_request":
                if (!this.votedFor && message.term >= this.term) {
                    this.votedFor = message.senderId;
                    this.broadcast({ type: "vote_response", term: this.term, senderId: this.id, voteGranted: true });
                }
                break;

            case "vote_response":
                if (this.state === RaftState.CANDIDATE && message.voteGranted) {
                    this.votesReceived.add(message.senderId);
                    if (this.votesReceived.size > 1) {
                        this.setState(RaftState.LEADER);
                        this.sendHeartbeats();
                    }
                }
                break;

            case "heartbeat":
                if (this.state !== RaftState.LEADER) {
                    this.setState(RaftState.FOLLOWER);
                    this.resetElectionTimeout();
                }
                break;
        }
    }

    private sendHeartbeats() {
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = window.setInterval(() => {
            this.broadcast({ type: "heartbeat", term: this.term, senderId: this.id });
        }, 1000);
    }

    private broadcast(message: RaftMessage) {
        this.channel.postMessage(message);
    }
}

