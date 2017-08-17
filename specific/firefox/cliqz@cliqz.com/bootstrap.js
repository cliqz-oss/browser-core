'use strict';

var CLIQZ;

function startup(aData, aReason) {
  var global = {};
  Components.utils.import('resource://gre/modules/Services.jsm');
  Services.scriptloader.loadSubScript('chrome://cliqz/content/CLIQZ.js', global);
  CLIQZ = global.CLIQZ;
  CLIQZ.start(aData, aReason);
}

function shutdown(aData, aReason) {
  CLIQZ.stop(aData, aReason);
}

function install(aData, aReason) {
}

function uninstall(aData, aReason) {
}
