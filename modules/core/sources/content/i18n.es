/* global chrome */
export default {
  getMessage(...args) {
    return chrome.i18n.getMessage(...args) || args[0];
  },
};
