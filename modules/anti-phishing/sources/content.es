/* eslint no-param-reassign: 'off' */

import { registerContentScript } from '../core/content/helpers';

// TODO: this has to be a resource:// url
const WARNINGURL = 'chrome://cliqz/content/anti-phishing/phishing-warning.html?u=';

registerContentScript('anti-phishing', 'http*', (window, chrome) => {
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.module !== 'anti-phishing' || msg.action !== 'block') {
      return;
    }

    const { block, type } = msg.args[0];

    if (block && type === 'phishingURL') {
      window.location = WARNINGURL + encodeURIComponent(window.location);
    }
  });
});
