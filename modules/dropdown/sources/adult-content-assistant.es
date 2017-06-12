import prefs from '../core/prefs';

const PREF = 'adultContentFilter';
const STATE_ALLOW_ONCE = 'showOnce';
const STATE_ALLOW = 'liberal';
const STATE_BLOCK = 'conservative';
const STATE_DEFAULT = 'moderate';

const getPref = prefs.get.bind(prefs, PREF, STATE_DEFAULT);
const setPref = prefs.set.bind(prefs, PREF);

export default class {
  constructor() {
    this.actions = [
      {
        title: 'show_once',
        actionName: 'allowOnce',
      },
      {
        title: 'always',
        actionName: 'block',
      },
      {
        title: 'never',
        actionName: 'allow',
      },
    ];
  }

  get isBlockingAdult() {
    const filterSetting = getPref();
    return [STATE_BLOCK, STATE_DEFAULT].indexOf(filterSetting) !== -1;
  }

  get isAskingForAdult() {
    return getPref() === STATE_DEFAULT;
  }

  block() {
    setPref(STATE_BLOCK);
    return Promise.resolve();
  }

  allow() {
    setPref(STATE_ALLOW);
    return Promise.resolve();
  }

  allowOnce() {
    setPref(STATE_ALLOW_ONCE);
    return Promise.resolve();
  }

  clear() {
    setPref(STATE_DEFAULT);
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
