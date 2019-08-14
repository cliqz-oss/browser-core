/* globals Components */
import Spanan from 'spanan';
import BaseDropdownManager from './base';
import { isUrl } from '../../core/url';
import {
  PASSIVE_EVENTS,
  PREVENTABLE_EVENTS,
  PASSIVE_LISTENER_OPTIONS,
  PREVENTABLE_LISTENER_OPTIONS,
  stopEvent,
} from './utils';

export default class BrowserDropdownManager extends BaseDropdownManager {
  constructor({ window, windowId, lastQuery }, dropdownAPI) {
    super();

    this.dropdownAPI = dropdownAPI;
    this.shortcutAPI = lastQuery;
    this.windowId = windowId;
    this.window = window;
    this.urlbar = window.gURLBar.textbox || window.gURLBar;
    this._syncQueryWithUrlbar();
  }

  get entryPoint() {
    return 'browserBar';
  }

  init() {
    PASSIVE_EVENTS.forEach(eventName =>
      this.urlbar.addEventListener(eventName, this, PASSIVE_LISTENER_OPTIONS));
    PREVENTABLE_EVENTS.forEach(eventName =>
      this.urlbar.addEventListener(eventName, this, PREVENTABLE_LISTENER_OPTIONS));
    this.window.gURLBar.goButton.addEventListener('click', stopEvent, true);

    this.shortcutAPI.on('click', this._onShortcutClicked);
  }

  destroy() {
    this.shortcutAPI.off('click', this._onShortcutClicked);
    this.dropdownAPI.off('message', this._onMessage);
    this.window.gURLBar.goButton.removeEventListener('click', stopEvent, true);

    PASSIVE_EVENTS.forEach(eventName =>
      this.urlbar.removeEventListener(eventName, this, PASSIVE_LISTENER_OPTIONS));
    PREVENTABLE_EVENTS.forEach(eventName =>
      this.urlbar.removeEventListener(eventName, this, PREVENTABLE_LISTENER_OPTIONS));
  }

  createIframeWrapper() {
    const iframeWrapper = new Spanan(({ action, ...rest }) => {
      this.dropdownAPI.sendMessage(this.windowId, {
        target: 'cliqz-dropdown',
        action,
        ...rest,
      });
    });

    this.iframeWrapper = iframeWrapper;

    this.dropdownAPI.on('message', this._onMessage);

    iframeWrapper.export(this.actions, {
      respond: (response, request) => {
        this.dropdownAPI.sendMessage(this.windowId, {
          type: 'response',
          uuid: request.uuid,
          response,
        });
      },
    });

    this.dropdownAction = iframeWrapper.createProxy();
    this._iframeWrapperDefer.resolve();
  }

  _onMessage = (_, windowId, data) => {
    if (this.windowId === windowId) {
      this.onMessage({ data });
    }
  }

  _telemetry(payload) {
    this.dropdownAPI.emit('telemetry', this.window, payload);
  }

  _copyToClipboard(text) {
    const gClipboardHelper = Components.classes['@mozilla.org/widget/clipboardhelper;1']
      .getService(Components.interfaces.nsIClipboardHelper);
    gClipboardHelper.copyString(text);
  }

  _navigateTo(url, newTab = false) {
    this.dropdownAPI.navigateTo(this.windowId, url, { target: newTab ? 'tabshifted' : 'current' });
  }

  _switchToTab(url) {
    this.window.gURLBar.handleRevert();

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
      ...rest,
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

    const { id: tabId } = this.dropdownAPI.getCurrentTab(this.window);
    if (newTab
      || this._isPrivate()
      || !url
      || isFromFirstAutocompletedURL
      || isUrl(result.query)
    ) {
      this.shortcutAPI.hideLastQuery(tabId);
    } else {
      this.shortcutAPI.update(tabId, result.query);
    }
  }

  _handleEnter(newTab) {
    super._handleEnter(newTab);

    const query = this.query;
    const { id: tabId } = this.dropdownAPI.getCurrentTab(this.window);

    if (newTab
      || this.hasCompletion
      || this._isPrivate()
      || isUrl(query)
    ) {
      this.shortcutAPI.hideLastQuery(tabId);
    } else {
      this.shortcutAPI.update(tabId, query);
    }
  }

  _onShortcutClicked = (_, { text }) => {
    this._queryCliqz(text);
    this._focus();
    this._setSelectionRange(0, text.length);
  }

  _focus() {
    this.window.gURLBar.focus();
  }

  _isUrlbarFocused() {
    // gURLBar.focused is not a reliable source of information to determine
    // wether urlbar is focused or not (see EX-9048).
    // Instead we compare currently focused element with urlbar html:input tag.
    return this.window.Services.focus.focusedElement === this.urlbar.mInputField;
  }

  _setUrlbarValue(value) {
    this.window.gURLBar.value = value;
  }

  _setUrlbarVisibleValue(value) {
    this.urlbar.mInputField.value = value;
  }

  _getUrlbarValue() {
    return this.urlbar.mInputField.value;
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
    return this.dropdownAPI.getURLBarAttributes(this.window);
  }

  _isPrivate() {
    const { incognito } = this.dropdownAPI.getCurrentTab(this.window);
    return incognito;
  }

  _setHeight(height) {
    this.dropdownAPI.setHeight(this.windowId, height);
  }

  _getHeight() {
    return this.dropdownAPI.getState(this.window).height;
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
        if (event.key === 'Escape' && this.window.gURLBar.controller.input) {
          // On pressing 'Escape' discard the user query and restore the original urlbar value.
          // In Firefox prior to version 68 it was done by the browser.
          // After Firefox 68 we do it ourselves,
          const previousValue = this.window.gURLBar.controller.input.value;
          this._setUrlbarValue(previousValue);
          this._setSelectionRange(0, previousValue.length);
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
        const urlbar = this.urlbar;
        const mInputField = urlbar.mInputField;
        const hasCompletion = mInputField.selectionEnd !== mInputField.selectionStart
          && mInputField.selectionEnd === urlbar.mInputField.value.length
          && mInputField.value.length > 1;
        if (
          hasCompletion
          && mInputField.value[mInputField.selectionStart] === String.fromCharCode(event.charCode)
        ) {
          let query = mInputField.value;
          const queryWithCompletion = mInputField.value;
          const start = mInputField.selectionStart;
          query = query.slice(0, urlbar.selectionStart) + String.fromCharCode(event.charCode);

          // Prevent sending the new query
          event.preventDefault();

          // Set new query value and trigger 'input' event
          mInputField.value = '';
          mInputField.setUserInput(query);

          // Restore original mInputField.value and completion
          mInputField.value = queryWithCompletion;

          // Update completion
          mInputField.setSelectionRange(start + 1, mInputField.value.length);
        }
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
