/**
* @namespace context-menu
*/
export default class ContextMenu {
  /**
  * @class ContextMenu
  * @constructor
  */
  constructor(config, contextMenu, beforeElem) {
    this.window = config.window;
    this.contextMenu = contextMenu;
    this.beforeElem = beforeElem || this.contextMenu.firstChild;
    this.onPopupShowing = this.onPopupShowing.bind(this);
    this.onPopupHiding = this.onPopupHiding.bind(this);
    this.menuItems = [];
  }

  addMenuItem({ label, onclick = () => {}, icon, beforeElem, disabled = false }) {
    const elem = beforeElem || this.beforeElem;
    const menuItem = this.window.document.createElement('menuitem');
    menuItem.setAttribute('label', label);
    if (disabled) {
      menuItem.setAttribute('disabled', true);
    }
    menuItem.addEventListener('click', onclick);
    if (icon) {
      // TODO: not working for me...
      menuItem.setAttribute('style', `list-style-image: url("${icon}");`);
      menuItem.className = 'menuitem-iconic';
    }
    this.contextMenu.insertBefore(menuItem, elem);
    this.menuItems.push(menuItem);
  }

  addSeparator({ beforeElem }) {
    const separator = this.window.document.createElement('menuseparator');
    this.contextMenu.insertBefore(separator, beforeElem);
    this.menuItems.push(separator);
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
    this.removeMenuItems();
    this.contextMenu.removeEventListener('popupshowing', this.onPopupShowing);
    this.contextMenu.removeEventListener('popupHiding', this.onPopupHiding);
  }

  /**
  * @event onPopupShowing
  * @param ev
  */
  onPopupShowing(ev) {
    if (this._onPopupShowing) {
      this._onPopupShowing(ev);
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
    this.removeMenuItems();
  }

  removeMenuItems() {
    this.menuItems.forEach(x => this.contextMenu.removeChild(x));
    this.menuItems = [];
  }
}
