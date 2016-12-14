'use strict';
const { utils: Cu } = Components;

var TELEMETRY_SIGNAL = {};
TELEMETRY_SIGNAL[APP_SHUTDOWN] = 'browser_shutdown';
TELEMETRY_SIGNAL[ADDON_DISABLE] = 'addon_disable';
TELEMETRY_SIGNAL[ADDON_UNINSTALL] = 'addon_uninstall';

function startup(aData, aReason) {
    // In case of an unclean restart, ensure we load the latest version of the
    // modules.
    Cu.unload('chrome://cliqzmodules/content/Extension.jsm');
    Cu.unload('chrome://cliqzmodules/content/FirefoxTelemetry.jsm');

    Cu.import('chrome://cliqzmodules/content/Extension.jsm');
    Extension.init(aReason == ADDON_UPGRADE, aData.oldVersion, aData.version);

    Cu.import('chrome://cliqzmodules/content/FirefoxTelemetry.jsm');
    FirefoxTelemetry.init(aData.id);
    if (aReason == APP_STARTUP) {
      // On browser startup the telemetry controller may not be initialized at
      // this point, so delay the initial ping to give it a chance to initialize.
      Cu.import('resource://gre/modules/Timer.jsm');
      setTimeout(() => FirefoxTelemetry.reportTelemetryValue('cliqzEnabled'), 5000);
    } else if (aReason === ADDON_ENABLE) {
      FirefoxTelemetry.reportTelemetryValue('cliqzEnabled');
    } else if (aReason === ADDON_INSTALL) {
      FirefoxTelemetry.reportTelemetryValue('cliqzInstalled');
    }
}

function shutdown(aData, aReason) {
    Cu.import('chrome://cliqzmodules/content/Extension.jsm');

    Extension.telemetry({
        type: 'activity',
        action: TELEMETRY_SIGNAL[aReason]
    }, true /* force push */);

    /**
     *
     *  There are different reasons on which extension does shutdown:
     *  https://developer.mozilla.org/en-US/Add-ons/Bootstrapped_extensions#Reason_constants
     *
     *  We handle them differently:
     *  * APP_SHUTDOWN - nothing need to be unloaded as browser shutdown, but
     *      there may be data that we may like to persist
     *  * ADDON_DISABLE, ADDON_UNINSTALL - full cleanup + bye bye messages
     *  * ADDON_UPGRADE, ADDON_DOWNGRADE - fast cleanup
     *
     */

    if ( aReason === APP_SHUTDOWN ) {
      Extension.shutdown();
      return;
    }

    if ( aReason === ADDON_DISABLE || aReason === ADDON_UNINSTALL ) {
      Extension.disable(aData.version);
    }

    Extension.unload();

    Cu.unload('chrome://cliqzmodules/content/Extension.jsm');

    Cu.import('chrome://cliqzmodules/content/FirefoxTelemetry.jsm');
    if (aReason === ADDON_UNINSTALL) {
      FirefoxTelemetry.reportTelemetryValue('cliqzUninstalled');
    } else if (aReason === ADDON_DISABLE) {
      FirefoxTelemetry.reportTelemetryValue('cliqzDisabled');
    }
    FirefoxTelemetry.destroy();
    Cu.unload('chrome://cliqzmodules/content/FirefoxTelemetry.jsm');
}

function install(aData, aReason) {
}

function uninstall(aData, aReason) {
}
