'use strict';

var CLIQZ;

function startup(aData, aReason) {
  var global = {};
  Components.utils.import('resource://gre/modules/Services.jsm');
  Services.scriptloader.loadSubScript('chrome://cliqz/content/CLIQZ.js', global);
  CLIQZ = global.CLIQZ;
  CLIQZ.start(aData, aReason);

  Components.utils.import('chrome://cliqzmodules/content/FirefoxTelemetry.jsm');
  FirefoxTelemetry.init(aData.id);
  if (aReason == APP_STARTUP) {
    // On browser startup the telemetry controller may not be initialized at
    // this point, so delay the initial ping to give it a chance to initialize.
    Components.utils.import('resource://gre/modules/Timer.jsm');
    setTimeout(() => FirefoxTelemetry.reportTelemetryValue('cliqzEnabled'), 5000);
  } else if (aReason === ADDON_ENABLE) {
    FirefoxTelemetry.reportTelemetryValue('cliqzEnabled');
  } else if (aReason === ADDON_INSTALL) {
    FirefoxTelemetry.reportTelemetryValue('cliqzInstalled');
  }
}

function shutdown(aData, aReason) {
  CLIQZ.stop(aData, aReason);

  Components.utils.import('chrome://cliqzmodules/content/FirefoxTelemetry.jsm');
  if (aReason === ADDON_UNINSTALL) {
    FirefoxTelemetry.reportTelemetryValue('cliqzUninstalled');
  } else if (aReason === ADDON_DISABLE) {
    FirefoxTelemetry.reportTelemetryValue('cliqzDisabled');
  }
  FirefoxTelemetry.destroy();
  Components.utils.unload('chrome://cliqzmodules/content/FirefoxTelemetry.jsm');
}

function install(aData, aReason) {
}

function uninstall(aData, aReason) {
}
