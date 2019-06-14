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
    this.urlbar = window.gURLBar;
  }

  get entryPoint() {
    return 'browserBar';
  }

  init() {
    PASSIVE_EVENTS.forEach(eventName =>
      this.urlbar.addEventListener(eventName, this, PASSIVE_LISTENER_OPTIONS));
    PREVENTABLE_EVENTS.forEach(eventName =>
      this.urlbar.addEventListener(eventName, this, PREVENTABLE_LISTENER_OPTIONS));
    this.urlbar.goButton.addEventListener('click', stopEvent, true);

    this.shortcutAPI.on('click', this._onShortcutClicked);
  }

  destroy() {
    this.shortcutAPI.off('click', this._onShortcutClicked);
    this.dropdownAPI.off('message', this._onMessage);
    this.urlbar.goButton.removeEventListener('click', stopEvent, true);

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

  _onShortcutClicked = (_, { text }) => {
    this._setSearchStringValue(text);
    this._setUrlbarValue(text);
    this._queryCliqz(text);
    this._focus();
    this._setSelectionRange(0, text.length);
  }

  _focus() {
    this.urlbar.focus();
  }

  _isUrlbarFocused() {
    return this.urlbar.focused;
  }

  _setUrlbarValue(value) {
    this.urlbar.value = value;
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

  _getQuery() {
    return this.urlbar.controller.searchString;
  }

  _setSearchStringValue(value) {
    this.urlbar.controller.searchString = value;
  }

  onKeydown(event) {
    if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
      // In case when part of the urlbar value is selected (ex. autocompleted)
      // pressing Left/Right resets selection.
      // Here we sync searchString with urlbar visible value.
      this._setSearchStringValue(this.urlbar.mInputField.value);
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
        const urlbar = this.window.gURLBar;
        const mInputField = urlbar.mInputField;
        const hasCompletion = mInputField.selectionEnd !== mInputField.selectionStart
          && mInputField.value.length > 1;
        if (
          hasCompletion
          && mInputField.value[mInputField.selectionStart] === String.fromCharCode(event.charCode)
        ) {
          let query = urlbar.value;
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
    if (this.urlbar.focused) {
      super._resultsDidRender(...args);
    }
  }
}
