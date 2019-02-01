const config = CLIQZ.app.config;

const onBrowserActionClick = () => {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab) {
      return;
    }
    if (config.settings.browserAction === 'quicksearch'
      && !tab.url.startsWith('about:')
      && !tab.url.startsWith('chrome:')
    ) {
      chrome.tabs.sendMessage(tab.id, {
        module: 'overlay',
        action: 'toggle-quicksearch',
      });
    } else {
      chrome.tabs.create({});
    }
  });
};

CLIQZ.app.ready().then(() => {
  chrome.browserAction.onClicked.addListener(onBrowserActionClick);
});
