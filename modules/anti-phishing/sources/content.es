import { registerContentScript, CHROME_MSG_SOURCE, isCliqzContentScriptMsg } from '../core/content/helpers';

registerContentScript('http*', (window, chrome, windowId) => {
  let url = window.location.href;

  // do not check for iframes
  if (window.parent && window.parent === window) {
    let payload = {
      module: 'anti-phishing',
      action: 'isPhishingURL',
      args: [url]
    }

    chrome.runtime.sendMessage( {
      source: CHROME_MSG_SOURCE,
      windowId,
      payload
    })
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (!isCliqzContentScriptMsg(msg)) {
      return;
    }

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
