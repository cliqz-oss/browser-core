'use strict';
const { utils: Cu } = Components;

var TELEMETRY_SIGNAL = {};
TELEMETRY_SIGNAL[APP_SHUTDOWN] = 'browser_shutdown';
TELEMETRY_SIGNAL[ADDON_DISABLE] = 'addon_disable';
TELEMETRY_SIGNAL[ADDON_UNINSTALL] = 'addon_uninstall';

function startup(aData, aReason) {
    // try to cleanup an eventual broken shutdown
    Cu.unload('chrome://cliqzmodules/content/Extension.jsm');

    Cu.import('chrome://cliqzmodules/content/Extension.jsm');
    Extension.init(aReason == ADDON_UPGRADE, aData.oldVersion, aData.version);
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
}

function install(aData, aReason) {
}

function uninstall(aData, aReason) {
}
