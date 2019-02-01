import Spanan from 'spanan';

export default class BaseDropdownManager {
  constructor() {
    this.selectedResult = null;
    this.hasAutocompleted = false;
  }

  actions = {
    telemetry: (...args) => this._telemetry(...args),
    copyToClipboard: val => this._copyToClipboard(val),
    openLink: (...args) => this._openLink(...args),
    focus: (...args) => this._focus(...args),
    reportHighlight: (...args) => this._reportHighlight(...args),
    adultAction: (...args) => this._adultAction(...args),
    locationAction: (...args) => this._locationAction(...args),
    setHeight: height => this.setHeight(height),
    openContextMenu: (...args) => this._openContextMenu(...args),
  }

  _telemetry() {}

  _copyToClipboard() {}

  _openLink() {}

  _handleEnter() {}

  _focus() {}

  _reportHighlight() {}

  _reportClick() {}

  _reportEnter() {}

  _adultAction() {}

  _locationAction() {}

  _setUrlbarValue() {}

  _getUrlbarValue() {}

  _setSelectionRange() {}

  _getSelectionRange() {}

  _setHeight() {}

  _queryCliqz() {}

  _getHeight() {}

  _removeFromHistory() {}

  _removeFromBookmarks() {}

  _closeTabsWithUrl() {}

  _getQuery() {}

  _getAssistantStates() {}

  _getUrlbarAttributes() {}

  _getMaxHeight() {}

  _createIframe() {}

  _getSessionId() {}

  get isOpen() {
    return this._getHeight() > 0;
  }

  get fromAutocompledURL() {
    return this.selectedResult
      && this.previousResults
      && this.previousResults[0].url === this.selectedResult.url
      && this.hasCompletion;
  }

  setHeight(height) {
    this._setHeight(height);
  }

  nextResult() {
    return this.dropdownAction.nextResult()
      .then((result) => {
        this.selectedResult = result;
        return result;
      });
  }

  previousResult() {
    return this.dropdownAction.previousResult()
      .then((result) => {
        this.selectedResult = result;
        return result;
      });
  }

  setUrlbarValue = (result) => {
    if (result.completion) {
      this.autocompleteQuery(result.query, result.completion);
    } else {
      this._setUrlbarValue(result.urlbarValue);
    }
  }

  onMessage = (event) => {
    if (!this.iframeWrapper) {
      return;
    }

    const message = event.data;

    if (message.type === 'response') {
      this.iframeWrapper.dispatch({
        uuid: message.uuid,
        response: message.response,
      });
      return;
    }

    if (message.target === 'cliqz-renderer') {
      this.iframeWrapper.handleMessage(message);
    }
  }

  removeFromHistoryAndBookmarks(url) {
    Promise.all([
      this._removeFromHistory(url),
      this._removeFromBookmarks(url),
    ])
      .then(() => this._closeTabsWithUrl(url))
      .then(() => this._queryCliqz());
  }

  createIframeWrapper(_iframe) {
    if (!this.iframe) {
      if (_iframe) {
        this.iframe = _iframe;
      } else {
        this.iframe = this._createIframe();
      }
    }

    const iframe = this.iframe;

    const iframeWrapper = new Spanan(({ action, ...rest }) => {
      iframe.contentWindow.postMessage({
        target: 'cliqz-dropdown',
        action,
        ...rest,
      }, '*');
    });

    this.iframeWrapper = iframeWrapper;

    // Somehow the chrome.i18n object is missing on iframes in Chrome
    try {
      // eslint-disable-next-line
      iframe.contentWindow.chrome.i18n = chrome.i18n;
    } catch (e) {
      // throws on platform firefox, but i18n is there already
    }

    iframe.contentWindow.addEventListener('message', this.onMessage);

    iframeWrapper.export(this.actions, {
      respond(response, request) {
        iframe.contentWindow.postMessage({
          type: 'response',
          uuid: request.uuid,
          response,
        }, '*');
      },
    });

    this.dropdownAction = iframeWrapper.createProxy();
  }

  close() {
    this.selectedResult = null;
    this.setHeight(0);
  }

  unload() {
    if (this.iframe) {
      this.iframe.contentWindow.removeEventListener('message', this.onMessage);
    }
  }

  onInput() {
    this._queryCliqz();
    return true;
  }

