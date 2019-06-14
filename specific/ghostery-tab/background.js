/* global CLIQZ */
const app = CLIQZ.app;

chrome.browserAction.onClicked.addListener(() => {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (tab) {
      if (app.config.settings.browserAction === 'quicksearch'
        && !tab.url.startsWith('about:')
        && !tab.url.startsWith('chrome:')
        && !tab.url.startsWith('moz-extension')
        && !tab.url.startsWith('chrome-extension')
      ) {
        chrome.tabs.sendMessage(tab.id, {
          module: 'overlay',
          action: 'toggle-quicksearch',
          trigger: 'ByMouse',
        });
      } else {
        chrome.tabs.create({});
      }
    }
  });
});
