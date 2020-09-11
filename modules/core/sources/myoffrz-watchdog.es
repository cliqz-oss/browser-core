import config from './config';
import prefs from './prefs';
import { subscribe } from './events';

//
// There are two ways to disable or enable MyOffrz:
//
// - use the preference `offers2UserEnabled` (used by Control Center)
// - explicitly disable or enable the module `offers-v2` (used by Ghostery)
//
// This watchdog makes sure that:
//
// - the both ways give the same result
// - `offers2UserEnabled` is true if and only if the modules are enabled
// - `offers2UserEnabled` is false if and only if the modules are disabled
// - all MyOffrz modules are enabled or disabled, not just `offers-v2`
//

const OFFERS_MAIN_V2_MODULE = 'offers-v2';
const OFFERS_SUBMODULES = [
  // 'browser-panel', // should be always disabled
  'myoffrz-helper',
  'offers-banner',
  // 'offers-templates', // should be always disabled
];

const PREF_NAME_OFFERS_ENABLED = 'offers2UserEnabled';

function getPrefNameModuleEnabled(moduleName) {
  return `modules.${moduleName}.enabled`;
}

function isModuleEnabledInConfig(moduleName) {
  if (!(config.modules && config.modules.includes(moduleName))) {
    return false;
  }
  const isEnabled = config.default_prefs
    && config.default_prefs[getPrefNameModuleEnabled(moduleName)];
  return isEnabled !== false;
}

export default class MyOffrzWatchdog {
  constructor(core) {
    this.enableModule = core.actions.enableModule.bind(core.actions.enableModule);
    this.disableModule = core.actions.disableModule.bind(core.actions.disableModule);
  }

  init() {
    this.prefchangeListener = subscribe(
      'prefchange',
      this._onPrefChange.bind(this)
    );
  }

  unload() {
    if (this.prefchangeListener) {
      this.prefchangeListener.unsubscribe();
      this.prefchangeListener = null;
    }
  }

  async _onPrefChange(pref) {
    //
    // Toggle offers by a change in the preferences:
    // - enable/disable the main module
    //
    if (pref === PREF_NAME_OFFERS_ENABLED) {
      await (prefs.get(PREF_NAME_OFFERS_ENABLED)
        ? this.enableModule(OFFERS_MAIN_V2_MODULE)
        : this.disableModule(OFFERS_MAIN_V2_MODULE));
      return;
    }
    //
    // Toggle offers by an enable/disable of the main module:
    // - enable/disable the rest of the modules
    // - update the preferences
    //
    const prefOffersEnabled = getPrefNameModuleEnabled(OFFERS_MAIN_V2_MODULE);
    if (pref === prefOffersEnabled) {
      const isEnabled = prefs.get(prefOffersEnabled);
      prefs.set(PREF_NAME_OFFERS_ENABLED, isEnabled);
      await (isEnabled ? this._enableOffersSubmodules() : this._disableOffersSubmodules());
    }
  }

  async _disableOffersSubmodules() {
    const actions = OFFERS_SUBMODULES.map(mod => this.disableModule(mod));
    return Promise.all(actions);
  }

  async _enableOffersSubmodules() {
    const actions = OFFERS_SUBMODULES
      .filter(mod => isModuleEnabledInConfig(mod))
      .map(mod => this.enableModule(mod));
    return Promise.all(actions);
  }
}
