const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://gre/modules/FileUtils.jsm');
Cu.import('resource://gre/modules/NetUtil.jsm');
Cu.import('resource://gre/modules/FileUtils.jsm');
Cu.import('resource://gre/modules/Services.jsm');
Cu.import('chrome://cliqzmodules/content/CLIQZ.jsm');

const EventUtils = {};
Services.scriptloader.loadSubScriptWithOptions('chrome://cliqz/content/firefox-tests/EventUtils.js', { target: EventUtils, ignoreCache: true });

function getWindow() {
  const wm = Cc['@mozilla.org/appshell/window-mediator;1']
    .getService(Ci.nsIWindowMediator);
  return wm.getMostRecentWindow('navigator:browser');
}

function getBrowserVersion() {
  const userAgent = navigator.userAgent;
  const userAgentParts = userAgent.split('/');
  const version = userAgentParts[userAgentParts.length - 1];

  return version;
}

function getParameterByName(name) {
  name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  const regex = new RegExp(`[\\?&]${name}=([^&#]*)`);
  const results = regex.exec(location.search);
  return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

function closeBrowser() {
  Cc['@mozilla.org/toolkit/app-startup;1']
    .getService(Ci.nsIAppStartup)
    .quit(Ci.nsIAppStartup.eForceQuit);
}

function writeToFile(content, filename) {
  const file = FileUtils.getFile('ProfD', [filename]);
  const ostream = FileUtils.openSafeFileOutputStream(file);
  const converter = Cc['@mozilla.org/intl/scriptableunicodeconverter']
    .createInstance(Ci.nsIScriptableUnicodeConverter);
  // var istream;

  converter.charset = 'UTF-8';
  const istream = converter.convertToInputStream(content);

  NetUtil.asyncCopy(istream, ostream);
}


function writeTestResultsToFile(testData) {
  var version = getBrowserVersion();
  var filename = 'mocha-report-' + version + '.xml';
  writeToFile(testData, filename);
}

var runner;

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
let fetchAndStoreConfig;
let fetchAndStoreHM;
let abCheck;
let app = null;

win.allTelemetry = [];

function start() {
// Try to get app
  app = win.CLIQZ ? win.CLIQZ.app : null;
  window.app = app;

  if (app === null || !app.isFullyLoaded) {
    setTimeout(start, 1000);
    return;
  }

  injectTestHelpers(CliqzUtils);
  initHttpServer();


  function changes() {
    CliqzHumanWeb.fetchAndStoreConfig = function () {};
    CliqzUtils.fetchAndStoreConfig = function () {
      CliqzUtils.setPref('config_location', 'de');
      CliqzUtils.setPref('backend_country', 'de');
      CliqzUtils.setPref('config_logoVersion', '1473867650984');
      CliqzUtils.setPref('config_backends', ['de']);
      return CliqzUtils.Promise.resolve();
    };

    CliqzABTests.check = function () {};

    /* Turn off telemetry during tests */
    win.allTelemetry = [];
    CliqzUtils.telemetry = function (signal) {
      win.allTelemetry.push(signal);
    };
    // we only need the tests for the regular cliqz dropdown
    CliqzUtils.setPref('dropDownABCGroup', 'cliqz');
    CliqzUtils.clearPref('dropDownStyle');
  }


  // Load Tests and inject their dependencies
  Object.keys(window.TESTS).forEach(function (testName) {
    var testFunction = window.TESTS[testName];

    if ('MIN_BROWSER_VERSION' in testFunction && browserMajorVersion < testFunction.MIN_BROWSER_VERSION) {
      return; // skip tests
    }

    testFunction(CliqzUtils);
  });


  var reloadExtensionCounterInc = Number(getParameterByName('forceExtensionReload'));
  var reloadExtensionCounter = 0;
  var beforeEachAction = function (changes) { changes(); return Promise.resolve(); };

  if (reloadExtensionCounterInc) {
    beforeEachAction = function (changes) {
      if (window.preventRestarts) {
        return Promise.resolve().then(() => changes());
      } else if (reloadExtensionCounter >= 1) {
        reloadExtensionCounter = 0;
        return app.extensionRestart(changes);
      } else {
        reloadExtensionCounter += reloadExtensionCounterInc;
        return Promise.resolve().then(() => changes());
      }
    }
  }

  before(function () {
    fetchFactory = CliqzUtils.fetchFactory;
    getSuggestions = CliqzUtils.getSuggestions;
    historySearch = CliqzUtils.historySearch;
    fetchAndStoreHM = CliqzHumanWeb.fetchAndStoreConfig;
    fetchAndStoreConfig = CliqzUtils.fetchAndStoreConfig;
    abCheck = CliqzABTests.check;
    telemetry = CliqzUtils.telemetry;
  });


beforeEach(function () {
  window.closeAllTabs(win.gBrowser);
  return beforeEachAction(changes);
});

afterEach(function () {
  CliqzUtils.telemetry = telemetry;
  CliqzUtils.fetchFactory = fetchFactory;
  CliqzUtils.getSuggestions = getSuggestions;
  CliqzUtils.historySearch = historySearch;
  CliqzUtils.fetchAndStoreConfig = fetchAndStoreConfig;
  CliqzHumanWeb.fetchAndStoreConfig = fetchAndStoreHM;
  CliqzABTests.check = abCheck;

  // clean waitFor side effects
  clearIntervals();
});

window.focus();


// Init Mocha runner
var runner =  mocha.run();

// var XMLReport = '<?xml version="1.0" encoding="UTF-8"?>';

// Mocha.reporters.XUnit.prototype.write = function (line) {
//   var version = getBrowserVersion();
//
//   //append project="ff-version" in the test report for jenkins purposes
//   if(line.indexOf('<testsuite') !== -1) {
//     var line_parts = line.split(" ");
//     line_parts.splice(1, 0, 'package="' + 'ff-' + version + '"');
//     line = line_parts.join(" ");
//   }
//
//   XMLReport += line;
// };
//
//

runner.on('end', function () {
  if (getParameterByName('closeOnFinish') === "1") { closeBrowser(); }
});
}

start();
