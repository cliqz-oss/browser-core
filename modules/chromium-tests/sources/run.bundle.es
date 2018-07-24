/* global window */

import {
  clearIntervals,
  // getResourceUrl,
  prefs,
  testServer
} from '../tests/core/test-helpers';
import { PREF_GREP /* , URL_DUMMY */ } from './consts';

const getGrepParam = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const greps = searchParams.getAll('grep');
  const grep = greps[greps.length - 1];
  return grep;
};

window.onload = () => {
  /*
  let tabId;
  beforeEach(() => new Promise((resolve) => {
    const grep = getGrepParam();

    if (grep) {
      prefs.set(PREF_GREP, grep);
    }

    chrome.tabs.query(
      {
        active: true,
        lastFocusedWindow: true
      },
      (tabs) => { tabId = tabs[0].id; resolve(); },
    );
  }));
  */
  // eslint-disable-next-line
  beforeEach(function () {
    const grep = getGrepParam();

    if (grep) {
      prefs.set(PREF_GREP, grep);
    }
  });

  afterEach(() => {
    clearIntervals();
    return testServer.reset();
    /*
    return new Promise((resolve) => {
      chrome.tabs.query(
        {},
        (tabs) => {
          chrome.tabs.remove(
            tabs
              .filter(tab => !tab.url.startsWith(getResourceUrl('chromium-tests', 'test.html')))
              .filter(tab => tab.url !== URL_DUMMY)
              .map(tab => tab.id)
              .filter(id => id !== tabId),
            resolve,
          );
        }
      );
    }).then(() => testServer.reset());
    */
  });

  Object.keys(window.TESTS).forEach((name) => {
    window.TESTS[name]();
  });

  const runner = mocha.run();

  // Output report on stdout
  runner.on('end', () => {
    // console.error(`RESULTS ${window.btoa(
    // JSON.stringify({ report: XMLReport.join('') }))} RESULTS`);
  });
};
