import events from '../core/events';
import { chrome } from './globals';

export default class {

  constructor(dispatcher) {
  }

  init() {
    chrome.webNavigation.onCommitted.addListener(({ url }) => {
      events.pub('content:location-change', {
        url,
      });
    });
  }

  unload() {
  }

  broadcast(channel, msg) {
  }

  addMessageListener(channel, cb) {
  }

  removeMessageListener(channel, cb) {
  }
}
