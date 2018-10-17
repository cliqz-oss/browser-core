/* global document */
/* eslint no-param-reassign: 'off' */

import { window } from './globals';

const eventIDs = {};
const port = chrome.runtime.connect({ name: 'encrypted-query' });
port.onMessage.addListener((response) => {
  const cb = eventIDs[response.eID].cb;
  delete eventIDs[response.eID];
  if (cb) {
    cb(response.data);
  }
});

const CLIQZEnvironment = {
  SKIN_PATH: 'modules/static/skin/',
  RESULTS_TIMEOUT: 1000, // 1 second
  trk: [],
  telemetry() {},
  Promise,
  OS: 'chromium',
  isPrivate() { return chrome.extension.inIncognitoContext; },
  isOnPrivateTab() { return chrome.extension.inIncognitoContext; },
  getWindow() { return window; },
  openLink(win, url/* , newTab */) {
    chrome.windows.getCurrent({ populate: true }, ({ tabs }) => {
      const activeTab = tabs.find(tab => tab.active);
      chrome.tabs.update(activeTab.id, {
        url,
      });
    });
  },
  setSupportInfo() {},
  restoreHiddenSearchEngines() {},
  addEngineWithDetails() {},
  _waitForSearchService() { return Promise.resolve(); },
};

export default CLIQZEnvironment;
