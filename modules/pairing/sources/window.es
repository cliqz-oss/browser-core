import { utils } from 'core/cliqz';
import inject from '../core/kord/inject';
import { addStylesheet, removeStylesheet } from '../core/helpers/stylesheet';

const STYLESHEET_URL = 'chrome://cliqz/content/pairing/css/burger_menu.css';
const DISMISSED_ALERTS = 'dismissedAlerts';
/**
* @namespace pairing
* @class Window
*/
export default class {
  /**
  * @constructor
  */

  constructor(settings) {
    this.window = settings.window;
  }
  /**
  * @method init
  */
  init() {
    this.showOnboarding();
    addStylesheet(this.window.document, STYLESHEET_URL);
  }

  unload() {
    removeStylesheet(this.window.document, STYLESHEET_URL);
  }

  showOnboarding() {
    const locale = utils.getPref('general.useragent.locale', 'en', '');
    const isInABTest = utils.getPref('extOnboardCliqzConnect', false);
    const dismissed = JSON.parse(utils.getPref(DISMISSED_ALERTS, '{}'));
    const messageType = 'cliqz-connect';
    const isDismissed = (dismissed[messageType] && dismissed[messageType].count >= 1) || false;
    const messageCenter = inject.module('message-center');

    if (isInABTest && (locale !== 'fr') && !isDismissed) {
      messageCenter.action(
        'showMessage',
        'MESSAGE_HANDLER_FRESHTAB',
        {
          id: 'cliqz-connect',
          template: 'cliqz-connect',
        },
      );
    }
  }
}
