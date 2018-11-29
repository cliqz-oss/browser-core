/* global window chrome */

import { waitFor } from '../helpers/wait';

const isChromeReady = async () => {
  const isWebextension = chrome.extension;

  // on firefox platform, we wait for chrome object as cliqz is ready at that time
  if (!isWebextension) {
    if (typeof chrome !== 'object') {
      throw new Error('chrome object not there yet');
    }

    // if non extension chrome is there, we are most likely in content tests
    return true;
  }

  // on webextensions, we connect to background and wait for message back
  return new Promise((resolve) => {
    const port = browser.runtime.connect({ name: 'appReady' });
    port.onMessage.addListener((message) => {
      if (message.ready) {
        port.disconnect();
        resolve(true);
      }
    });
  });
};

export default function checkIfChromeReady() {
  return waitFor(isChromeReady).catch((e) => {
    window.console.error('failed to access Cliqz background page', e);
    throw e;
  });
}
