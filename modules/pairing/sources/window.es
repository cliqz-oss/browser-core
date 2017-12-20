import { utils } from '../core/cliqz';
import inject from '../core/kord/inject';
import { addStylesheet, removeStylesheet } from '../core/helpers/stylesheet';
import background from './background';

const STYLESHEET_URL = 'chrome://cliqz/content/pairing/css/burger_menu.css';
const DISMISSED_ALERTS = 'dismissedAlerts';

/**
* @namespace pairing
* @class Window
*/
export default class Win {
  /**
  * @constructor
  */

  constructor(settings) {
    this.window = settings.window;
    this.config = settings;
    this.contextMenu = inject.module('context-menu');
  }
  /**
  * @method init
  */
  init() {
    this.peerComm = background.peerSlave;
    this.showOnboarding();
    addStylesheet(this.window.document, STYLESHEET_URL);
    return Promise.all([
      this.initPageMenu(), // Right-click on page content
      this.initTabMenu(), // Right-click on tab title
    ]);
  }

  initPageMenu() {
    const config = this.config;
    const window = this.window;
    const contextMenu = window.document.getElementById('contentAreaContextMenu');
    this.builtInSearchItem = window.document.getElementById('context-searchselect');

    // TODO: this should probably be refactored somehow
    return this.contextMenu.windowAction(window, 'makeContextMenu', config, contextMenu, this.builtInSearchItem)
      .then((pageMenu) => {
        this.pageMenu = pageMenu;
        this.pageMenu._onPopupShowing = (ev) => {
          if (ev.target !== contextMenu) {
            return;
          }
          utils.telemetry({
            type: 'context_menu',
            action: 'open',
            context: 'webpage',
          });

          if (this.window.gContextMenu === undefined) {
            // we need to find a solution for e10s
            return;
          }

          const tabPos = this.window.gBrowser.tabContainer.selectedIndex;
          const tabData = background.getTabData(this.window, tabPos);

          const isLink = this.window.gContextMenu.onLink;
          let url = ''; // Display "Send to mobile" option based on this url
          if (isLink) {
            delete tabData.title;
            url = this.window.gContextMenu.getLinkURL();
            tabData.url = url;
          } else { // No text selected
            url = this.window.gBrowser.currentURI.spec;
          }

          if (!background.isValidURL(url)) return; // Do not show the "Send to mobile" option
          // Pairing menu
          const beforeElem = this.window.document.getElementById('context-bookmarklink');
          const isEnabled = this.peerComm.isPaired;

          const onclick = isEnabled ? () => {
            background.sendTab(tabData);
            utils.telemetry({
              type: 'context_menu',
              version: 1,
              view: 'web_page',
              action: 'click',
              target: 'send_to_mobile',
            });
          } : undefined;
          this.pageMenu.addMenuItem({
            label: utils.getLocalizedString('pairing-send-tab-to-mobile'),
            onclick,
            beforeElem,
            disabled: !isEnabled,
          });
          this.pageMenu.addSeparator({ beforeElem });
        };
        this.pageMenu.init();
      });
  }

  initTabMenu() {
    const config = this.config;
    const window = this.window;
    const contextMenu = window.document.getElementById('tabContextMenu');
    return this.contextMenu.windowAction(window, 'makeContextMenu', config, contextMenu)
      .then((_contextMenu) => {
        this.tabMenu = _contextMenu;
        this.tabMenu._onPopupShowing = (ev) => {
          if (ev.target !== contextMenu) {
            return;
          }
          const tabPos = this.window.TabContextMenu.contextTab._tPos;
          const tabData = background.getTabData(this.window, tabPos);
          const beforeElem = this.window.document.getElementById('context_openTabInWindow');
          const isEnabled = this.peerComm.isPaired &&
            background.isValidURL(tabData.url);
          const onclick = isEnabled ? () => {
            background.sendTab(tabData);
            utils.telemetry({
              type: 'context_menu',
              version: 1,
              view: 'tab_title',
              action: 'click',
              target: 'send_to_mobile',
            });
          } : undefined;
          this.tabMenu.addMenuItem({
            label: utils.getLocalizedString('pairing-send-tab-to-mobile'),
            onclick,
            beforeElem,
            disabled: !isEnabled,
          });
        };
        this.tabMenu.init();
      });
  }

  unloadPageMenu() {
    if (this.pageMenu) {
      this.pageMenu.unload();
    }
  }

  unloadTabMenu() {
    if (this.tabMenu) {
      this.tabMenu.unload();
    }
  }

  unload() {
    removeStylesheet(this.window.document, STYLESHEET_URL);
    this.unloadPageMenu();
    this.unloadTabMenu();
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
