/* global window, chrome */

import App from '../core/app';

const CLIQZ = {};
CLIQZ.app = new App({});
CLIQZ.app.start();
window.CLIQZ = CLIQZ;

chrome.runtime.onMessage.addListener((message) => {
  if (message.source === 'cliqz-android') {
    CLIQZ.app.modules[message.module].action(
      message.action,
      ...(message.args || []),
    ).then(response =>
      chrome.runtime.sendMessage({
        source: chrome.runtime.id,
        target: 'cliqz-android',
        response,
        uuid: message.uuid,
      })
    );
  }
});

window.addEventListener('unload', () => {
  CLIQZ.app.stop();
});
