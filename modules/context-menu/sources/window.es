import config from '../core/config';
import utils from '../core/utils';
import ContextMenu from './context-menu';

function trim(text) {
  const _text = text.trim();
  if (_text.length > 15) {
    return `${_text.substring(0, 15)}...`;
  }
  return _text;
}

/**
* @namespace context-menu
*/
export default class Win {
  /**
  * @class ContextMenu
  * @constructor
  */
  constructor(config) {
    this.config = config;
    this.window = config.window;
    this.menus = [];
    this.actions = {
      makeContextMenu: this.makeContextMenu.bind(this),
    };
  }

  makeContextMenu(...args) {
    const menu = new ContextMenu(...args);
    this.menus.push(menu);
    return menu;
  }

  /**
  * Adds listeners to the context menu
  * @method init
  */
  init() {
    this.initPageMenu(); // Right-click on page content
  }

  /**
  * Unloads context menu
  * @method unload
  */
  unload() {
    this.unloadPageMenu();
    this.menus.forEach(menu => menu.unload());
    this.menus = [];
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

      let selection = '';
      if (this.window.gContextMenu.selectionInfo.text) {
        selection = this.window.gContextMenu.selectionInfo.text;
      }

      // Can't do once in constructor, because it's dynamic.
      // Check if this is CLIQZ browser
      if (config.settings.channel === '40') {
        // Hide default search option
        this.builtInSearchItem.setAttribute('hidden', 'true');
      }

      if (selection) {
        const isFreshtab = this.window.gBrowser.currentURI.spec === config.settings.NEW_TAB_URL;
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
      }
    };
    this.pageMenu.init();
  }

  unloadPageMenu() {
    this.pageMenu.unload();
    this.builtInSearchItem.removeAttribute('hidden');
  }
}