  onKeydown(ev) {
    let preventDefault = false;
    switch (ev.key) {
      case 'ArrowUp':
      case 'ArrowDown': {
        preventDefault = true;
        if (!this.isOpen) {
          this._queryCliqz('', { allowEmptyQuery: true });
          break;
        }
        (ev.key === 'ArrowUp' ? this.previousResult() : this.nextResult())
          .then(this.setUrlbarValue);
        break;
      }
      case 'Tab': {
        if (this.isOpen || this.textInput.value) {
          (ev.shiftKey ? this.previousResult() : this.nextResult())
            .then(this.setUrlbarValue);
        }
        if (this.isOpen) {
          preventDefault = true;
        }
        break;
      }
      case 'Enter':
      case 'NumpadEnter': {
        const newTab = ev.altKey || ev.metaKey || ev.ctrlKey;
        const query = this.selectedResult ? this.selectedResult.query : this._getQuery();

        if (this.isOpen && this.hasRelevantResults(query, this.previousResults)) {
          this.dropdownAction.handleEnter({ newTab });
        } else {
          this._handleEnter(newTab);
        }
        break;
      }
      case 'Escape': {
        if (this.isOpen) {
          this.setHeight(0);
        } else {
          this.close();
        }
        break;
      }
      case 'Delete':
      case 'Backspace': {
        if (!ev.shiftKey || ev.metaKey || (ev.altKey && ev.ctrlKey)
            || !this.selectedResult || !this.selectedResult.isDeletable
        ) {
          break;
        }

        const historyUrl = this.selectedResult.historyUrl;
        this.removeFromHistoryAndBookmarks(historyUrl);

        preventDefault = true;
        break;
      }
      default: break;
    }

    return preventDefault;
  }

  get hasCompletion() {
    const query = this._getUrlbarValue();
    const { selectionStart, selectionEnd } = this._getSelectionRange();
    return (
      selectionEnd === query.length
      && selectionEnd !== selectionStart
      && selectionStart !== 0
    );
  }

  onKeyPress({ charCode }) {
    let preventDefault = false;
    const query = this._getUrlbarValue();
    const { selectionStart } = this._getSelectionRange();

    if (
      this.hasCompletion
      && query[selectionStart] === String.fromCharCode(charCode)
    ) {
      this._setSelectionRange(selectionStart + 1, query.length);
      this._queryCliqz();
      preventDefault = true;
    }

    return preventDefault;
  }

  onDrop(ev) {
    const dTypes = ev.dataTransfer.types;
    if ((dTypes.indexOf && dTypes.indexOf('text/plain') !== -1)
      || (dTypes.contains && dTypes.contains('text/plain') !== -1)) {
      this._telemetry({
        type: 'activity',
        action: 'textdrop'
      });
    }
  }

  autocompleteQuery(query, completion) {
    if (!completion) {
      this._setUrlbarValue(query);
      return;
    }
    const value = `${query}${completion}`;
    if (this._getUrlbarValue() !== value) {
      this._setUrlbarValue(value);
    }
    this._setSelectionRange(query.length, value.length);
    this.hasAutocompleted = true;
  }

  hasRelevantResults(query, results) {
    const result = results[0];
    return (result.text === query)
           || (result.suggestion && (result.suggestion === query));
  }

  async render({
    query: _query,
    queriedAt: _queriedAt,
    rawResults,
    /* getSessionId, */
  }) {
    this.hasAutocompleted = false;
    this.selectedResult = null;

    let urlbarQuery = this._getQuery();
    const firstResult = rawResults && rawResults[0];
    if (!firstResult || !this.hasRelevantResults(urlbarQuery, rawResults)) {
      if (!urlbarQuery) {
        this.setHeight(0);
      }
      return;
    }

    const assistantStates = await this._getAssistantStates();
    const query = _query || firstResult.text;
    const queriedAt = _queriedAt || Date.now();

    this.previousQuery = query;
    this.previousResults = rawResults;

    const params = {
      assistantStates,
      urlbarAttributes: this._getUrlbarAttributes(),
      maxHeight: this._getMaxHeight(),
    };

    const {
      height,
      result,
      renderedSessionId,
    } = await this.dropdownAction.render({
      rawResults,
      query,
      queriedAt,
      sessionId: this._getSessionId(),
    }, params);

    urlbarQuery = this._getQuery();
    if (renderedSessionId === this._getSessionId()
        && this.hasRelevantResults(urlbarQuery, [result])) {
      this.autocompleteQuery(
        urlbarQuery,
        result.meta.completion,
      );

      this.selectedResult = result;
      this.setHeight(height);
      return;
    }

    if (renderedSessionId !== this._getSessionId() || urlbarQuery === '') {
      this.setHeight(0);
    }
  }
}
