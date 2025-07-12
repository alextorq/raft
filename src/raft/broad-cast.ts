import { BroadCastI, Message, CallBack } from './types.ts';

export class BroadCast extends BroadcastChannel implements BroadCastI {
  constructor(channel: string) {
    super(channel);
  }

  removeHandler(callBack: CallBack): unknown {
    return this.removeEventListener('message', (e) => {
      callBack(e);
    });
  }

  sendMessage(message: MessageEvent<Message>) {
      return this.postMessage(message)
  }

  addHandler(callBack: CallBack){
    this.addEventListener('message', (e) => {
        callBack(e)
    })
  };
}