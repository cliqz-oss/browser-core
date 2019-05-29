const app = chrome.extension.getBackgroundPage().CLIQZ.app;

chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  if (tab) {
    if (app.config.settings.browserAction === 'quicksearch'
      && !tab.url.startsWith('about:')
      && !tab.url.startsWith('chrome:')
      && !tab.url.startsWith('moz-extension')
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
  window.close();
});
