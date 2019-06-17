import BaseDropdownManager from './base';

export default class ContentDropdownManager extends BaseDropdownManager {
  constructor({ cliqz, view }) {
    super();
    this.view = view;
    this.cliqz = cliqz;
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
  }

  _navigateTo(url, newTab) {
    return this.cliqz.core.openLink(url, { newTab });
  }

  _focus() {
    const len = this.textInput.value.length;
    this.textInput.focus();
    this.textInput.setSelectionRange(len, len);
  }

  _isUrlbarFocused() {
    return this.textInput === document.activeElement;
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

  _getQuery() {
    const query = this.textInput.value;
    if (this.hasCompletion) {
      return query.slice(0, this.textInput.selectionStart);
    }
    return query;
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
    this.view.setState({
      iframeHeight: 0,
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
