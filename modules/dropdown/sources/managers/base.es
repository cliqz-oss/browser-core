/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Spanan from 'spanan';
import Defer from '../../core/helpers/defer';

const KEYS_TO_IGNORE = new Set(['Unidentified', 'Dead']);

export default class BaseDropdownManager {
  constructor() {
    this.selectedResult = null;
    this.hoveredResult = null;
    this._lastEvent = null;
    this._iframeWrapperDefer = new Defer();
    this._delayedBlur = null;
    this._resetQuery();
  }

  get entryPoint() {
    throw new Error('Not implemented');
  }

  get targetModule() {
    return 'dropdown';
  }

  get iframeWrapperReady() {
    return this._iframeWrapperDefer.promise;
  }

  get query() {
    return this._queryString;
  }

  actions = {
    telemetry: (...args) => this._telemetry(...args),
    copyToClipboard: val => this._copyToClipboard(val),
    openLink: (...args) => this._openLink(...args),
    focus: (...args) => this._focus(...args),
    setHeight: height => this.setHeight(height),
    resultsDidRender: (...args) => this._resultsDidRender(...args),
    reportHighlight: (result) => {
      this.selectedResult = result;
    },
    reportHover: (result) => {
      this.hoveredResult = result;
    },
  }

  _telemetry() {}

  _copyToClipboard() {}

  _navigateTo() {}

  _switchToTab() {}

  _focus() {}

  _setUrlbarValue() {}

  _getUrlbarValue() {}

  _getUrlbarAttributes() {}

  _setSelectionRange() {}

  _getSelectionRange() {}

  _setHeight() {}

  _getHeight() {}

  _isPrivate() {}

  _createIframe() {}

  _isUrlbarFocused() {}

  _getUrlbarVisibleValue() {
    return this._getUrlbarValue();
  }

  _setUrlbarVisibleValue(value) {
    return this._setUrlbarValue(value);
  }

  _resetQuery() {
    this._queryString = '';
  }

  _syncQueryWithUrlbar() {
    const query = this._getUrlbarValue() || '';
    const { selectionStart } = this._getSelectionRange();
    this._queryString = this.hasCompletion
      ? query.slice(0, selectionStart)
      : query;
  }

  async _queryCliqz(_query, { allowEmptyQuery = false } = {}) {
    await this.iframeWrapperReady;
    if (_query) {
      this._setUrlbarValue(_query);
      this._syncQueryWithUrlbar();
    }
    const incognito = this._isPrivate();
    const keyCode = this._lastEvent && this._lastEvent.key;
    const isPasted = this._lastEvent ? this._lastEvent.type === 'paste' : false;
    const isTyped = this._lastEvent ? this._lastEvent !== 'drop' : false;

    if (this.query || allowEmptyQuery) {
      this.dropdownAction.startSearch(this.query, {
        allowEmptyQuery,
        isPasted,
        isPrivate: incognito,
        isTyped,
        keyCode,
        targetModule: this.targetModule,
      }, {
        urlbarAttributes: this._getUrlbarAttributes(),
      });
    } else {
      this.collapse();
    }
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
    this._reportClick({
      url,
      query: result.query,
      rawResult: result,
      resultOrder,
      isNewTab: Boolean(newTab),
      isPrivateMode: this._isPrivate(),
      isPrivateResult: result.isPrivateResult,
      kind: result.kind,
      isFromAutocompletedURL: this.fromAutocompledURL,
      action: eventType === 'keyboard' ? 'enter' : 'click',
      elementName: meta.elementName,
    });

    if (!newTab) {
      this.close();
    }

    if (meta.handledByBrowser) {
      return;
    }

    if (result.isSwitchtab && !newTab) {
      this._switchToTab(url);
    } else {
      this._navigateTo(url, newTab);
    }
  }

  _handleEnter(newTab = false) {
    if (!this.query) {
      return;
    }

    const visibleValue = this._getUrlbarVisibleValue();
    this._reportClick({
      url: visibleValue,
      query: this.query,
      isNewTab: newTab,
      isPrivateMode: this._isPrivate(),
      isFromAutocompletedURL: this.fromAutocompledURL,
      action: 'enter',
    });

    this._navigateTo(visibleValue, newTab);
  }

  _reportClick(selection) {
    this.dropdownAction.reportSelection(selection);
  }

  get isOpen() {
    return this._getHeight() > 0;
  }

  get fromAutocompledURL() {
    return this.selectedResult
      && this.hasCompletion;
  }

  setHeight(height) {
    this._setHeight(height);
  }

  async nextResult() {
    await this.iframeWrapperReady;
    this.selectedResult = await this.dropdownAction.nextResult();
    return this.selectedResult;
  }

  async previousResult() {
    await this.iframeWrapperReady;
    this.selectedResult = await this.dropdownAction.previousResult();
    return this.selectedResult;
  }

