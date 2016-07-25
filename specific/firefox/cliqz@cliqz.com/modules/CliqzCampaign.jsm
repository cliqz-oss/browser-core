'use strict';

var EXPORTED_SYMBOLS = ['CliqzCampaign'];

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzEvents',
  'chrome://cliqzmodules/content/CliqzEvents.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

function CliqzCampaign(id, data) {
  this.PREF_PREFIX = 'msgs.';

  this.id = id;
  this.reset();
  this.update(data);
}

CliqzCampaign.prototype = {
  reset: function () {
    this.state = 'idle';
    this.isEnabled = true;
    this.counts = {
      trigger: 0,
      show: 0,
      confirm: 0,
      postpone: 0,
      ignore: 0,
      discard: 0
    };
  },

  update: function (data) {
    for (var key in data) {
      if (data.hasOwnProperty(key) && !key.startsWith('DEBUG')) {
        this[key] = data[key];
      }
    }
  },

  setState: function (newState) {
    this.log(this.id + ': ' + this.state + ' -> ' + newState);
    this.state = newState;
  },

  save: function () {
    CliqzUtils.setPref(
      this.PREF_PREFIX + 'campaigns.data.' + this.id, JSON.stringify(this));
    this.log('saved campaign ' + this.id);
  },

  load: function () {
    this.update(JSON.parse(
      CliqzUtils.getPref(this.PREF_PREFIX + 'campaigns.data.' + this.id, '{}')));
    this.log('loaded campaign ' + this.id);
  },

  delete: function () {
    CliqzUtils.clearPref(this.PREF_PREFIX + this.id);
  },

  log: function (msg) {
    CliqzUtils.log(msg, 'CliqzCampaign');
  }
};
