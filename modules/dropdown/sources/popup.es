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

  open() {
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
