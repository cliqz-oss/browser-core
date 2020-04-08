/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { window, chrome } from '../platform/globals';
import * as tabs from '../platform/tabs';

import inject, { setGlobal } from '../core/kord/inject';

import {
  app,
  testServer,
  win,
} from '../tests/core/integration/helpers';

// Include all integration tests in the same bundle
import '../module-integration-tests';

setGlobal(app);

const TEST_URL = window.location.href;

(function start() {
  const tabsListener = new Map();

  chrome.tabs.onUpdated.addListener((tabId, _, tab) => {
    tabsListener.set(tabId, tab.url);
  });

  chrome.tabs.onCreated.addListener((tab) => {
    tabsListener.set(tab.id, tab.url);
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    tabsListener.delete(tabId);
  });

  const closeAllTabs = async () => {
    const onTabCloseException = () => {};

    const promises = [];
    for (const [tabId, url] of tabsListener) {
      // Don't close about pages as they are commonly used to debug state of the browser
      if (url !== TEST_URL && url.startsWith('about:') === false) {
        promises.push(tabs.closeTab(tabId).catch(onTabCloseException));
      }
    }

    if (promises.length === 0) {
      return;
    }

    await Promise.all(promises);
  };

  // Inject all tests
  Object.keys(window.TESTS).forEach((testName) => {
    const testFunction = window.TESTS[testName];
    testFunction();
  });

  // Intercept all telemetry
  win.allTelemetry = [];
  const integrationTestsTelemetryProvider = {
    name: 'integration-tests',
    send: (signal, schema, instant) => {
      win.allTelemetry.push({
        signal, schema, instant,
      });
    }
  };

  before(async () => {
    for (const tab of await tabs.query({})) {
      tabsListener.set(tab.id, tab.url);
    }

    await closeAllTabs();
    await testServer.reset();
    inject.service('telemetry', ['installProvider']).installProvider(integrationTestsTelemetryProvider);
  });

  after(async () => {
    await closeAllTabs();
    await testServer.reset();
    inject.service('telemetry', ['uninstallProvider']).uninstallProvider(integrationTestsTelemetryProvider);
  });

  beforeEach(async () => {
    win.allTelemetry = [];
  });

  afterEach(async () => {
    // Reset global state
    win.CLIQZ.TestHelpers.http.resetFetchHandler();
    win.CLIQZ.TestHelpers.historySearch.resetHistorySearchHandler();
    win.CLIQZ.TestHelpers.searchEngines.resetSuggestionsHandler();
    await testServer.reset();
    if (!win.preventRestarts) {
      await closeAllTabs();
    }
  });

  // Check if we should autostart the tests
  const searchParams = new window.URLSearchParams(window.location.search);
  const autostartParams = searchParams.getAll('autostart');
  const autostart = autostartParams[autostartParams.length - 1];

  if (autostart === 'true') {
    mocha.run();
  }
}());
