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
  constructor(config) {
    this.window = config.window;
    this.contextMenu = this.window.document.getElementById(
        'contentAreaContextMenu');
    this._builtInSearchItem = this.window.document.getElementById(
        'context-searchselect');
    this.onPopupShowing = this.onPopupShowing.bind(this);
    this.onPopupHiding = this.onPopupHiding.bind(this);
    this.menuItem = null;
    this.channel = config.settings.channel;
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

    if(this.window.gContextMenu == undefined){
      // we need to find a solution for e10s
      return;
    }

    let isLink = this.window.gContextMenu.onLink;
    let selection;
    if (isLink) {
      selection = this.window.gContextMenu.target.textContent;
    } else {
      selection = this.getSelection();
    }

    if (selection) {
      this.menuItem = this.window.document.createElement('menuitem');

      this.menuItem.setAttribute('label',
        utils.getLocalizedString('context-menu-search-item',
          trim(selection)));

      const isFreshtab = this.window.gBrowser.currentURI.spec === utils.CLIQZ_NEW_TAB;
      this.menuItem.addEventListener(
          'click', this.clickHandler.bind(this, selection, {
            openInNewTab: !isFreshtab
          }));

      this.contextMenu.insertBefore(this.menuItem, this._builtInSearchItem);
      // Can't do once in constructor, because it's dynamic.
      // Check if this is CLIQZ browser
      if (this.channel === "40") {
        // Hide default search option
        this._builtInSearchItem.setAttribute('hidden', 'true');
      }
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
      utils.openTabInWindow(this.window, '', true)
    }

    var urlbar = this.window.document.getElementById('urlbar');

    urlbar.mInputField.focus();
    urlbar.mInputField.setUserInput(query);
  }

  getSelection() {
    try {
      return this.window.gContextMenu.selectionInfo.text;
    } catch (e) {
      return '';
    }
  }
}
