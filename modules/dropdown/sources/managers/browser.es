/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* globals Components */
import Spanan from 'spanan';
import BaseDropdownManager from './base';
import { isUrl } from '../../core/url';
import {
  PASSIVE_EVENTS,
  PREVENTABLE_EVENTS,
  TAB_CHANGE_EVENTS,
  PASSIVE_LISTENER_OPTIONS,
  PREVENTABLE_LISTENER_OPTIONS,
  stopEvent,
} from './utils';

export default class BrowserDropdownManager extends BaseDropdownManager {
  constructor({ window, windowId, urlbar, startupReason }, dropdown) {
    super();

    this._dropdown = dropdown;
    this._urlbar = urlbar;
    this._lastQuery = urlbar.lastQuery;
    this.windowId = windowId;
    this.window = window;
    this.urlbar = window.gURLBar;
    this._syncQueryWithUrlbar();

    // On browser startup user can begin to type before Cliqz extension (and dropdown) initializes.
    // in this case we should make a query and show the dropdown once it is ready (see EX-9204).
    //
    // Note that we shouldn't do this on 'APP_UPGRDADE' (see EX-9326)
    if (startupReason === 'APP_STARTUP'
      && this._isUrlbarFocused()
    ) {
      this._queryCliqz();
    }
  }

  get entryPoint() {
    return 'browserBar';
  }

  get inputField() {
    return this._urlbar.inputField;
  }

  init() {
    PASSIVE_EVENTS.forEach(eventName =>
      this.urlbar.addEventListener(eventName, this, PASSIVE_LISTENER_OPTIONS));
    PREVENTABLE_EVENTS.forEach(eventName =>
      this.urlbar.addEventListener(eventName, this, PREVENTABLE_LISTENER_OPTIONS));
    this.urlbar.goButton.addEventListener('click', stopEvent, true);
    const tabContainer = this.window.gBrowser.tabContainer;
    TAB_CHANGE_EVENTS.forEach(eventName =>
      tabContainer.addEventListener(eventName, this, PASSIVE_LISTENER_OPTIONS));

    this._lastQuery.on('click', this._onShortcutClicked);
  }

  unload() {
    this._lastQuery.off('click', this._onShortcutClicked);
    this._dropdown.off('message', this._onMessage);
    this.urlbar.goButton.removeEventListener('click', stopEvent, true);

    PASSIVE_EVENTS.forEach(eventName =>
      this.urlbar.removeEventListener(eventName, this, PASSIVE_LISTENER_OPTIONS));
    PREVENTABLE_EVENTS.forEach(eventName =>
      this.urlbar.removeEventListener(eventName, this, PREVENTABLE_LISTENER_OPTIONS));
    const tabContainer = this.window.gBrowser.tabContainer;
    TAB_CHANGE_EVENTS.forEach(eventName =>
      tabContainer.removeEventListener(eventName, this, PASSIVE_LISTENER_OPTIONS));

    super.unload();
  }

  createIframeWrapper() {
    const iframeWrapper = new Spanan(({ action, ...rest }) => {
      this._dropdown.sendMessage({
        target: 'cliqz-dropdown',
        action,
        ...rest,
      });
    });

    this.iframeWrapper = iframeWrapper;

    this._dropdown.on('message', this._onMessage);

    iframeWrapper.export(this.actions, {
      respond: (response, request) => {
        this._dropdown.sendMessage({
          type: 'response',
          uuid: request.uuid,
          response,
        });
      },
    });

    this.dropdownAction = iframeWrapper.createProxy();
    this._iframeWrapperDefer.resolve();
  }

  _onMessage = (data) => {
    this.onMessage({ data });
  }

  _telemetry(payload) {
    this._dropdown.emit('telemetry', this.windowId, payload);
  }

  _copyToClipboard(text) {
    const gClipboardHelper = Components.classes['@mozilla.org/widget/clipboardhelper;1']
      .getService(Components.interfaces.nsIClipboardHelper);
    gClipboardHelper.copyString(text);
  }

  _navigateTo(url, newTab = false) {
    this._urlbar.constructor
      .navigateTo(this.window, url, { target: newTab ? 'tabshifted' : 'current' });
  }

  _switchToTab(url) {
    this.urlbar.handleRevert();

    const { Services, switchToTabHavingURI } = this.window;
    const prevTab = this.window.gBrowser.selectedTab;
    const browser = prevTab.linkedBrowser;
    const isPrevTabEmpty = prevTab.isEmpty // Firefox 65+
      // Firefox 64:
      || (!prevTab.hasAttribute('busy')
        && !prevTab.hasAttribute('customizemode')
        && !browser.canGoForward && !browser.canGoBack
        && this.window.isBlankPageURL(browser.currentURI.spec)
        && this.window.checkEmptyPageOrigin(browser)
      );

    if (switchToTabHavingURI(Services.io.newURI(url), false, {}) && isPrevTabEmpty) {
      this.window.gBrowser.removeTab(prevTab);
    }
  }

