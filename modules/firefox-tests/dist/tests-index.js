const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import("resource://gre/modules/FileUtils.jsm");
Cu.import("resource://gre/modules/NetUtil.jsm");
Cu.import("resource://gre/modules/FileUtils.jsm");
Cu.import('chrome://cliqzmodules/content/CLIQZ.jsm');

function loadModule(moduleName) {
  console.log(moduleName)
  return CLIQZ.System.get(moduleName).default;
}

function getBrowserVersion() {
  var userAgent = navigator.userAgent,
      userAgentParts = userAgent.split('/'),
      version = userAgentParts[userAgentParts.length - 1];

  return version;
}

function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

function closeBrowser() {
  Cc['@mozilla.org/toolkit/app-startup;1']
    .getService(Ci.nsIAppStartup)
    .quit(Ci.nsIAppStartup.eForceQuit);
}

function writeToFile(content, filename) {
  var file = FileUtils.getFile('ProfD', [filename]);
  var ostream = FileUtils.openSafeFileOutputStream(file);
  var converter = Cc['@mozilla.org/intl/scriptableunicodeconverter']
                    .createInstance(Ci.nsIScriptableUnicodeConverter);
  var istream;

  converter.charset = 'UTF-8';
  istream = converter.convertToInputStream(content);

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
  timeout: 30000,
  reporter: TAP
});

var CliqzUtils = loadModule("core/utils"),
    CliqzABTests = loadModule("core/ab-tests"),
    CliqzHumanWeb = loadModule("human-web/human-web"),
    CliqzAutocomplete = loadModule("autocomplete/autocomplete"),
    chrome = CliqzUtils.getWindow(),
    telemetry,
    getBackendResults,
    historySearch,
    fetchAndStoreConfig,
    fetchAndStoreHM,
    abCheck,
    browserMajorVersion = parseInt(getBrowserVersion().split('.')[0]),
    app = null;

function start() {
// Try to get app
app = chrome.CLIQZ ? chrome.CLIQZ.app : null;

CliqzUtils = loadModule("core/utils");
if (app === null || !app.isFullyLoaded) {
  setTimeout(start, 1000);
  return;
}

injectTestHelpers(CliqzUtils);
initHttpServer();


function changes() {
  getBackendResults = CliqzUtils.getBackendResults;
  historySearch = CliqzAutocomplete.historySearch;

  fetchAndStoreHM = CliqzHumanWeb.fetchAndStoreConfig;
  CliqzHumanWeb.fetchAndStoreConfig = function () {};

  fetchAndStoreConfig = CliqzUtils.fetchAndStoreConfig;
  CliqzUtils.fetchAndStoreConfig = function () {
    CliqzUtils.setPref("config_location", "de");
    CliqzUtils.setPref("backend_country", "de");
    CliqzUtils.setPref("config_logoVersion", "1473867650984");
    CliqzUtils.setPref("config_backends", ["de"]);
    return CliqzUtils.Promise.resolve();
  };

  abCheck = CliqzABTests.check;
  CliqzABTests.check = function () {};

  /* Turn off telemetry during tests */
  telemetry = CliqzUtils.telemetry;
  CliqzUtils.telemetry = function () {};
  // we only need the tests for the regular cliqz dropdown
  CliqzUtils.setPref('dropDownABCGroup', 'cliqz');
  CliqzUtils.clearPref('dropDownStyle');
}


// Load Tests and inject their dependencies
Object.keys(window.TESTS).forEach(function (testName) {
  var testFunction = window.TESTS[testName],
      moduleNames = window.DEPS[testName],
      modules;

  if (moduleNames !== undefined) {
    modules = moduleNames.map(loadModule);
  }

  if ('MIN_BROWSER_VERSION' in testFunction && browserMajorVersion < testFunction.MIN_BROWSER_VERSION) {
    return; // skip tests
  }

  testFunction.apply(null, modules);
});


var reloadExtensionBetweenTests = getParameterByName('forceExtensionReload') === '1';
var beforeEachAction = function (changes) { changes(); return Promise.resolve(); };
if (reloadExtensionBetweenTests) {
  beforeEachAction = app.extensionRestart.bind(app);
}


beforeEach(function () {
  window.closeAllTabs(chrome.gBrowser);
  return beforeEachAction(changes);
});

afterEach(function () {
  CliqzUtils.telemetry = telemetry;
  CliqzUtils.getBackendResults = getBackendResults;
  CliqzAutocomplete.historySearch = historySearch;
  CliqzUtils.fetchAndStoreConfig = fetchAndStoreConfig;
  CliqzHumanWeb.fetchAndStoreConfig = fetchAndStoreHM;
  CliqzABTests.check = abCheck;

  // clear urlbar
  fillIn("");
  // if we don't blur, there can be problems with old results appearing...
  chrome.gURLBar.blur();

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

TESTS.TestToDos = function() {
  describe('TODO', function() {
    xit('green ads should be enabled');
  });
};


start();
