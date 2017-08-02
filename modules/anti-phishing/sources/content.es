import { registerContentScript } from '../core/content/helpers';

registerContentScript('http*', (window, chrome, windowId) => {
  let url = window.location.href;

  if (window.parent && url === window.parent.document.documentURI) {
    // do not check for iframes
    let payload = {
      module: 'anti-phishing',
      action: 'isPhishingURL',
      args: [url]
    }

    chrome.runtime.sendMessage( {
      windowId,
      payload
    })
  }

  chrome.runtime.onMessage.addListener((msg) => {
    let WARNINGURL = 'chrome://cliqz/content/anti-phishing/phishing-warning.html?u=';
    if (msg.windowId === windowId) {
      if (msg && msg.response && msg.response.type === 'phishingURL') {
        if (msg.response.block) {
          window.location = WARNINGURL + encodeURIComponent(window.location);
        }
      }
    }
  });
})
