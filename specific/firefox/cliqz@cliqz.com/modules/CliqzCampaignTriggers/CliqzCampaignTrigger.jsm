'use strict';

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

var EXPORTED_SYMBOLS = ['CliqzCampaignTrigger'];

function CliqzCampaignTrigger(id) {
  this.id = id;
  this._listeners = [];
}

CliqzCampaignTrigger.prototype = {
  addListener: function(callback) {
    this._listeners.push(callback);
  },
  notifyListeners: function () {
    this._listeners.forEach(function (listener) {
      CliqzUtils.setTimeout(function () {
        listener(this.id);
      }.bind(this), 0);
    }.bind(this));
  }
};
