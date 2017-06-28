'use strict';

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');
Components.utils.import('resource://gre/modules/Services.jsm');
Components.utils.importGlobalProperties(['TextEncoder', 'TextDecoder', 'btoa', 'atob']);

var global = {
  Cc: Components.classes,
  Ci: Components.interfaces,
  Cu: Components.utils,
  Cm: Components.manager,
  Cr: Components.results,
  CC: Components.Constructor,
  XPCOMUtils: XPCOMUtils,
  Services: Services,
  TextEncoder: TextEncoder,
  TextDecoder: TextDecoder,
  btoa: btoa,
  atob: atob,
};

try {
  Components.utils.importGlobalProperties(['crypto']);
  global.crypto = crypto;
} catch (e) {
  // not present in older FF versions
}

(function (exports) {
  function loadTimers() {
    Services.scriptloader.loadSubScript('chrome://cliqz/content/runloop.js', global);
  }

  function loadPromise() {
    Services.scriptloader.loadSubScript('chrome://cliqz/content/bower_components/es6-promise/es6-promise.js', global);
    global.Promise = global.ES6Promise.Promise;
    global.Promise._setScheduler(function (flush) {
      return global.setTimeout(flush, 1);
    });
  }

  function loadSystem() {
    Services.scriptloader.loadSubScript('chrome://cliqzmodules/content/extern/system-polyfill.js', global);
    global.System.baseURL = 'chrome://cliqz/content/';
    global.System.normalizeSync = function (modName) { return modName; };
  }

  // TODO: should be loaded via modules that require those
  function loadLibs() {
    var context = {};

    Services.scriptloader.loadSubScript('chrome://cliqz/content/bower_components/handlebars/handlebars.js', context);
    Services.scriptloader.loadSubScript('chrome://cliqz/content/bower_components/mathjs/dist/math.min.js', context);

    global.System.set('handlebars', {default: context.Handlebars});
    global.System.set('mathjs', {default: context.math});
  }

  function loadLegacyCodePolyfill() {
    var context = {};
    Components.utils.import('chrome://cliqzmodules/content/CLIQZ.jsm', context);
    context.CLIQZ.System = global.System;
    global.System.import('core/utils').then(function (module) {
      context.CLIQZ.CliqzUtils = module.default;
    });
    global.System.import('core/events').then(function (module) {
      context.CLIQZ.CliqzEvents = module.default;
    });
  }

  loadTimers();
  loadPromise();
  loadSystem();
  loadLibs();

  global.System.set('system', { default: global.System });
  global.System.set('promise', { default: global.Promise });

  loadLegacyCodePolyfill();

  exports.CLIQZ = {

    start: function (aData, aReason) {
      global.System.import('core/app').then(function (module) {
        if (!this.app) {
          var App = module.default;
          this.app = new App({
            extensionId: aData.id,
            version: aData.version
          });
        }

        this.app.start();
      }.bind(this)).catch(function (e) {
        dump('CLIQZ startup error: ' + e.name + ' -- ' + e.message + ' -- ' + e.stack + '\n')
      });
    },

    stop: function (aData, aReason) {
      var TELEMETRY_SIGNAL = {};
      TELEMETRY_SIGNAL[APP_STARTUP] = 'browser_startup';
      TELEMETRY_SIGNAL[APP_SHUTDOWN] = 'browser_shutdown';
      TELEMETRY_SIGNAL[ADDON_ENABLE] = 'addon_enable';
      TELEMETRY_SIGNAL[ADDON_DISABLE] = 'addon_disable';
      TELEMETRY_SIGNAL[ADDON_INSTALL] = 'addon_install';
      TELEMETRY_SIGNAL[ADDON_UNINSTALL] = 'addon_uninstall';
      TELEMETRY_SIGNAL[ADDON_UPGRADE] = 'addon_upgrade';
      TELEMETRY_SIGNAL[ADDON_DOWNGRADE] = 'addon_downgrade';

      this.app.stop(
        aReason === APP_SHUTDOWN,
        aReason === ADDON_DISABLE || aReason === ADDON_UNINSTALL,
        TELEMETRY_SIGNAL[aReason] || aReason
      );

      global.clearRunloop();
    },
    _perf: function(key, time) {
      var data = exports.CLIQZ._perfData[key] = (exports.CLIQZ._perfData[key] || {
        total: 0,
        max: 0,
        n: 0,
      });
      data.total += time;
      data.max = Math.max(data.max, time);
      data.n += 1;
    },
    _perfData: {},
  };
})(this);
