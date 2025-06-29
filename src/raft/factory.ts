import { v4 as uuidv4 } from 'uuid';
import { RaftNode } from './raft.ts';
import { BroadCast } from './broad-cast.ts';
import { Logger } from './logger.ts';
import { BroadCastI, LoggerI, NodeId } from './types.ts';

export type RafParams = {
  nodeId: NodeId
  cluster: string
  logger: LoggerI
  broadCast: BroadCastI
}

export const createRaf = (params: Partial<RafParams>) => {
  const cluster = params.cluster || 'raft-channel'
  const nodeId = params.nodeId || uuidv4();
  const logger = params.logger || new Logger(nodeId)
  const broadCast = params.broadCast ||  new BroadCast(cluster)

  return new RaftNode(
    nodeId,
    broadCast,
    logger,
  );
}