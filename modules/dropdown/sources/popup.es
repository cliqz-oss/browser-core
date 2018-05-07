export default class Popup {
  constructor(window) {
    this.window = window;
  }
  get element() {
    return this.urlbar.popup;
  }

  get urlbar() {
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

  get isOpen() {
    return this.element.mPopupOpen;
  }

  getUrlbarAttributes() {
    const urlbarRect = this.urlbar.getBoundingClientRect();
    const urlbarLeftPos = Math.round(urlbarRect.left || urlbarRect.x || 0);
    const urlbarWidth = urlbarRect.width;
    const extraPadding = 10;
    let contentPadding = extraPadding + urlbarLeftPos;

    // Reset padding when there is a big space on the left of the urlbar
    // or when the browser's window is too narrow
    if (contentPadding > 500 || this.window.innerWidth < 650) {
      contentPadding = 50;
    }

    return {
      padding: contentPadding,
      left: urlbarLeftPos,
      width: urlbarWidth,
    };
  }

  open() {
    // handleCommand will clear the value of urlbar if mPopupOpen is falsy
    this.element.mPopupOpen = true;
    this.element.mInput = this.urlbar;
    const navBar = this.window.document.querySelector('#nav-bar');

    this.element.width = this.window.innerWidth;

    this.element.openPopup(navBar, 'after_start', 0, 0, false, true);
  }

  close() {
    this.element.mPopupOpen = false;
    this.element.hidePopup();
  }

  execBrowserCommandHandler(url, ...args) {
    const urlbar = this.element.mInput;
    if (url) {
      urlbar.value = url;
    } else {
      urlbar.value = urlbar.mInputField.value;
    }
    this.element.mInput.handleCommand(...args);
  }
}
