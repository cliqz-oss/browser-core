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

if (typeof ChromeUtils === 'undefined') {
  this.ChromeUtils = Components.utils;
}

const RESOURCE_HOST = 'cliqz';

ChromeUtils.import('resource://gre/modules/Services.jsm');
ChromeUtils.import('resource://gre/modules/XPCOMUtils.jsm');
Components.utils.importGlobalProperties([
  'TextEncoder',
  'TextDecoder',
  'btoa',
  'atob',
  'XMLHttpRequest',
  'indexedDB',
  'crypto',
]);
XPCOMUtils.defineLazyServiceGetter(
  this,
  'resProto',
  '@mozilla.org/network/protocol;1?name=resource',
  'nsISubstitutingProtocolHandler',
);

function startup(aData, aReason) {
  if (resProto.setSubstitutionWithFlags) {
    resProto.setSubstitutionWithFlags(
      RESOURCE_HOST,
      Services.io.newURI('chrome/content/', null, aData.resourceURI),
      resProto.ALLOW_CONTENT_ACCESS,
    );
  }

  ChromeUtils.import('chrome://cliqzmodules/content/CLIQZ.jsm');
  Services.scriptloader.loadSubScriptWithOptions('chrome://cliqz/content/runloop.js', { target: global, ignoreCache: true });
  Services.scriptloader.loadSubScriptWithOptions('chrome://cliqz/content/core/app.bundle.js', { target: { global: global }, ignoreCache: true });

  global.app = new global.App({
    version: aData.version,
    meta: aData,
  });
  global.app.start();
  CLIQZ.app = global.app;
  CLIQZ.config = global.config;
  CLIQZ.CliqzUtils = global.CliqzUtils;
}

function shutdown(aData, aReason) {
  resProto.setSubstitution(RESOURCE_HOST, null);

  if (global.app) {
    global.app.stop(
      aReason === APP_SHUTDOWN,
      aReason === ADDON_DISABLE || aReason === ADDON_UNINSTALL,
      TELEMETRY_SIGNAL[aReason] || aReason,
      {
        meta: aData,
      },
    );
  }

  Components.utils.unload('chrome://cliqzmodules/content/CLIQZ.jsm');
  global.stopTimers();
}

function install(aData, aReason) {
}

function uninstall(aData, aReason) {
}
