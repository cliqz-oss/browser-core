import { window } from '../platform/globals';
import * as tabs from '../platform/tabs';

import {
  CliqzABTests,
  CliqzUtils,
  app,
  prefs,
  testServer,
  win,
} from '../tests/core/integration/helpers';


function mockGlobalState() {
  // Disable core/ab-tests
  CliqzABTests.check = () => {};

  // Store all telemetry signals globally so that tests can use them
  win.allTelemetry = [];
  CliqzUtils.telemetry = (signal) => {
    win.allTelemetry.push(signal);
  };

  // We only need the tests for the regular cliqz dropdown
  prefs.set('dropDownABCGroup', 'cliqz');
  prefs.clear('dropDownStyle');
}


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

  // Keep track of original versions of mocked objects
  const abCheck = CliqzABTests.check;
  const fetchFactory = CliqzUtils.fetchFactory;
  const getSuggestions = CliqzUtils.getSuggestions;
  const historySearch = CliqzUtils.historySearch;
  const telemetry = CliqzUtils.telemetry;

  // Check with which frequency the extension should be restarted between tests
  const reloadExtensionCounterInc = Number(prefs.get('integration-tests.forceExtensionReload', 0));
  let reloadExtensionCounter = 0;

  before(async () => {
    await closeAllTabs();
    await testServer.reset();
  });

  after(async () => {
    await closeAllTabs();
    await testServer.reset();
  });

  beforeEach(async () => {
    if (reloadExtensionCounterInc === 0) {
      mockGlobalState();
    } else if (win.preventRestarts) {
      mockGlobalState();
    } else {
      reloadExtensionCounter += reloadExtensionCounterInc;
      if (reloadExtensionCounter >= 1) {
        reloadExtensionCounter = 0;
        await app.extensionRestart(mockGlobalState);
      } else {
        mockGlobalState();
      }
    }
  });

  afterEach(async () => {
    CliqzUtils.telemetry = telemetry;
    CliqzUtils.fetchFactory = fetchFactory;
    CliqzUtils.getSuggestions = getSuggestions;
    CliqzUtils.historySearch = historySearch;
    CliqzABTests.check = abCheck;

    // Reset global state
    await testServer.reset();
    if (!win.preventRestarts) {
      await closeAllTabs();
    }
  });

  win.focus();

  // Check if we should autostart the tests
  const searchParams = new window.URLSearchParams(window.location.search);
  const autostartParams = searchParams.getAll('autostart');
  const autostart = autostartParams[autostartParams.length - 1];

  if (autostart === 'true') {
    mocha.run();
  }
}());
