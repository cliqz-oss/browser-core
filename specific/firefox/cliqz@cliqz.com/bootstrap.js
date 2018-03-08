'use strict';

const global = this;
const TELEMETRY_SIGNAL = {};
TELEMETRY_SIGNAL[APP_STARTUP] = 'browser_startup';
TELEMETRY_SIGNAL[APP_SHUTDOWN] = 'browser_shutdown';
TELEMETRY_SIGNAL[ADDON_ENABLE] = 'addon_enable';
TELEMETRY_SIGNAL[ADDON_DISABLE] = 'addon_disable';
TELEMETRY_SIGNAL[ADDON_INSTALL] = 'addon_install';
TELEMETRY_SIGNAL[ADDON_UNINSTALL] = 'addon_uninstall';
TELEMETRY_SIGNAL[ADDON_UPGRADE] = 'addon_upgrade';
TELEMETRY_SIGNAL[ADDON_DOWNGRADE] = 'addon_downgrade';


function startup(aData, aReason) {
  Components.utils.import('resource://gre/modules/Services.jsm');
  Components.utils.importGlobalProperties(['TextEncoder', 'TextDecoder', 'btoa', 'atob', 'XMLHttpRequest', 'indexedDB', 'crypto']);

  Components.utils.import('chrome://cliqzmodules/content/CLIQZ.jsm');
  Services.scriptloader.loadSubScriptWithOptions('chrome://cliqz/content/runloop.js', { target: global, ignoreCache: true });
  Services.scriptloader.loadSubScriptWithOptions('chrome://cliqz/content/core/app.bundle.js', { target: { global: global }, ignoreCache: true });

  global.app = new global.App({
    version: aData.version
  });
  global.app.start();
  CLIQZ.app = global.app;
  CLIQZ.config = global.config;
  CLIQZ.CliqzUtils = global.CliqzUtils;
}

function shutdown(aData, aReason) {
  if (global.app) {
   global.app.stop(
      aReason === APP_SHUTDOWN,
      aReason === ADDON_DISABLE || aReason === ADDON_UNINSTALL,
      TELEMETRY_SIGNAL[aReason] || aReason
    );
  }

  Components.utils.unload('chrome://cliqzmodules/content/CLIQZ.jsm');
  global.stopTimers();
}

function install(aData, aReason) {
}

function uninstall(aData, aReason) {
}
