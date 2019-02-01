import { chrome } from '../platform/globals';

export default class Win {
  init() {
    if (chrome && chrome.omnibox2) {
      chrome.omnibox2.focus();
    }
  }

  unload() {}
}
