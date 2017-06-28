import prefs from '../core/prefs';

const PREF = 'share_location';
const STATE_ALLOW_ONCE = 'showOnce';
const STATE_ALLOW = 'yes';
const STATE_BLOCK = 'no';
const STATE_DEFAULT = 'ask';

const getPref = prefs.get.bind(prefs, PREF, STATE_DEFAULT);
const setPref = prefs.set.bind(prefs, PREF);


export default class {
  constructor({ updateGeoLocation, resetGeoLocation }) {
    this.actions = [
      {
        title: 'show-location-and-contact',
        actionName: 'allowOnce',
      },
      {
        title: 'always-show-location',
        actionName: 'allow',
      },
    ];

    this.updateGeoLocation = updateGeoLocation;
    this.resetGeoLocation = resetGeoLocation;
  }

  get isAskingForLocation() {
    return getPref() === STATE_DEFAULT;
  }

  block() {
    setPref(STATE_BLOCK);
    return Promise.resolve();
  }

  allow() {
    setPref(STATE_ALLOW);
    return this.updateGeoLocation();
  }

  allowOnce() {
    setPref(STATE_ALLOW_ONCE);
    return this.updateGeoLocation();
  }

  clear() {
    setPref(STATE_DEFAULT);
    this.resetGeoLocation();
    return Promise.resolve();
  }

  resetAllowOnce() {
    if (getPref() !== STATE_ALLOW_ONCE) {
      return;
    }
    this.clear();
  }

  hasAction(actionName) {
    return this.actions.map(a => a.actionName).indexOf(actionName) !== -1;
  }
}
