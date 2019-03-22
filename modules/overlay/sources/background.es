import background from '../core/base/background';
import { chrome } from '../platform/globals';

/**
  @namespace <namespace>
  @class Background
 */
export default background({
  /**
    @method init
    @param settings
  */
  init() {
    chrome.commands.onCommand.addListener((command) => {
      if (command === 'toggle-quicksearch') {
        chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
          if (!tab) {
            return;
          }
          chrome.tabs.sendMessage(tab.id, {
            module: 'overlay',
            action: 'toggle-quicksearch',
            trigger: 'ByKeyboard',
          });
        });
      }
    });
  },

  unload() {

  },

  beforeBrowserShutdown() {

  },

  events: {

  },

  actions: {

  },
});
