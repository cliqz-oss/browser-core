export default {
  onMessage: {
    addListener() {
      // return chrome.runtime.onMessageExternal.addListener(fn);
    },
    removeListener() {
      // return chrome.runtime.onMessageExternal.removeListener(fn);
    },
  },
  sendMessage() {
    // chrome.runtime.sendMessage(extensionId, message, (args) => {
    //   if (chrome.runtime.lastError) {
    //     callback(undefined);
    //   }

    //   callback(args);
    // });
  }
};
