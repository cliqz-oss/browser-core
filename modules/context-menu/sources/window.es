import { utils } from 'core/cliqz';

function trim(text) {
  text = text.trim();

  if (text.length > 15) {
    return text.substring(0, 15)+'...';
  } else {
    return text;
  }
}

/**
* @namespace context-menu
*/
export default class {
  /**
  * @class ContextMenu
  * @constructor
  */
  constructor(settings) {
    this.window = settings.window;
    this.contextMenu = this.window.document.getElementById(
        'contentAreaContextMenu');
    this._builtInSearchItem = this.window.document.getElementById(
        'context-searchselect');
    this.onPopupShowing = this.onPopupShowing.bind(this);
    this.onPopupHiding = this.onPopupHiding.bind(this);
    this.menuItem = null;
  }

  /**
  * Adds listeners to the context menu
  * @method init
  */
  init() {
    this.contextMenu.addEventListener(
        'popupshowing', this.onPopupShowing, false);
    this.contextMenu.addEventListener(
        'popuphiding', this.onPopupHiding, false);
  }

  /**
  * Unloads context menu
  * @method unload
  */
  unload() {
    this.removeMenuItem();
    this.contextMenu.removeEventListener('popupshowing', this.onPopupShowing);
    this.contextMenu.removeEventListener('popupHiding', this.onPopupHiding);
    this._builtInSearchItem.removeAttribute('hidden');
  }

  /**
  * @event onPopupShowing
  * @param ev
  */
  onPopupShowing(ev) {
    utils.telemetry({
      "type": "context_menu",
      "action": "open",
      "context": "webpage"
    });
    if (ev.target !== this.contextMenu) {
      return;
    }

    let isLink = CliqzUtils.getWindow().gContextMenu.onLink;
    let selection;
    if (isLink) {
      selection = CliqzUtils.getWindow().gContextMenu.target.textContent;
    } else {
      selection = this.getSelection();
    }

    if (selection) {
      this.menuItem = this.window.document.createElement('menuitem');

      this.menuItem.setAttribute('label',
        CliqzUtils.getLocalizedString('context-menu-search-item',
          trim(selection)));

      const isFreshtab = CliqzUtils.getWindow().gBrowser.currentURI.spec === 'about:cliqz';
      this.menuItem.addEventListener(
          'click', this.clickHandler.bind(this, selection, {
            openInNewTab: !isFreshtab
          }));

      this.contextMenu.insertBefore(this.menuItem, this._builtInSearchItem);
      // Can't do once in constructor, because it's dynamic.
      this._builtInSearchItem.setAttribute('hidden', 'true');
    } else {
      this.menuItem = null;
    }

  }

  /**
  * @event onPopupHiding
  * @param ev
  */
  onPopupHiding(ev) {
    if (ev.target !== this.contextMenu) {
      return;
    }
    this.removeMenuItem();
  }

  removeMenuItem() {
    if (this.menuItem) {
      this.contextMenu.removeChild(this.menuItem);
      this.menuItem = null;
    }
  }

  clickHandler(query, options) {
    utils.telemetry({
      "type": "context_menu",
      "action": "search",
      "query_length": query.length
    });
    // opens a new empty tab
    if(options.openInNewTab) {
      CLIQZEnvironment.openTabInWindow(this.window, '', true)
    }

    var urlbar = this.window.document.getElementById('urlbar');

    urlbar.mInputField.focus();
    urlbar.mInputField.setUserInput(query);
  }

  getSelection() {
    try {
      return this.window.document.commandDispatcher.focusedWindow
          .getSelection().toString();
    } catch (e) {
      return '';
    }
  }
}
