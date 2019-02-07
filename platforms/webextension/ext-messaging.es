import { chrome } from './globals';

export default {
  onMessage: {
    addListener(fn) {
      return chrome.runtime.onMessageExternal.addListener(fn);
    },
    removeListener(fn) {
      return chrome.runtime.onMessageExternal.removeListener(fn);
    },
  },
  sendMessage(extensionId, message, callback = () => null) {
    chrome.runtime.sendMessage(extensionId, message, (args) => {
      if (chrome.runtime.lastError) {
        callback(undefined);
      }

      callback(args);
    });
  }
};
