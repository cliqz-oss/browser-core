import events from '../core/events';
import { chrome } from './globals';
import utils from "../core/utils";

export default class {

  constructor(dispatcher) {
    this.dispatch = dispatcher;
  }

  init() {
    chrome.webNavigation.onCommitted.addListener(({ url }) => {
      events.pub('content:location-change', {
        url,
      });
    });

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      const messageId = sender.tab.id;
      this.dispatch({
        data: {
          payload: message,
          windowId: messageId,
        }
      });
      return true;
    });
  }

  unload() {
  }

  broadcast(channel, msg) {
    let [_, windowId] = channel.split('-');
    chrome.tabs.sendMessage(Number(windowId), {
      ...msg,
      type: 'response',
    });
  }
}
