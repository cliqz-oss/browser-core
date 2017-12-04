'use strict';

const global = this;
const TELEMETRY_SIGNAL = {
  APP_STARTUP: 'browser_startup',
  APP_SHUTDOWN: 'browser_shutdown',
  ADDON_ENABLE: 'addon_enable',
  ADDON_DISABLE: 'addon_disable',
  ADDON_INSTALL: 'addon_install',
  ADDON_UNINSTALL: 'addon_uninstall',
  ADDON_UPGRADE: 'addon_upgrade',
  ADDON_DOWNGRADE: 'addon_downgrade',
};

function startup(aData, aReason) {
  Components.utils.import('resource://gre/modules/Services.jsm');
  Components.utils.importGlobalProperties(['TextEncoder', 'TextDecoder', 'btoa', 'atob', 'XMLHttpRequest', 'indexedDB', 'crypto']);

  Components.utils.import('chrome://cliqzmodules/content/CLIQZ.jsm');
  Services.scriptloader.loadSubScript('chrome://cliqz/content/runloop.js', global);
  Services.scriptloader.loadSubScript('chrome://cliqz/content/core/app.bundle.js', { global: global });

  global.app = new global.App({
    version: aData.version,
    extensionId: aData.id,
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

  global.clearRunloop();
}

function install(aData, aReason) {
}

function uninstall(aData, aReason) {
}
