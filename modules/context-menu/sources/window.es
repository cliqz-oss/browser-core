import { utils } from 'core/cliqz';

function trim(text) {
  text = text.trim();

  if (text.length > 15) {
    return text.substring(0, 15)+'...';
  } else {
    return text;
  }
}

export default class {

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

  init() {
    this.contextMenu.addEventListener(
        'popupshowing', this.onPopupShowing, false);
    this.contextMenu.addEventListener(
        'popuphiding', this.onPopupHiding, false);
  }

  unload() {
    this.removeMenuItem();
    this.contextMenu.removeEventListener('popupshowing', this.onPopupShowing);
    this.contextMenu.removeEventListener('popupHiding', this.onPopupHiding);
    this._builtInSearchItem.removeAttribute('hidden');
  }

  onPopupShowing(ev) {
    utils.telemetry({
      "type": "context_menu",
      "action": "open",
      "context": "webpage"
    });
    if (ev.target !== this.contextMenu) {
      return;
    }

    let selection = this.getSelection();

    if (selection) {
      this.menuItem = this.window.document.createElement('menuitem');

      this.menuItem.setAttribute('label',
        CliqzUtils.getLocalizedString('context-menu-search-item',
          trim(selection)));
      this.menuItem.addEventListener(
          'click', this.clickHandler.bind(this, selection));

      this.contextMenu.insertBefore(this.menuItem, this._builtInSearchItem);
      // Can't do once in constructor, because it's dynamic.
      this._builtInSearchItem.setAttribute('hidden', 'true');
    } else {
      this.menuItem = null;
    }
  }

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

  clickHandler(query) {
    utils.telemetry({
      "type": "context_menu",
      "action": "search",
      "query_length": query.length
    });
    // opens a new empty tab
    CLIQZEnvironment.openTabInWindow(this.window, '')

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
