import { Logger, NodeState, RaftNode } from './raft';
import { BroadCast } from './raft/broad-cast.ts';
import { v4 as uuidv4 } from 'uuid';

const stateEl = document.querySelector('#state-value');

const nodeId = uuidv4();
const node = new RaftNode(
  nodeId,
  new BroadCast('raft-channel'),
  new Logger(nodeId),
);

const changeDom = (state: NodeState) => {
  if (stateEl) {
    stateEl.innerHTML = state;
    document.title = state;
  }
};

changeDom(node.state)
node.on('stateChange', changeDom);

window.addEventListener('beforeunload', node.sendDestroyMessage);
window.addEventListener('freeze', node.sendDestroyMessage);
window.addEventListener('resume', node.resume);