  _openLink(
    url,
    {
      newTab,
      eventType,
      result,
      ...rest
    },
  ) {
    const isFromFirstAutocompletedURL = this.selectedResult && this.selectedResult.index === 0
      && this.fromAutocompledURL && eventType === 'keyboard';
    super._openLink(url, {
      newTab,
      eventType,
      result,
      ...rest,
    });

    const { id: tabId } = this._dropdown.getCurrentTab();
    if (newTab
      || this._isPrivate()
      || !url
      || isFromFirstAutocompletedURL
      || isUrl(result.query)
    ) {
      this._lastQuery.hideLastQuery(tabId);
    } else {
      this._lastQuery.update(tabId, result.query);
    }
  }

  _handleEnter(newTab) {
    super._handleEnter(newTab);

    const query = this.query;
    const { id: tabId } = this._dropdown.getCurrentTab();

    if (newTab
      || !query.trim()
      || this.hasCompletion
      || this._isPrivate()
      || isUrl(query)
    ) {
      this._lastQuery.hideLastQuery(tabId);
    } else {
      this._lastQuery.update(tabId, query);
    }
  }

  _onShortcutClicked = (_, { text }) => {
    this._queryCliqz(text);
    this._focus();
    this._setSelectionRange(0, text.length);
  }

  _focus() {
    this._urlbar.focus();
  }

  _isUrlbarFocused() {
    // gURLBar.focused is not a reliable source of information to determine
    // wether urlbar is focused or not (see EX-9048).
    // Instead we compare currently focused element with urlbar html:input tag.
    return this.window.Services.focus.focusedElement === this.inputField;
  }

  _setUrlbarValue(value) {
    this.urlbar.value = value;
  }

  _setUrlbarVisibleValue(value) {
    this.inputField.value = value;
  }

  _getUrlbarValue() {
    return this.inputField.value;
  }

  _setSelectionRange(selectionStart, selectionEnd) {
    this.urlbar.selectionStart = selectionStart;
    this.urlbar.selectionEnd = selectionEnd;
  }

  _getSelectionRange() {
    return {
      selectionStart: this.urlbar.selectionStart,
      selectionEnd: this.urlbar.selectionEnd,
    };
  }

  _getUrlbarAttributes() {
    return this._urlbar.URLBarAttributes;
  }

  _isPrivate() {
    const { incognito } = this._dropdown.getCurrentTab();
    return incognito;
  }

  _setHeight(height) {
    this._dropdown.height = height;
  }

  _getHeight() {
    return this._dropdown.height;
  }

  onKeydown(event) {
    if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
      this.collapse();
    }
    return super.onKeydown(event);
  }

  handleEvent(event) {
    let preventDefault = false;
    switch (event.type) {
      case 'focus':
        this.onFocus();
        break;
      case 'blur':
        this.onBlur();
        break;
      case 'paste':
        this.onPaste();
        break;
      case 'drop':
        this.onDrop(event);
        break;
      case 'input':
        preventDefault = this.onInput();
        break;
      case 'keydown':
        if (event.key === 'Escape' && this.urlbar.controller.input) {
          // On pressing 'Escape' discard the user query and restore the original urlbar value.
          // In Firefox prior to version 68 it was done by the browser.
          // After Firefox 68 we do it ourselves,
          this.urlbar.handleRevert();
        }
        preventDefault = this.onKeydown(event);
        break;
      case 'mouseup':
        if (event.originalTarget.getAttribute('anonid') === 'historydropmarker') {
          this._queryCliqz('', { allowEmptyQuery: true });
        } else if (event.originalTarget.getAttribute('anonid') === 'urlbar-go-button') {
          this._handleEnter(false);
          preventDefault = true;
        }
        break;
      case 'keypress': {
        if (event.ctrlKey || event.altKey || event.metaKey) {
          break;
        }
        const typedCharacter = String.fromCharCode(event.charCode);
        const { value, selectionStart, selectionEnd } = this.inputField;
        const hasCompletion = selectionEnd !== selectionStart
          && selectionEnd === value.length
          && value.length > 1;
        if (
          hasCompletion
          && value[selectionStart] === typedCharacter
        ) {
          const newQuery = value.slice(0, selectionStart) + typedCharacter;

          // Prevent sending the new query
          event.preventDefault();

          // Set new query value and trigger 'input' event
          this.inputField.value = '';
          this.inputField.setUserInput(newQuery);

          // Restore original inputField.value and completion
          this.inputField.value = value;

          // Update completion
          this.inputField.setSelectionRange(selectionStart + 1, value.length);
        }
        break;
      }
      // EX-9184: Opening, closing or switching tab should collapse the dropdown
      // (but don't reset search session as long as the urlbar is in focus)
      case 'TabClose':
      case 'TabSelect': {
        this.collapse();
        break;
      }
      default:
        break;
    }
    if (preventDefault) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }

  _resultsDidRender(...args) {
    if (this._isUrlbarFocused()) {
      super._resultsDidRender(...args);
    }
  }
}
