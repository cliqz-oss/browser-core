import prefs from '../core/prefs';

export default class {
  constructor(window) {
    this.window = window;
  }

  get element() {
    return this.urlbar.popup;
  }

  get urlbar() {
    // TODO: do not use global
    return this.window.gURLBar;
  }

  get query() {
    const ctrl = this.urlbar.controller;
    return ctrl.searchString.trim();
  }

  get urlbarValue() {
    return this.urlbar.value;
  }

  get urlbarVisibleValue() {
    return this.urlbar.mInputField.value;
  }

  get urlbarSelectionRange() {
    return {
      selectionStart: this.urlbar.selectionStart,
      selectionEnd: this.urlbar.selectionEnd
    };
  }

  get isNewSearchMode() {
    return prefs.get('searchMode', 'autocomplete') !== 'autocomplete';
  }

  setDropdownPadding() {
    const urlbarRect = this.urlbar.getBoundingClientRect();
    const extraPadding = 10;
    let actualPadding = extraPadding + Math.round(urlbarRect.left || urlbarRect.x || 0);

    // Reset padding when there is a big space on the left of the urlbar
    // or when the browser's window is too narrow
    if (actualPadding > 500 || this.window.innerWidth < 650) {
      actualPadding = 50;
    }
    const dropdown = this.element.querySelector('#cliqz-dropdown');
    dropdown.style.setProperty('--url-padding-start', `${actualPadding}px`);
  }

  open() {
    this.setDropdownPadding();

    if (!this.isNewSearchMode) {
      return;
    }
    const navBar = this.window.document.querySelector('#nav-bar');

    // without this ESC does not revert to the page url
    this.element.mInput = this.urlbar;

    this.element.width = this.window.innerWidth;

    this.element.openPopup(navBar, 'after_start', 0, 0, false, true);
  }

  close() {
    if (!this.isNewSearchMode) {
      return;
    }
    this.element.closePopup();
  }

  execBrowserCommandHandler(...args) {
    const urlbar = this.element.mInput;
    urlbar.value = urlbar.mInputField.value;
    this.element.mInput.handleCommand(...args);
  }
}
