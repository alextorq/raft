import { LoggerI, NodeId } from './types.ts';

export class Logger implements LoggerI{
    private nodeId: NodeId;

    constructor(nodeId: NodeId) {
        this.nodeId = nodeId;
    }

    log(message: string, data?: any) {
        console.log(`[Node ${this.nodeId}] ${message}`, data || '');
    }

    error(message: string, data?: any) {
        console.error(`[Node ${this.nodeId}] ${message}`, data || '');
    }

    warn(message: string, data?: any) {
        console.warn(`[Node ${this.nodeId}] ${message}`, data || '');
    }
}