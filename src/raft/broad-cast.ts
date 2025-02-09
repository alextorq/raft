import {Message} from "./types.ts";

type CallBack = (event: MessageEvent<Message>) => unknown


export interface BroadCastI  {
    sendMessage(message: any): void
    addHandler(callBack: CallBack): unknown
}

export class BroadCast extends BroadcastChannel implements BroadCastI{
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