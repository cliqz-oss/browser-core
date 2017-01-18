import FreshTab from 'freshtab/main';
import prefs from '../core/prefs';
/**
* @namespace freshtab
*/
export default class {
  /**
  * @class Window
  * @constructor
  */
  constructor(config) {
    this.onInstall = prefs.get('new_session');
    this.buttonEnabled = config.settings.freshTabButton;
    this.window = config.window;
    this.cliqzOnboarding = config.settings.cliqzOnboarding;
    this.showNewBrandAlert = config.settings.showNewBrandAlert;
  }
  /**
  *@method init
  *@return null
  */
  init() {
    const cliqzNewTab = FreshTab.cliqzNewTab;
    if (this.window.gInitialPages && this.window.gInitialPages.indexOf(cliqzNewTab)===-1) {
      this.window.gInitialPages.push(cliqzNewTab);
    }
  }

  unload() {}

  status() {
    return {
      visible: true,
      enabled: FreshTab.isActive()
    }
  }
};
