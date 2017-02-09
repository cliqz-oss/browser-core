import FreshTab from './main';
import prefs from '../core/prefs';
import utils from '../core/utils';

function clearUrlbar(window) {
  const currentUrl = window.gBrowser.selectedBrowser.currentURI.spec;
  const initialPages = window.gInitialPages;
  const cliqzInitialPages = [
    utils.CLIQZ_NEW_TAB_RESOURCE_URL,
    utils.CLIQZ_NEW_TAB,
  ];

  cliqzInitialPages.forEach((initialPage) => {
    const isInitialPage = initialPages.indexOf(initialPage) >= 0;
    const isCurrentUrl = cliqzInitialPages.indexOf(currentUrl) >= 0;

    if (!isInitialPage) {
      initialPages.push(initialPage);
    }

    if (isCurrentUrl) {
      utils.callAction('core', 'setUrlbar', ['']);
    }
  });
}

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
    this.showNewBrandAlert = config.settings.showNewBrandAlert;
  }
  /**
  *@method init
  *@return null
  */
  init() {
    clearUrlbar(this.window);
  }

  unload() {}

  status() {
    return {
      visible: true,
      enabled: FreshTab.isActive(),
    };
  }
}
