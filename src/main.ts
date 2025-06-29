import { RafBuilder, NodeState} from './raft';

const stateEl = document.querySelector('#state-value');

const node = new RafBuilder().build()
node.init()

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
