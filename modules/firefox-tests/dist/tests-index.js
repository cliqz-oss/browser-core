/* global browserMajorVersion, clearIntervals, CliqzABTests, CliqzHumanWeb, CliqzUtils,
 injectTestHelpers, initHttpServer, TAP */
/* eslint no-param-reassign: off */
/* eslint func-names: off */
/* eslint prefer-arrow-callback: off */

Components.utils.import('chrome://cliqzmodules/content/CLIQZ.jsm');

function getWindow() {
  const wm = Components.classes['@mozilla.org/appshell/window-mediator;1']
    .getService(Components.interfaces.nsIWindowMediator);
  return wm.getMostRecentWindow('navigator:browser');
}

function getBrowserVersion() {
  const userAgent = navigator.userAgent;
  const userAgentParts = userAgent.split('/');
  const version = userAgentParts[userAgentParts.length - 1];

  return version;
}

function getParameterByName(name) {
  name = name.replace(/[[]/, '\\[').replace(/[\]]/, '\\]');
  const regex = new RegExp(`[\\?&]${name}=([^&#]*)`);
  const results = regex.exec(location.search);
  return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

function closeBrowser() {
  Components.classes['@mozilla.org/toolkit/app-startup;1']
    .getService(Components.interfaces.nsIAppStartup)
    .quit(Components.interfaces.nsIAppStartup.eForceQuit);
}

mocha.setup({
  ui: 'bdd',
  reporter: TAP,
  timeout: 5000,
});

const win = getWindow();
window.CliqzUtils = win.CliqzUtils;
window.CliqzABTests = win.CliqzABTests;
window.CliqzHumanWeb = win.CliqzHumanWeb;
window.browserMajorVersion = parseInt(getBrowserVersion().split('.')[0], 10);
let telemetry;
let fetchFactory;
let getSuggestions;
let historySearch;
let fetchAndStoreHM;
let abCheck;
let app = null;

win.allTelemetry = [];

function start() {
// Try to get app
  app = win.CLIQZ ? win.CLIQZ.app : null;
  window.app = app;
  const prefs = app.services['test-helpers']._initializer.prefs;

  if (app === null || !app.isFullyLoaded) {
    setTimeout(start, 1000);
    return;
  }

  injectTestHelpers(CliqzUtils);
  initHttpServer();


  function changes() {
    CliqzHumanWeb.fetchAndStoreConfig = function () {};
    CliqzABTests.check = function () {};

    /* Turn off telemetry during tests */
    win.allTelemetry = [];
    CliqzUtils.telemetry = function (signal) {
      win.allTelemetry.push(signal);
    };
    // we only need the tests for the regular cliqz dropdown
    prefs.set('dropDownABCGroup', 'cliqz');
    prefs.clear('dropDownStyle');
    app.services.pingCliqzResults = function () {};
  }


  // Load Tests and inject their dependencies
  Object.keys(window.TESTS).forEach(function (testName) {
    const testFunction = window.TESTS[testName];

    if ('MIN_BROWSER_VERSION' in testFunction && browserMajorVersion < testFunction.MIN_BROWSER_VERSION) {
      return; // skip tests
    }

    testFunction(CliqzUtils);
  });


  const reloadExtensionCounterInc = Number(getParameterByName('forceExtensionReload'));
  let reloadExtensionCounter = 0;
  let beforeEachAction = function (_changes) { _changes(); return Promise.resolve(); };

  if (reloadExtensionCounterInc) {
    beforeEachAction = function (_changes) {
      if (window.preventRestarts) {
        return Promise.resolve().then(() => _changes());
      }
      reloadExtensionCounter += reloadExtensionCounterInc;
      if (reloadExtensionCounter >= 1) {
        reloadExtensionCounter = 0;
        return app.extensionRestart(_changes);
      }
      return Promise.resolve().then(() => _changes());
    };
  }

  before(function () {
    fetchFactory = CliqzUtils.fetchFactory;
    getSuggestions = CliqzUtils.getSuggestions;
    historySearch = CliqzUtils.historySearch;
    fetchAndStoreHM = CliqzHumanWeb.fetchAndStoreConfig;
    abCheck = CliqzABTests.check;
    telemetry = CliqzUtils.telemetry;
  });

  beforeEach(function () {
    window.closeAllTabs(win.gBrowser);
    clearIntervals();
    return beforeEachAction(changes);
  });

  afterEach(function () {
    CliqzUtils.telemetry = telemetry;
    CliqzUtils.fetchFactory = fetchFactory;
    CliqzUtils.getSuggestions = getSuggestions;
    CliqzUtils.historySearch = historySearch;
    CliqzHumanWeb.fetchAndStoreConfig = fetchAndStoreHM;
    CliqzABTests.check = abCheck;

    // clean waitFor side effects
    clearIntervals();
  });

  window.focus();


  // Init Mocha runner
  const runner = mocha.run();

  runner.on('end', function () {
    if (getParameterByName('closeOnFinish') === '1') { closeBrowser(); }
  });
}

start();
