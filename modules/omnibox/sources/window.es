import { chrome } from '../platform/globals';

export default class Win {
  init() {
    if (chrome && chrome.omnibox2) {
      chrome.omnibox2.updateMany([{
        focused: true,
        selectionStart: Number.MAX_SAFE_INTEGER,
        selectionEnd: Number.MAX_SAFE_INTEGER,
      }]);
    }
  }

  unload() {}
}
