import { NativeModules } from 'react-native';

const Bridge = NativeModules.Bridge;

export default {
  onMessage: {
    addListener() {
      // return chrome.runtime.onMessageExternal.addListener(fn);
    },
    removeListener() {
      // return chrome.runtime.onMessageExternal.removeListener(fn);
    },
  },
  sendMessage(extensionId, message) {
    if (!Bridge || !Bridge.sendExternalMessage) {
      return;
    }
    Bridge.sendExternalMessage(extensionId, message);
  }
};
