/* global document */
/* eslint no-param-reassign: 'off' */

import { chrome } from './globals';
import { getWindow } from './browser';

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
  Promise,
  OS: 'chromium',
  isPrivate(win) {
    return win.incognito || chrome.extension.inIncognitoContext;
  },
  getWindow,
  openLink(win, url, newTab = false, active = true) {
    if (newTab) {
      chrome.tabs.create({ url, active });
    } else {
      chrome.windows.getCurrent({ populate: true }, ({ tabs }) => {
        const activeTab = tabs.find(tab => tab.active);
        chrome.tabs.update(activeTab.id, {
          url
        });
      });
    }
  },
  setSupportInfo() { },
  restoreHiddenSearchEngines() { },
  addEngineWithDetails() { },
  _waitForSearchService() { return Promise.resolve(); },
};

export default CLIQZEnvironment;
