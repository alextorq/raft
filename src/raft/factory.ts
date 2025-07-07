import { v4 as uuidv4 } from 'uuid';
import { RaftNode } from './raft.ts';
import { BroadCast } from './broad-cast.ts';
import { Logger } from './logger.ts';
import { BroadCastI, EventEmitterI, LoggerI, NodeId } from './types.ts';
import { EventEmitter } from './emitter.ts';

export type RafParams = {
  nodeId: NodeId
  cluster: string
  logger: LoggerI
  broadCast: BroadCastI
  emitter: EventEmitterI
}

export class RafBuilder {
  private params: Partial<RafParams>

  public constructor() {
    this.params = {}
  }

  public setLogger(logger: LoggerI) {
    this.params.logger = logger
    return this
  }

  public setBroadCast(broadCast: BroadCastI) {
    this.params.broadCast = broadCast
    return this
  }

  public setNodeId(nodeId: NodeId) {
    this.params.nodeId = nodeId
    return this
  }

  public setCluster(cluster: string) {
    this.params.cluster = cluster
    return this
  }


  public build() {
    const cluster = this.params.cluster || 'raft-channel'
    const nodeId = this.params.nodeId || uuidv4();
    const logger = this.params.logger || new Logger(nodeId)
    const broadCast = this.params.broadCast ||  new BroadCast(cluster)
    const emitter = this.params.emitter || new EventEmitter()

    return new RaftNode(
      nodeId,
      broadCast,
      logger,
      emitter,
    );
  }
}