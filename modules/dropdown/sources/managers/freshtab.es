/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import BaseDropdownManager from './base';

export default class ContentDropdownManager extends BaseDropdownManager {
  constructor({ cliqz, view }) {
    super();
    this.view = view;
    this.cliqz = cliqz;
    this.iframeWrapperReady.then(() => {
      document.addEventListener('visibilitychange', this.onBlur);
    });
  }

  unload() {
    document.removeEventListener('visibilitychange', this.onBlur);
    super.unload();
  }

  get textInput() {
    return this.view.textInput;
  }

  get entryPoint() {
    return 'newTab';
  }

  _copyToClipboard(val) {
    const input = window.document.createElement('input');
    input.value = val;
    window.document.body.appendChild(input);
    input.select();
    window.document.execCommand('copy');
    window.document.body.removeChild(input);
    this._focus();
  }

  _navigateTo(url, newTab) {
    return this.cliqz.core.openLink(url, { newTab });
  }

  _switchToTab(url) {
    return this.cliqz.core.openLink(url, { newTab: false, switchTab: true });
  }

  _focus() {
    const len = this.textInput.value.length;
    this.textInput.focus();
    this.textInput.setSelectionRange(len, len);
  }

  _isUrlbarFocused() {
    // Both page and urlbar input should be focused
    return document.visibilityState === 'visible'
      && this.textInput === document.activeElement;
  }

  _setUrlbarValue(value) {
    this.textInput.value = value || '';
  }

  _getUrlbarValue() {
    return this.textInput.value;
  }

  _setSelectionRange(start, end) {
    this.textInput.setSelectionRange(start, end, 'backward');
  }

  _getSelectionRange() {
    return {
      selectionStart: this.textInput.selectionStart,
      selectionEnd: this.textInput.selectionEnd,
    };
  }

  _isPrivate() {
    return chrome.extension.inIncognitoContext;
  }

  _setHeight(height) {
    this.view.setState({
      iframeHeight: Math.min(this._getMaxHeight(), height),
    });
  }

  _getHeight() {
    return this.view.state.iframeHeight;
  }

  _getUrlbarAttributes() {
    const searchInputStyle = window.getComputedStyle(this.textInput);
    const extraSpace = 22;
    const defaultPadding = 35;

    let padding = (searchInputStyle.paddingLeft && searchInputStyle.paddingLeft.replace('px', ''))
                  || defaultPadding;

    if (padding > 50) {
      padding -= extraSpace;
    }

    return {
      padding,
    };
  }

  _getMaxHeight() {
    return window.innerHeight - 140;
  }

  close() {
    super.close();
    this.view.setState({
      focused: false,
    });
  }

  onDrop(ev) {
    // `super.onDrop` returns `true` if dropped content contained text data
    // (i.e. we should trigger search)
    if (super.onDrop(ev)) {
      this._queryCliqz();
    }
  }

  onKeydown(ev) {
    ev.stopPropagation();
    this.view.hideSettings();

    if (ev.key === 'Escape') {
      this._setUrlbarValue('');
    }

    if (ev.key === 'Tab') {
      if (!this.isOpen) {
        this._queryCliqz('', { allowEmptyQuery: true });
        return true;
      }
    }

    return super.onKeydown(ev);
  }
}
