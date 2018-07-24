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
  sendMessage(extensionId, message) {
    chrome.runtime.sendMessage(extensionId, message);
  }
};
