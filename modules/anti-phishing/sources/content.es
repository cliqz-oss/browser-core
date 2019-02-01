/* eslint no-param-reassign: 'off' */

import { registerContentScript } from '../core/content/helpers';

const WARNINGURL = chrome.runtime.getURL('/modules/anti-phishing/phishing-warning.html?u=');

registerContentScript('anti-phishing', 'http*', (window, chrome, CLIQZ) => {
  CLIQZ.app.modules['anti-phishing']
    .action('isPhishingURL', window.location.href)
    .then((respond) => {
      const { block, type } = respond;
      if (block && type === 'phishingURL') {
        window.location = `${WARNINGURL}${encodeURIComponent(window.location)}`;
      }
    });
});
