/* global FileUtils, HttpServer, getWindow */
/* eslint-disable*/

Components.utils.import('chrome://cliqz/content/firefox-tests/content/extern/httpd.js');
Components.utils.import('resource://gre/modules/FileUtils.jsm');
Components.utils.import('resource://gre/modules/osfile.jsm');
const AddonManager = Components.utils.import('resource://gre/modules/AddonManager.jsm');

const prefs = Components.classes['@mozilla.org/preferences-service;1']
  .getService(Components.interfaces.nsIPrefBranch);
/** Gets the absolute path to the Cliqz extension's root directory */
function getExtensionDirectory() {
  const config = getWindow().CLIQZ.app.config;
  const extensionId = config.settings.id;
  return new Promise((resolve) => {
    try {
      resolve(JSON.parse(prefs.getCharPref('extensions.xpiState'))['app-profile'][extensionId].d);
    } catch (e1) {
      try {
        resolve(JSON.parse(prefs.getCharPref('extensions.xpiState'))['app-temporary'][extensionId].d);
      } catch (e2) {
        AddonManager.AddonManager.getAddonByID(
          extensionId,
          (addon) => {
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
  _start() {
    console.log('start http server');
    this._s = new HttpServer();
    // add test domains to server identity
    this.domains.forEach(function (d) {
      this._s.identity.add('http', d, this.port);
    }.bind(this));

    this._s.start(this.port);
  },
  _stop(cb) {
    console.log('stop http server');
    this._s.stop(cb);
    this._s = null;
  },

  _getChromeDirFile(relativePath) {
    const absPath = OS.Path.join.apply(OS.Path, this._testDirPrefix.concat(relativePath));
    return new FileUtils.File(absPath);
  },

  _pathToArray(path) {
    if (typeof path === 'string') {
      return path.split('/');
    }
    return path;
  },

  /** Register that requests to serverPath should be served from localPath
   */
  registerDirectory(serverPath, localPath) {
    localPath = this._pathToArray(localPath);
    this._s.registerDirectory(serverPath, this._getChromeDirFile(localPath));
  },

  /** Register that requests to path should be handled by handler
    */
  registerPathHandler(path, handler) {
    this._s.registerPathHandler(path, handler);
  },

  /** Clear this http server's handlers
   */
  clearHandlers() {
    const handler = this._s._handler;
    handler._overridePaths = {};
    handler._overridePrefixes = {};
    handler._pathDirectoryMap._map = {};
  },

  /** Helper method for manually writing file contents to a response in a handler.
    */
  writeFileResponse(request, filePath, response) {
    const file = this._getChromeDirFile(this._pathToArray(filePath));
    this._s._handler._writeFileResponse(request, file, response, 0, file.fileSize);
  }
};

let testServer = null;

function initHttpServer() {
  // set up proxy config via PAC file. Restore previous settings on test exit
  let proxyAutoconfigUrl = null;
  let proxyType = null;

  before(function () {
    // create and start http server, and register shutdown on window unload.
    return getExtensionDirectory()
      .then(function (extensionDirectory) {
        testServer._testDirPrefix = [extensionDirectory, 'chrome', 'content'];
        testServer._start();
        window.onunload = testServer._stop.bind(testServer);
      })
      .catch((ex) => {
        console.error('ERROR', ex);
      });
  });

  testServer = new WrappedHttpServer();

  // clear server handlers automatically after each test.
  afterEach(function () {
    testServer.clearHandlers();
  });
}
