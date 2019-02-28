import inject from '../core/kord/inject';

const ANDROID_ID = 'ANDROID_BROWSER';

export default class {
  init() {
    this.promises = Object.create(null);
    this.promiseCounter = 0;
    chrome.runtime.onMessage.addListener((message) => {
      // Message from Android
      if (message.source === ANDROID_ID) {
        const resolve = this.promises[message.requestId];
        if ('response' in message && resolve) { // response
          resolve(message.response);
        } else if ('ping' in message) { // check if ready
          this.sendReadySignal();
        } else if (message.module) { // request
          const module = inject.module(message.module);
          module.action(
            message.action,
            ...(message.args || []),
          ).then(response =>
            chrome.runtime.sendMessage({
              source: chrome.runtime.id,
              target: ANDROID_ID,
              response,
              requestId: message.requestId,
            }));
        }
      }
    });
    this.sendReadySignal();
  }

  sendReadySignal() {
    chrome.runtime.sendMessage({
      source: chrome.runtime.id,
      target: ANDROID_ID,
      action: 'ready',
      args: [],
    });
  }

  callAndroidAction(action, ...args) {
    const promise = new Promise((resolve) => {
      this.promises[this.promiseCounter] = resolve;
    });
    chrome.runtime.sendMessage({
      source: chrome.runtime.id,
      target: ANDROID_ID,
      requestId: this.promiseCounter,
      action,
      args,
    });
    this.promiseCounter += 1;
    return promise;
  }
}
