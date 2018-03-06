"use strict";

Components.utils.import('chrome://cliqz/content/firefox-tests/content/extern/httpd.js');
Components.utils.import('resource://gre/modules/FileUtils.jsm');
Components.utils.import('resource://gre/modules/osfile.jsm');
var AddonManager = Components.utils.import('resource://gre/modules/AddonManager.jsm');

var prefs = Components.classes['@mozilla.org/preferences-service;1']
        .getService(Components.interfaces.nsIPrefBranch);
/** Gets the absolute path to the Cliqz extension's root directory */
function getExtensionDirectory() {
  const config = getModule('core/config').default;
  const extensionId = config.settings.id;
  return new Promise(function (resolve) {
    try {
      resolve(JSON.parse(prefs.getCharPref('extensions.xpiState'))['app-profile'][extensionId].d);
    } catch (e1) {
      try {
        resolve(JSON.parse(prefs.getCharPref('extensions.xpiState'))['app-temporary'][extensionId].d);
      } catch (e2) {
        AddonManager.AddonManager.getAddonByID(
          extensionId,
          function (addon) {
            resolve(
              addon.getResourceURI('').path ||
              addon.getResourceURI('').filePath
            );
          }
        );
      }
    }
  });
}

function WrappedHttpServer() {
  this.port = 60508;
  this.domains = new Set(['cliqztest.com', 'cliqztest2.de', 'www.cliqztest.com']);
  this._s = null;
  this._testDirPrefix = null;
}

WrappedHttpServer.prototype = {
  _start: function() {
    console.log('start http server');
    this._s = new HttpServer();
    // add test domains to server identity
    this.domains.forEach(function(d) {
      this._s.identity.add('http', d, this.port);
    }.bind(this));

    this._s.start(this.port);
  },
  _stop: function(cb) {
    console.log('stop http server');
    this._s.stop(cb);
    this._s = null;
  },

  _getChromeDirFile: function(relative_path) {
    var abs_path = OS.Path.join.apply(OS.Path, this._testDirPrefix.concat(relative_path));
    return new FileUtils.File(abs_path);
  },

  _pathToArray: function(path) {
    if (typeof path === 'string') {
      return path.split('/');
    }
    return path;
  },

  /** Register that requests to server_path should be served from local_path
   */
  registerDirectory: function(server_path, local_path) {
    local_path = this._pathToArray(local_path);
    this._s.registerDirectory(server_path, this._getChromeDirFile(local_path));
  },

  /** Register that requests to path should be handled by handler
    */
  registerPathHandler: function(path, handler) {
    this._s.registerPathHandler(path, handler);
  },

  /** Clear this http server's handlers
   */
  clearHandlers: function() {
    var handler = this._s._handler;
    handler._overridePaths = {};
    handler._overridePrefixes = {};
    handler._pathDirectoryMap._map = {};
  },

  /** Helper method for manually writing file contents to a response in a handler.
    */
  writeFileResponse: function(request, file_path, response) {
    var file = this._getChromeDirFile(this._pathToArray(file_path));
    this._s._handler._writeFileResponse(request, file, response, 0, file.fileSize);
  }
};

var testServer = null;

function initHttpServer() {

  // set up proxy config via PAC file. Restore previous settings on test exit
  var proxyAutoconfigUrl = null,
      proxyType = null;

  before(function() {
    // create and start http server, and register shutdown on window unload.
    return getExtensionDirectory()
      .then(function (extensionDirectory) {
        testServer._testDirPrefix = [extensionDirectory, 'chrome', 'content'];
        testServer._start();
        window.onunload = testServer._stop.bind(testServer);
      })
      .catch(function (ex) {
        console.error('ERROR', ex);
      })
  });

  testServer = new WrappedHttpServer();

  // clear server handlers automatically after each test.
  afterEach(function() {
    testServer.clearHandlers();
  });
}
