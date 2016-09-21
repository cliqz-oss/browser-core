import FreshTab from 'freshtab/main';
import { checkBox } from 'q-button/buttons';
const CLIQZ_NEW_TAB = "about:cliqz";

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
    if (this.window.gInitialPages && this.window.gInitialPages.indexOf(CLIQZ_NEW_TAB)===-1) {
      this.window.gInitialPages.push(CLIQZ_NEW_TAB);
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
};
