import { window } from '../platform/globals';
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


async function closeAllTabs() {
  await Promise.all((await tabs.query({}))
    .filter(({ url }) => url !== TEST_URL)
    .filter(({ url }) => !url.startsWith('about:')) // don't close about pages as they are commonly used to debug state of the browser
    .map(({ id, url }) =>
      // eslint-disable-next-line no-console
      tabs.closeTab(id).catch(ex => console.error('Could not close tab', id, url, ex))));
}


(function start() {
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
