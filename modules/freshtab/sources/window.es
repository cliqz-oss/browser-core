import FreshTab from 'freshtab/main';

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

    return win.CLIQZ.Core.createCheckBoxItem(
      win.document,
      'freshTabState',
      CliqzUtils.getLocalizedString('btnFreshTab'),
      true,
      FreshTab.toggleState
    );
  }
};
