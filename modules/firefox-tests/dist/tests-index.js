const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import("resource://gre/modules/FileUtils.jsm");
Cu.import("resource://gre/modules/NetUtil.jsm");
Cu.import("resource://gre/modules/FileUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import('chrome://cliqzmodules/content/CLIQZ.jsm');

var EventUtils = {};
Services.scriptloader.loadSubScript('chrome://cliqz/content/firefox-tests/EventUtils.js', EventUtils);

function loadModule(moduleName) {
  const mod = getWindow().CLIQZ.app.debugModules[moduleName];
  if (!mod) {
    throw new Error (`${moduleName} is not found`);
  }
  return mod;
}

function getWindow() {
  const wm = Cc['@mozilla.org/appshell/window-mediator;1']
              .getService(Ci.nsIWindowMediator);
  return wm.getMostRecentWindow("navigator:browser");
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

var win = getWindow(),
    CliqzUtils = loadModule("core/utils").default,
    CliqzABTests = loadModule("core/ab-tests").default,
    CliqzHumanWeb = loadModule("human-web/human-web").default,
    CliqzAutocomplete = loadModule("autocomplete/autocomplete").default,
    telemetry,
    fetchFactory,
    getSuggestions,
    historySearch,
    fetchAndStoreConfig,
    fetchAndStoreHM,
    abCheck,
    browserMajorVersion = parseInt(getBrowserVersion().split('.')[0]),
    app = null;

win.allTelemetry = [];

function start() {
// Try to get app
app = win.CLIQZ ? win.CLIQZ.app : null;

if (app === null || !app.isFullyLoaded) {
  setTimeout(start, 1000);
  return;
}

injectTestHelpers(CliqzUtils, loadModule);
initHttpServer();


function changes() {
  fetchFactory = CliqzUtils.fetchFactory;
  getSuggestions = CliqzUtils.getSuggestions;
  historySearch = CliqzUtils.historySearch;

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
  var testFunction = window.TESTS[testName],
      moduleNames = window.DEPS[testName],
      modules;

  if (moduleNames !== undefined) {
    try {
      modules = moduleNames.map(loadModule).map(module => module.default);
    } catch(e) {
      console.error("module loading error - skiping tests");
      return;
    }
  }

  if ('MIN_BROWSER_VERSION' in testFunction && browserMajorVersion < testFunction.MIN_BROWSER_VERSION) {
    return; // skip tests
  }

  testFunction.apply(null, modules);
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

TESTS.TestToDos = function() {
  describe('TODO', function() {
    xit('green ads should be enabled');
  });
};

start();
