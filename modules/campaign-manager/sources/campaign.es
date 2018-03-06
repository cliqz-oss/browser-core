/* eslint no-restricted-syntax: 'off' */

import CliqzUtils from '../core/utils';

function CliqzCampaign(id, data) {
  this.PREF_PREFIX = 'msgs.';

  this.id = id;
  this.reset();
  this.update(data);
}

CliqzCampaign.prototype = {
  reset() {
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

  update(data) {
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key) && !key.startsWith('DEBUG')) {
        this[key] = data[key];
      }
    }
  },

  setState(newState) {
    this.log(`${this.id}: ${this.state} -> ${newState}`);
    this.state = newState;
  },

  save() {
    CliqzUtils.setPref(
      `${this.PREF_PREFIX}campaigns.data.${this.id}`, JSON.stringify(this));
    this.log(`saved campaign ${this.id}`);
  },

  load() {
    this.update(JSON.parse(
      CliqzUtils.getPref(`${this.PREF_PREFIX}campaigns.data.${this.id}`, '{}')));
    this.log(`loaded campaign ${this.id}`);
  },

  delete() {
    CliqzUtils.clearPref(this.PREF_PREFIX + this.id);
  },

  log(msg) {
    CliqzUtils.log(msg, 'CliqzCampaign');
  }
};

export default CliqzCampaign;
