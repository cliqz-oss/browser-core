import background from '../core/base/background';
import { chrome } from '../platform/globals';
import { getMessage } from '../platform/i18n';
import config from '../core/config';

function triggerOverlay(tab, triggeredBy, query = '') {
  chrome.tabs.sendMessage(tab.id, {
    module: 'overlay',
    action: 'toggle-quicksearch',
    trigger: triggeredBy,
    query,
  });
}

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
    chrome.contextMenus.create({
      id: 'context-search',
      title: getMessage('context_menu_search_item', [config.settings.appName, '%s']),
      contexts: ['selection'],
      documentUrlPatterns: [
        'http://*/*',
        'https://*/*',
      ]
    });

    chrome.contextMenus.onClicked.addListener((info, tab) => {
      triggerOverlay(tab, 'ByContextMenu', info.selectionText);
    });

    chrome.commands.onCommand.addListener((command) => {
      if (command === 'toggle-quicksearch') {
        chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
          if (!tab) {
            return;
          }
          triggerOverlay(tab, 'ByKeyboard');
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
