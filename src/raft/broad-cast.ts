import { BroadCastI, Message, CallBack } from './types.ts';

export class BroadCast extends BroadcastChannel implements BroadCastI {
  constructor(channel: string) {
    super(channel);
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