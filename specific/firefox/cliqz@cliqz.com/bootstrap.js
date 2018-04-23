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

function listenForCliqz() {
  Components.utils.import('resource://gre/modules/AddonManager.jsm');
  let listener = {
    onDownloadEnded(data) {
      if (data.addon.id === 'cliqz@cliqz.com') {
        AddonManager.removeInstallListener(listener);
        AddonManager
          .getAddonByID('testpilot@cliqz.com')
          .then(function(addon) {
            addon.uninstall();
          });
        }
    }
  };

  AddonManager.addInstallListener(listener);
}

function startup(aData, aReason) {
  Components.utils.import('resource://gre/modules/Services.jsm');
  Components.utils.importGlobalProperties(['TextEncoder', 'TextDecoder', 'btoa', 'atob', 'XMLHttpRequest', 'indexedDB', 'crypto']);

  Components.utils.import('chrome://cliqzmodules/content/CLIQZ.jsm');
  Services.scriptloader.loadSubScript('chrome://cliqz/content/runloop.js', global);
  Services.scriptloader.loadSubScript('chrome://cliqz/content/core/app.bundle.js', { global: global });

  global.app = new global.App({
    version: aData.version
  });
  global.app.start();
  CLIQZ.app = global.app;
  CLIQZ.config = global.config;
  CLIQZ.CliqzUtils = global.CliqzUtils;

  listenForCliqz();
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
