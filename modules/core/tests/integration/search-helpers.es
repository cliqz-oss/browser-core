/* global $ */

import { isWebExtension } from '../../../core/platform';
import {
  app,
  CliqzUtils,
  EventUtils,
  expect,
  popup,
  testServer,
  urlBar,
  waitFor,
  win,
} from '../test-helpers';

export const $cliqzResults = {
  _getEl() {
    return $(win.document.getElementById('cliqz-popup').contentWindow.document.getElementById('cliqz-dropdown'));
  },
  querySelector(...args) {
    return this._getEl()[0].querySelector(...args);
  },
  querySelectorAll(...args) {
    return this._getEl()[0].querySelectorAll(...args);
  }
};

export function fillIn(text) {
  urlBar.valueIsTyped = true;
  popup.mPopupOpen = false;
  urlBar.focus();
  urlBar.mInputField.focus();
  urlBar.mInputField.value = '';
  EventUtils.sendString(text);
}

export async function mockSearch(response) {
  await testServer.registerPathHandler('/api/v2/results', { result: JSON.stringify(response) });
  app.config.settings.RESULTS_PROVIDER = testServer.getBaseUrl('/api/v2/results?nrh=1&q=');
}

export function testsEnabled() {
  return !isWebExtension;
}

export async function waitForPopup(resultsCount, timeout = 700) {
  await waitFor(() => {
    const cliqzPopup = win.document.getElementById('cliqz-popup');
    return cliqzPopup && (cliqzPopup.style.height !== '0px');
  });

  if (resultsCount) {
    await waitFor(
      () => expect($cliqzResults.querySelectorAll('.cliqz-result')).to.have.length(resultsCount),
      timeout,
    );
  }

  return $cliqzResults;
}

export function withHistory(res, ms = 0) {
  CliqzUtils.historySearch = function (q, cb) {
    setTimeout(cb, ms, {
      query: q,
      results: res,
      ready: true,
    });
  };
}
