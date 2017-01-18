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


function writeLogsToFile(logs) {
  var version = getBrowserVersion();
  var filename = 'logs-' + version + '.json';
  writeToFile(JSON.stringify(logs), filename);
}


function writeTestResultsToFile(testData) {
  var version = getBrowserVersion();
  var filename = 'mocha-report-' + version + '.xml';
  writeToFile(testData, filename);
}


var runner;
var CliqzUtils = loadModule("core/utils"),
    CliqzABTests = loadModule("core/ab-tests"),
    CliqzHumanWeb = loadModule("human-web/human-web"),
    chrome = CliqzUtils.getWindow(),
    telemetry,
    getBackendResults,
    fetchAndStoreConfig,
    fetchAndStoreHM,
    abCheck,
    browserMajorVersion = parseInt(getBrowserVersion().split('.')[0]);

mocha.setup({ ui: 'bdd', timeout: 20000 });

/**
 * If extension did not intialize properly we want to kill tests ASAP
 */
if (!CliqzUtils) {
  describe("CLIQZ Tests", function () {
    it("initialize property", function () {
      throw "CliqzUtils missing";
    });
    after(function () {
      // Force end hook to fire
      runner.emit('end');
    });
  });
}

injectTestHelpers(CliqzUtils);
initHttpServer();

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

beforeEach(function () {
  window.closeAllTabs(chrome.gBrowser);
  return CliqzUtils.extensionRestart(function () {
    getBackendResults = CliqzUtils.getBackendResults;

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
  }.bind(this));
});

afterEach(function () {
  CliqzUtils.telemetry = telemetry;
  CliqzUtils.getBackendResults = getBackendResults;
  CliqzUtils.fetchAndStoreConfig = fetchAndStoreConfig;
  CliqzHumanWeb.fetchAndStoreConfig = fetchAndStoreHM;
  CliqzABTests.check = abCheck;

  // clear urlbar
  if (chrome.CLIQZ.Core.popup) {
    fillIn("");
  }

  // clean waitFor side effects
  clearIntervals();
});

window.focus();


// Capture console logs
var logs = [];
var theConsoleListener = {
  observe:function( aMessage ) {
    logs.push(aMessage);
  },
  QueryInterface: function (iid) {
    if (!iid.equals(Components.interfaces.nsIConsoleListener) &&
        !iid.equals(Components.interfaces.nsISupports)) {
      throw Components.results.NS_ERROR_NO_INTERFACE;
    }
    return this;
  }
};

var aConsoleService = Components.classes["@mozilla.org/consoleservice;1"]
    .getService(Components.interfaces.nsIConsoleService);
aConsoleService.registerListener(theConsoleListener);


// Init Mocha runner
var runner =  mocha.run();

var XMLReport = '<?xml version="1.0" encoding="UTF-8"?>';

Mocha.reporters.XUnit.prototype.write = function (line) {
  var version = getBrowserVersion();

  //append project="ff-version" in the test report for jenkins purposes
  if(line.indexOf('<testsuite') !== -1) {
    var line_parts = line.split(" ");
    line_parts.splice(1, 0, 'package="' + 'ff-' + version + '"');
    line = line_parts.join(" ");
  }

  XMLReport += line;
};

new Mocha.reporters.XUnit(runner, {});

runner.on('end', function () {
  writeTestResultsToFile(XMLReport);
  writeLogsToFile(logs);
  if(getParameterByName('closeOnFinish') === "1") { closeBrowser(); }
});
