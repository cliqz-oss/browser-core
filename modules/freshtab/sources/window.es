import FreshTab from './main';
import prefs from '../core/prefs';
import utils from '../core/utils';
import events from '../core/events';

const cliqzInitialPages = [
  utils.CLIQZ_NEW_TAB_RESOURCE_URL,
  utils.CLIQZ_NEW_TAB,
  `${utils.CLIQZ_NEW_TAB_RESOURCE_URL}#`,
  `${utils.CLIQZ_NEW_TAB_RESOURCE_URL}#/`,
];

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

    const initialPages = this.window.gInitialPages;
    cliqzInitialPages.forEach((initialPage) => {
      const isInitialPage = initialPages.indexOf(initialPage) >= 0;

      if (!isInitialPage) {
        initialPages.push(initialPage);
      }
    });
  }

  /**
  *@method init
  *@return null
  */
  init() {
    this.showOnboarding();
  }

  unload() {}

  status() {
    return {
      visible: true,
      enabled: FreshTab.isActive(),
    };
  }

  showOnboarding() {
    const dismissedAlerts = JSON.parse(utils.getPref('dismissedAlerts', '{}'));
    const messageType = 'windows-xp-vista-end-of-support';
    const isDismissed = dismissedAlerts[messageType] && dismissedAlerts[messageType].count >= 1;

    let unsupportedOS = false;

    if (utils.isWindows() && FreshTab.isBrowser && !isDismissed) {
      try {
        if (parseFloat(utils.environment.OS_VERSION) <= 6.0) {
          unsupportedOS = true;
        }
      } catch (e) {
        utils.log('FreshTab: unable to decode OS version');
      }

      if (unsupportedOS) {
        events.pub(
          'msg_center:show_message',
          {
            id: messageType,
            template: messageType,
          },
          'MESSAGE_HANDLER_FRESHTAB'
        );
      }
    }
  }
}
