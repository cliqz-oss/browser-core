import inject from '../core/kord/inject';
import { utils } from 'core/cliqz';
import ContextMenu from './context-menu';

function trim(text) {
  const _text = text.trim();
  if (_text.length > 15) {
    return `${_text.substring(0, 15)}...`;
  }
  return _text;
}

function isValidURL(url) {
  return url.indexOf('about:') !== 0 && url.indexOf('place:') !== 0 &&
    url.indexOf('resource:') !== 0 && url.indexOf('chrome:') !== 0;
}

function sendTab(PeerComm, url) {
  PeerComm.getObserver('TABSHARING').sendTab(url, PeerComm.masterID)
  .then(() => {
    utils.telemetry({
      type: 'connect',
      version: 1,
      action: 'send_tab',
      is_success: true,
    });
  })
  .catch(() => {
    utils.telemetry({
      type: 'connect',
      version: 1,
      action: 'send_tab',
      is_success: false,
    });
  });
}

/**
* @namespace context-menu
*/
export default class {
  /**
  * @class ContextMenu
  * @constructor
  */
  constructor(config) {
    this.config = config;
    this.window = config.window;
    this.pairing = inject.module('pairing');
  }

  /**
  * Adds listeners to the context menu
  * @method init
  */
  init() {
    this.initPageMenu(); // Right-click on page content
    this.initTabMenu(); // Right-click on tab title
  }

  /**
  * Unloads context menu
  * @method unload
  */
  unload() {
    this.unloadPageMenu();
    this.unloadTabMenu();
  }

  getPeerComm() {
    return this.pairing.action('getPairingPeer').catch((e) => undefined)
  }

  initPageMenu() {
    const config = this.config;
    const window = this.window;
    const contextMenu = window.document.getElementById('contentAreaContextMenu');
    this.builtInSearchItem = window.document.getElementById('context-searchselect');
    this.pageMenu = new ContextMenu(config, contextMenu, this.builtInSearchItem);

    this.pageMenu._onPopupShowing = (ev) => {
      utils.telemetry({
        type: 'context_menu',
        action: 'open',
        context: 'webpage',
      });
      if (ev.target !== contextMenu) {
        return;
      }

      if (this.window.gContextMenu === undefined) {
        // we need to find a solution for e10s
        return;
      }

      const isLink = this.window.gContextMenu.onLink;
      let selection;
      if (isLink) {
        selection = this.window.gContextMenu.target.textContent;
      } else {
        try {
          selection = this.window.gContextMenu.selectionInfo.text;
        } catch (e) {
          selection = '';
        }
      }

      if (selection) {
        const isFreshtab = this.window.gBrowser.currentURI.spec === utils.CLIQZ_NEW_TAB;
        this.pageMenu.addMenuItem({
          label: utils.getLocalizedString('context-menu-search-item', trim(selection)),
          onclick: () => {
            const query = selection;
            const options = { openInNewTab: !isFreshtab };
            utils.telemetry({
              type: 'context_menu',
              action: 'search',
              query_length: query.length,
            });
            // opens a new empty tab
            if (options.openInNewTab) {
              utils.openTabInWindow(this.window, '', true);
            }

            const urlbar = this.window.document.getElementById('urlbar');

            urlbar.mInputField.focus();
            urlbar.mInputField.setUserInput(query);
          },
        });

        // Can't do once in constructor, because it's dynamic.
        // Check if this is CLIQZ browser
        if (config.settings.channel === '40') {
          // Hide default search option
          this.builtInSearchItem.setAttribute('hidden', 'true');
        }
      }

      // Pairing menu
      const url = isLink ?
        this.window.gContextMenu.target.href : this.window.gBrowser.currentURI.spec;

      this.getPeerComm().then((PeerComm) => {
        const beforeElem = this.window.document.getElementById('context-bookmarklink');
        const isEnabled = PeerComm && PeerComm.isInit && PeerComm.isPaired && isValidURL(url);
        const onclick = isEnabled ? () => {
          sendTab(PeerComm, url);
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
      });
    };
    this.pageMenu.init();
  }

  unloadPageMenu() {
    this.pageMenu.unload();
    this.builtInSearchItem.removeAttribute('hidden');
  }

  initTabMenu() {
    const config = this.config;
    const window = this.window;
    const contextMenu = window.document.getElementById('tabContextMenu');
    this.tabMenu = new ContextMenu(config, contextMenu);

    this.tabMenu._onPopupShowing = () => {
      const tabPos = this.window.TabContextMenu.contextTab._tPos;
      const url = this.window.gBrowser.getBrowserAtIndex(tabPos).currentURI.spec;
      this.getPeerComm().then((PeerComm) => {
        const beforeElem = this.window.document.getElementById('context_openTabInWindow');
        const isEnabled = PeerComm && PeerComm.isInit && PeerComm.isPaired && isValidURL(url);
        const onclick = isEnabled ? () => {
          sendTab(PeerComm, url);
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
      });
    };
    this.tabMenu.init();
  }

  unloadTabMenu() {
    this.tabMenu.unload();
  }
}
