import { utils } from 'core/cliqz';
import inject from '../core/kord/inject';
import { addStylesheet, removeStylesheet } from '../core/helpers/stylesheet';

const { utils: Cu } = Components;
const CustomizableUI = Cu.import('resource:///modules/CustomizableUI.jsm', null).CustomizableUI;
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
    if (this.status().visible) {
      CustomizableUI.createWidget({
        id: 'mobilepairing_btn',
        defaultArea: CustomizableUI.AREA_PANEL,
        label: 'Connect',
        tooltiptext: 'Connect',
        onCommand: () => {
          const gBrowser = utils.getWindow().gBrowser;
          gBrowser.selectedTab = gBrowser.addTab('about:preferences#connect');
          utils.telemetry({
            type: 'burger_menu',
            version: 1,
            action: 'click',
            target: 'connect',
          });
        },
      });

      this.showOnboarding();

      addStylesheet(this.window.document, STYLESHEET_URL);
    }
  }

  unload() {
    if (this.status().visible) {
      CustomizableUI.destroyWidget('mobilepairing_btn');
      removeStylesheet(this.window.document, STYLESHEET_URL);
    }
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

  status() {
    return {
      visible: utils.getPref('connect', false),
    };
  }
}
