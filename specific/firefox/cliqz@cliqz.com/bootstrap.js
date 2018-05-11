'use strict';

Components.utils.import('resource://gre/modules/AddonManager.jsm');

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

let listener = {
  onDownloadEnded(data) {
    if (data.addon.id === 'cliqz@cliqz.com') {
      // when Cliqz AMO is downloaded we turn off the Chip experiment
      _shutdown(null, ADDON_DISABLE);
    }
  },
  onInstallStarted(data) {
    if (data.addon.id === 'cliqz@cliqz.com') {
      // when cliqz AMO is installed we completely uninstall the Chip experiment
      AddonManager
        .getAddonByID('funnelcake@cliqz.com')
        .then(function(addon) {
          addon.uninstall();
        });
    }
  },
  onInstallCancelled(data) {
    if (data.addon.id === 'cliqz@cliqz.com') {
      // if the user cancels the install of Cliqz AMO we restart the Chip experiment
      AddonManager
        .getAddonByID('funnelcake@cliqz.com')
        .then(function(addon) {
          startup({ version: addon.version })
        });
    }
  },
  onInstallFailed(data) {
    if (data.addon.id === 'cliqz@cliqz.com') {
      // if there is an issue while installing Cliqz AMO we restart the Chip experiment
      AddonManager
        .getAddonByID('funnelcake@cliqz.com')
        .then(function(addon) {
          startup({ version: addon.version })
        });
    }
  }
};



function _startup(aData, aReason) {
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

  AddonManager.addInstallListener(listener);
}

function startup(aData, aReason) {
  AddonManager
    .getAddonByID('cliqz@cliqz.com')
    .then(function(addon) {
      if (addon === null) {
        // no Cliqz AMO present so we can start
        _startup(aData, aReason);
      } else {
        // Cliqz AMO is present so we should uninstall the Chip experiment
        AddonManager
          .getAddonByID('funnelcake@cliqz.com')
          .then(function(addon) {
            addon.uninstall();
          });
      }
    });
}

function _shutdown(aData, aReason) {
  if (global.app) {
    global.app.stop(
      aReason === APP_SHUTDOWN,
      aReason === ADDON_DISABLE || aReason === ADDON_UNINSTALL,
      TELEMETRY_SIGNAL[aReason] || aReason
    );

    delete global.app;
  }

  global.clearRunloop();
}

function shutdown(aData, aReason) {
  _shutdown(aData, aReason);

  AddonManager.removeInstallListener(listener);
}

function install(aData, aReason) {
}

function uninstall(aData, aReason) {
}
