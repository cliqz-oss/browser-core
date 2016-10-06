import FreshTab from 'freshtab/main';
import { checkBox } from 'q-button/buttons';
/**
* @namespace freshtab
*/
export default class {
  /**
  * @class Window
  * @constructor
  */
  constructor(config) {
    this.onInstall = config.onInstall;
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

  createButtonItem(win) {
    if (!this.buttonEnabled || !FreshTab.initialized) return;

    return checkBox(
      win.document,
      'freshTabState',
      CliqzUtils.getLocalizedString('btnFreshTab'),
      true,
      FreshTab.toggleState
    );
  }

  status() {
    return {
      visible: true,
      enabled: FreshTab.isActive()
    }
  }
};
