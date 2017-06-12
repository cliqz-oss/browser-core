'use strict';

var CLIQZ,
    telemetryReported = false;

function startup(aData, aReason) {
  var global = {};
  Components.utils.import('resource://gre/modules/Services.jsm');
  Services.scriptloader.loadSubScript('chrome://cliqz/content/CLIQZ.js', global);
  CLIQZ = global.CLIQZ;
  CLIQZ.start(aData, aReason);

  // Give some time to the telemetry controller to initialize at startup
  Components.utils.import('resource://gre/modules/Timer.jsm');
  setTimeout(reportTelemetry, 60000);

  // force sending a telemetry signal in case the shutdown
  // happens before the 60 seconds timeout
  Services.obs.addObserver(reportTelemetry, "profile-before-change", false);
}

function reportTelemetry(){
  if(telemetryReported) return;

  Components.utils.import('resource://gre/modules/TelemetryEnvironment.jsm');
  Components.utils.import('resource://gre/modules/TelemetryController.jsm');
  Components.utils.import('resource://gre/modules/Preferences.jsm');

  const ping = TelemetryController.getCurrentPingData();

  if (TelemetryEnvironment.setExperimentActive) { // FF53+
    TelemetryEnvironment.setExperimentActive('cliqz-repack',
      Services.appinfo.distributionID);
  }

  TelemetryController.submitExternalPing('cliqz-repack',
    {
      cliqzSession: Preferences.get('extensions.cliqz.session', null),
      sessionId: ping.payload.info.sessionId,
      subsessionId: ping.payload.info.subsessionId,
      distributionId: Services.appinfo.distributionID
    },
    {
      addClientId: true,
      addEnvironment: true,
    }
  );

  telemetryReported = true;
}

function shutdown(aData, aReason) {
  CLIQZ.stop(aData, aReason);
}

function install(aData, aReason) {
}

function uninstall(aData, aReason) {
}