  setUrlbarValue = (result) => {
    if (result.meta && result.meta.completion) {
      this._autocompleteQuery(result.text, result.meta.completion);
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

  async _removeFromHistoryAndBookmarks(url) {
    const query = (this.selectedResult && this.selectedResult.query) || this.query;
    await this.dropdownAction.removeFromHistoryAndBookmarks(url);
    this._setUrlbarVisibleValue(query);
    this._queryCliqz();
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
    this._iframeWrapperDefer.resolve();
  }

  close() {
    this.dropdownAction.stopSearch({ entryPoint: this.entryPoint });
    this.collapse();
  }

  collapse() {
    this._syncQueryWithUrlbar();
    this.selectedResult = null;
    this.setHeight(0);
    this.dropdownAction.clear();
  }

  unload() {
    if (this.iframe) {
      this.iframe.contentWindow.removeEventListener('message', this.onMessage);
    }
    clearTimeout(this._delayedBlur);
  }

  onInput() {
    if (this._lastEvent && KEYS_TO_IGNORE.has(this._lastEvent.key)) {
      // No need to trigger search on "dead" and "unidentified" keystrokes
      return false;
    }
    this._syncQueryWithUrlbar();
    if (this._lastEvent && this._lastEvent.type === 'paste') {
      this._telemetry({
        type: 'activity',
        action: 'paste',
        current_length: this.query.length,
      });
    }
    this._queryCliqz();
    return true;
  }

  onPaste(ev) {
    this._lastEvent = ev;
  }

  onFocus() {
    this._lastEvent = null;
    this.iframeWrapperReady.then(() => this.dropdownAction.setSearchSession());
  }

  onBlur = () => {
    // Clicking on elements in dropdown takes focus away from input field
    // in some versions of Firefox, triggering 'blur' event which we should ignore.
    // (See EX-7709 and EX-7291).
    // Before running onBlur handler Let's wait a bit in case focus gets restored to the urlbar.
    clearTimeout(this._delayedBlur);
    this._delayedBlur = setTimeout(() => {
      if (!this._isUrlbarFocused()) {
        this._lastEvent = null;
        this.close();
      }
    }, 100);
  }

  onKeydown(ev) {
    this._lastEvent = ev;
    let preventDefault = false;
    switch (ev.key) {
      case 'ArrowLeft':
      case 'ArrowRight':
        this._syncQueryWithUrlbar();
        break;
      case 'ArrowUp':
      case 'ArrowDown': {
        preventDefault = true;
        if (!this.isOpen) {
          this._syncQueryWithUrlbar();
          // Put cursor at the end of the query
          this._setSelectionRange(this.query.length, this.query.length);
          this._queryCliqz('', { allowEmptyQuery: true });
          break;
        }
        (ev.key === 'ArrowUp' ? this.previousResult() : this.nextResult())
          .then(this.setUrlbarValue);
        break;
      }
      case 'Tab': {
        if (this.isOpen) {
          (ev.shiftKey ? this.previousResult() : this.nextResult())
            .then(this.setUrlbarValue);
          preventDefault = true;
        }
        break;
      }
      case 'Enter':
      case 'NumpadEnter': {
        const newTab = ev.altKey || ev.metaKey || ev.ctrlKey;
        const query = this.query;
        const urlbarValueMatchesResultQuery = !this.selectedResult
          || this.selectedResult.query === query
          || this.selectedResult.urlbarValue === query;

        if (this.isOpen && urlbarValueMatchesResultQuery) {
          this.dropdownAction.handleEnter({ newTab });
        } else {
          this._handleEnter(newTab);
        }
        break;
      }
      case 'Escape': {
        if (this.isOpen) {
          this.collapse();
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
        this._removeFromHistoryAndBookmarks(historyUrl);

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
      this._syncQueryWithUrlbar();
      this._queryCliqz();
      preventDefault = true;
    }

    return preventDefault;
  }

  onDrop(ev) {
    const dTypes = ev.dataTransfer.types;
    if (dTypes && dTypes.includes('text/plain')) {
      this._lastEvent = ev;
      this._telemetry({
        type: 'activity',
        action: 'textdrop'
      });
      return true;
    }
    return false;
  }

  _autocompleteQuery(query, completion) {
    const urlbarValue = this._getUrlbarValue();
    const { selectionEnd } = this._getSelectionRange();
    if (query === this.query
      && selectionEnd < urlbarValue.length) {
      // We should not apply completion if user is editing the query.
      return;
    }

    if (!completion) {
      this._setUrlbarVisibleValue(query);
      return;
    }
    const prevSelectionRange = this._getSelectionRange();

    const value = `${query}${completion}`;
    if (this._getUrlbarVisibleValue() !== value) {
      this._setUrlbarVisibleValue(value);
    }

    let nextSelectionStart = query.length;
    let nextSelectionEnd = value.length;

    // EX-6780: we need to take into account a previous selection range
    // which might be there if a user selected chars in a url bar before
    // _autocompleteQuery finished and reset the value of the url bar.
    // We do that to let a user take precedence over a computed selection.
    // To define a final selection range we have to add the following if-clauses.
    // If a user's selection start is less than a computed selection start then
    // we reset the latter one to the user's one.
    // If a user's selection end is greater than a computed selection end then
    // we reset the latter one further to the user's defined.
    // That way would allow us to include user's selected range as well (if any).
    if (prevSelectionRange.selectionStart < nextSelectionStart) {
      nextSelectionStart = prevSelectionRange.selectionStart;
    }

    if (prevSelectionRange.selectionEnd > nextSelectionEnd) {
      nextSelectionEnd = prevSelectionRange.selectionEnd;
    }

    this._setSelectionRange(nextSelectionStart, nextSelectionEnd);
  }

  hasRelevantResults(query, results) {
    const result = results[0];
    return (result.text === query)
           || (result.suggestion && (result.suggestion === query));
  }

  _resultsDidRender({ height, result, rawResults }) {
    if (this.hasRelevantResults(this.query, rawResults)) {
      this._autocompleteQuery(
        this.query,
        result.meta.completion,
      );
      this.dropdownAction.setQueryLastDraw(Date.now());
      this.selectedResult = result;
      this.setHeight(height);
      return;
    }

    if (this.query === '') {
      this.collapse();
    }
  }
}
