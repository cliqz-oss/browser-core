import FreshTab from './main';
import prefs from '../core/prefs';
import { utils, events } from '../core/cliqz';

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
const DISMISSED_ALERTS = 'dismissedAlerts';


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
    utils.setTimeout(() => {
      this.showOnboarding();
    }, 2000);
  }

  unload() {}

  status() {
    return {
      visible: true,
      enabled: FreshTab.isActive(),
    };
  }

  showOnboarding() {
    const locale = utils.getPref('general.useragent.locale', 'en', '');
    const isInABTest = utils.getPref('extOnboardCliqzGhostery', false);
    const dismissed = JSON.parse(utils.getPref(DISMISSED_ALERTS, '{}'));
    const messageType = 'cliqz-ghostery';
    const isDismissed = (dismissed[messageType] && dismissed[messageType].count >= 1) || false;

    if (isInABTest && (locale !== 'fr') && !isDismissed) {
      events.pub(
        'msg_center:show_message',
        {
          id: 'cliqz-ghostery',
          template: 'cliqz-ghostery',
        },
        'MESSAGE_HANDLER_FRESHTAB',
      );
    }
  }
}
