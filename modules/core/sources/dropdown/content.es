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

  // _telemetry() {}
  _copyToClipboard(val) {
    const input = window.document.createElement('input');
    input.value = val;
    window.document.body.appendChild(input);
    input.select();
    window.document.execCommand('copy');
    window.document.body.removeChild(input);
  }
  _openLink(
    url,
    {
      newTab,
      eventType,
      result,
      resultOrder,
      meta = {},
    },
  ) {
    const selection = {
      url,
      query: result.query,
      rawResult: result,
      resultOrder,
      isNewTab: Boolean(newTab),
      isPrivateMode: false,
      kind: result.kind,
      isFromAutocompletedURL: this.hasAutocompleted && eventType === 'keyboard',
      action: eventType === 'keyboard' ? 'enter' : 'click',
      elementName: meta.elementName,
    };

    this.cliqz.freshtab.selectResult(selection);

    if (newTab) {
      this.cliqz.core.openLink(url, { newTab });
    } else {
      window.location.href = url;
    }
  }
  // setHeight: () => {},
  _focus() {
    const len = this.textInput.value.length;
    this.textInput.focus();
    this.textInput.setSelectionRange(len, len);
  }
  _reportHighlight() {
    this.cliqz.search.reportHighlight();
  }
  _adultAction(actionName) {
    return this.cliqz.search.adultAction(actionName, this._getQuery());
  }
  _locationAction(actionName, query, rawResult) {
    return this.cliqz.search.locationAction(actionName, query, rawResult);
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
  _setHeight(height) {
    this.view.setState({
      iframeHeight: Math.min(this._getMaxHeight(), height),
    });
  }
  _queryCliqz = (_query) => {
    const query = _query || this._getQuery();
    if (query) {
      this.cliqz.search.startSearch(query, { keyCode: this.lastEvent.code });
    } else {
      this.setHeight(0);
    }
  }
  _getHeight() {
    return this.view.state.iframeHeight;
  }
  _removeFromHistory(url) {
    return this.cliqz.freshtab.removeFromHistory(url);
  }
  _removeFromBookmarks(url) {
    return this.cliqz.freshtab.removeFromBookmarks(url);
  }
  // _closeTabsWithUrl() {}

  _getQuery() {
    const query = this.textInput.value;
    if (this.hasCompletion) {
      return query.slice(0, this.textInput.selectionStart);
    }
    return query;
  }

  _getAssistantStates() {
    return this.cliqz.search.getAssistantStates();
  }
  _getUrlbarAttributes() {
    return {
      padding: 35
    };
  }
  _getMaxHeight() {
    return window.innerHeight - 140;
  }
  // _createIframe() {}

  onKeydown(ev) {
    ev.stopPropagation();
    this.view.hideSettings();
    this.lastEvent = {
      code: ev.key,
    };

    return super.onKeydown(ev);
  }
}
