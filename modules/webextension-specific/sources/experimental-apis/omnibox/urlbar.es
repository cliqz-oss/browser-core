/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
/* global ChromeUtils */
import EventEmitter from '../../../core/event-emitter';

import LastQuery from './last-query';
import { nextTick } from '../../../core/decorators';
import { PASSIVE_LISTENER_OPTIONS, stopEvent } from '../../../dropdown/managers/utils';

const { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm');
const AC_PROVIDER_NAME = 'cliqz-results';

const noop = () => {};

const STUB_URLBAR_PROPS = {
  megabar: false,
  updateLayoutBreakout: noop,
  _updateLayoutBreakoutDimensions: noop,
  startLayoutExtend: noop,
};

function replaceProps(obj, propsMap) {
  const backup = {};
  Object.entries(propsMap).forEach(([prop, value]) => {
    backup[prop] = obj[prop];
    // eslint-disable-next-line no-param-reassign
    obj[prop] = value;
  });

  return backup;
}

/**
 * Represents Cliqz wrapper around original Firefox gURLBar, provides API for Dropdown
 * and BrowserDropdownManager.
 */
export default class URLBar extends EventEmitter {
  _oldPlaceholder = null;

  constructor({ window, placeholder }) {
    super();
    this._window = window;
    this._placeholder = placeholder;
  }

  get urlbar() {
    return this._window.gURLBar;
  }

  // XULElement representing firefox urlbar
  get textbox() {
    return this.urlbar.textbox // Quantumbar (FF68+)
      || this.urlbar; // Legacy autocomplete
  }

  // HTMLInputElement representing firefox urlbar
  get inputField() {
    return this.urlbar.inputField;
  }

  get isLegacy() {
    return this.textbox.nodeName === 'textbox';
  }

  get isQuantumbar() {
    return this.urlbar.controller && this.urlbar.controller.manager;
  }

  focus() {
    this.urlbar.focus();
  }

  /**
   * Returns urlbar dimensions and background color,
   * Needed to adjust dropdown results padding and background.
   */
  get URLBarAttributes() {
    return {
      ...this._URLBarAttributes,
      navbarColor: this._color,
    };
  }

  _overrideQuantumbar() {
    const controller = this.urlbar.controller;
    let qbProviders = null;
    let qbController = null;

    // Unregistering all search providers so that urbar query won't trigger default dropdown
    qbProviders = this._unregisterQuantumBarProviders();

    // Creating a fake urlbar controller which proxies all the calls to the original one,
    // except the ones we want to stub.
    qbController = controller;
    this.urlbar.controller = this._createUrlbarControllerProxy(controller, {
      // Native handling of key navigation interferes with our own, disable it
      handleKeyNavigation: noop,
    });

    // For compatibility with Firefox 68-69 (which have both legacy and quantumbar),
    // force switching to legacy urlbar.
    if (this.textbox.getAttribute('quantumbar') === 'true') {
      this.textbox.setAttribute('quantumbar', 'false');
    }

    // Make sure "megabar" is disabled
    this._urlbarPropsBackup = replaceProps(this.urlbar, STUB_URLBAR_PROPS);
    if (this._urlbarPropsBackup.megabar !== false) {
      this.urlbar.removeAttribute('breakout');
      this.urlbar.setAttribute('breakout-extend-disabled', 'true');
      this.textbox.parentNode.removeAttribute('breakout');
    }

    this._qbController = qbController;
    this._qbProviders = qbProviders;
  }

  _overrideLegacyAutocomplete() {
    const document = this._window.document;
    const autocompletesearch = this.textbox.getAttribute('autocompletesearch');
    this.textbox.setAttribute('autocompletesearch', AC_PROVIDER_NAME);
    this.textbox.setAttribute('pastetimeout', 0);

    // Disable triggering default autocomplete popup by replacing it with an empty panel...
    const popup = document.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'panel');
    // ...and mocking necessary functions.
    popup.enableOneOffSearches = () => {};
    popup.closePopup = () => this.emit('close');
    popup.richlistbox = {
      children: []
    };
    popup.oneOffSearchButtons = {
      maybeRecordTelemetry() { return false; }
    };
    popup.openAutocompletePopup = () => {};
    popup.setAttribute('id', 'PopupAutoCompleteRichResultCliqz');
    document.getElementById('mainPopupSet').appendChild(popup);

    const autocompletepopup = this.textbox.getAttribute('autocompletepopup');
    this.textbox.setAttribute('autocompletepopup', 'PopupAutoCompleteRichResultCliqz');

    // Disable key navigation
    this._disableKeyNavigation = this.textbox.disableKeyNavigation;
    this.textbox.disableKeyNavigation = true;

    this._autocompletesearch = autocompletesearch;
    this._autocompletepopup = autocompletepopup;
  }

  /**
    * Disables default Firefox autocomplete leaving only functions we need,
    * changes urlbar placeholder, applies custom styles.
   */
  init() {
    const document = this._window.document;

    // Disable default autocomplete:
    // Case 1: Quantumbar
    if (this.isQuantumbar) {
      this._overrideQuantumbar();
    }

    // Case 2: Legacy autocopmlete.
    // Note that quantumbar and legacy are not mutually exclusive.
    // Some "transitional" Firefox versions (68, 69) have aspects of both implementations.
    // Consider removing this step after mininimally supported FF-version moves to 70.
    if (this.isLegacy) {
      this._overrideLegacyAutocomplete();
    }

    // Apply some custom styles
    this.textbox.style.maxWidth = '100%';
    this.textbox.style.margin = '0px 0px';

    // Initialize "Last Query" control
    this.lastQuery = new LastQuery(this._window);

    // Cliqz doesn't have separate search field, so make CMD/CTRL + K work like CMD/CTRL + L
    this._searchShortcutElements = Array.from(
      document.querySelectorAll('#mainKeyset #key_search, #mainKeyset #key_search2')
    ).map((item) => {
      item.setAttribute('original_command', item.getAttribute('command'));
      item.setAttribute('command', 'Browser:OpenLocation');
      return item;
    });

    // Apply changes we made
    this._reload();

    // Set custom placeholder
    if (this._placeholder) {
      this._oldPlaceholder = this.inputField.placeholder;
      this.inputField.placeholder = this._placeholder;
    }

    // Override original goButton click handler
    this._goButtonOnClick = this.urlbar.goButton.onclick;
    this.urlbar.goButton.onclick = null;
    this.urlbar.goButton.addEventListener('click', this);

    this._window.addEventListener('resize', this, PASSIVE_LISTENER_OPTIONS);
    this._themePref = Services.prefs.getBranch('extensions.activeThemeID');
    this._themePref.addObserver('', this);

    // Calculate initial urlbar dimensions and background color
    this._updateURLBarAttributes();
    this._updateUrlbarBackgroundColor();
  }

  /**
   * Restores Firefox urlbar to its original state
   */
  unload() {
    this._themePref.removeObserver('', this);
    this._window.removeEventListener('resize', this, PASSIVE_LISTENER_OPTIONS);

    // Restore goButton click handlers
    this.urlbar.goButton.removeEventListener('click', this);
    this.urlbar.goButton.onclick = this._goButtonOnClick;

    // Restore original
    this._searchShortcutElements.forEach((item) => {
      item.setAttribute('command', item.getAttribute('original_command'));
    });

    // Restore original quantumbar
    if (this.isQuantumbar) {
      this._reregisterQuantumBarProviders(this._qbProviders);
      this.urlbar.controller = this._qbController;
      this.urlbar.megabar = this._megabar;
      replaceProps(this.urlbar, this._urlbarPropsBackup);
      if (this._urlbarPropsBackup.megabar !== false) {
        this.urlbar.setAttribute('breakout', 'true');
        this.urlbar.removeAttribute('breakout-extend-disabled');
        this.textbox.parentNode.setAttribute('breakout', 'true');
      }
    }

    // Restore legacy autocomplete
    if (this.isLegacy) {
      this.textbox.setAttribute('autocompletesearch', this._autocompletesearch);
      this.textbox.setAttribute('autocompletepopup', this._autocompletepopup);

      this.textbox.disableKeyNavigation = this._disableKeyNavigation;

      if (this._popup && this._popup.parentNode) {
        this._popup.parentNode.removeChild(this._popup);
      }
    }

    // Reset custom styles
    this.textbox.style.maxWidth = '';
    this.textbox.style.margin = '';

    // Apply made changes
    this._reload();

    // Restore original placeholder
    if (this._placeholder) {
      this.inputField.placeholder = this._oldPlaceholder;
      this._oldPlaceholder = null;
      this._placeholder = null;
    }

    // destroy "Last Query" control
    this.lastQuery.unload();
    this.lastQuery = null;
  }

  _unregisterQuantumBarProviders() {
    const { controller } = this.urlbar;
    const providers = controller.manager.providers.concat();
    providers.forEach(p => controller.manager.unregisterProvider(p));
    return providers;
  }

  _reregisterQuantumBarProviders(providers) {
    const { controller } = this.urlbar;
    providers.forEach(p => controller.manager.registerProvider(p));
  }

  _createUrlbarControllerProxy(controller, expansion) {
    return new Proxy(controller, {
      get(obj, prop) {
        if (expansion[prop]) {
          return expansion[prop];
        }
        return obj[prop];
      }
    });
  }

  // Remove urlbar element from DOM tree and insert it back again.
  // Some changes made to the urlbar will be [re]applied only after that.
  _reload() {
    const el = this.textbox;
    const oldVal = el.value;

    // EX-4940: We should keep current cursor position in case user already
    // started typed something by this moment
    const { selectionStart, selectionEnd, focused } = this.urlbar;

    if (el && el.parentNode) {
      el.blur();
      el.parentNode.insertBefore(el, el.nextSibling);
      el.value = oldVal;
    }

    if (focused) {
      this.urlbar.focus();
    }

    this.urlbar.selectionStart = selectionStart;
    this.urlbar.selectionEnd = selectionEnd;
    // EX-9368: Reloading urlbar might break "paste and go" context menu item
    // in some versions of Firefox. Restore it if that happens.
    this._restorePasteAndGo();
  }

  _restorePasteAndGo() {
    if (!this.urlbar._initPasteAndGo) {
      return;
    }

    const inputBox = this.textbox.querySelector('moz-input-box')
      || this._window.document.getAnonymousElementByAttribute(
        this.textbox,
        'anonid',
        'moz-input-box'
      );

    if (!inputBox.menupopup) {
      return;
    }

    const pasteAndGo = inputBox.menupopup.getElementsByAttribute('anonid', 'paste-and-go');
    if (!pasteAndGo || !pasteAndGo[0]) {
      this.urlbar._initPasteAndGo();
    }
  }

  observe(_, topic) {
    if (topic === 'nsPref:changed') {
      nextTick(() => this._updateUrlbarBackgroundColor());
    }
  }

  handleEvent(event) {
    if (event.type === 'resize') {
      this._updateURLBarAttributes();
    }

    if (event.type === 'click' && event.target === this.urlbar.goButton) {
      this.emit('gobutton-click', event);
      stopEvent(event);
    }
  }

  async _updateURLBarAttributes() {
    const urlbarRect = await this._window.promiseDocumentFlushed(
      () => this.textbox.getBoundingClientRect()
    );
    const urlbarLeftPos = Math.round(urlbarRect.left || urlbarRect.x || 0);
    const urlbarWidth = urlbarRect.width;
    const extraPadding = 10;
    let contentPadding = extraPadding + urlbarLeftPos;

    // Reset padding when there is a big space on the left of the urlbar
    // or when the browser's window is too narrow
    if (contentPadding > 500 || this._window.innerWidth < 650) {
      contentPadding = 50;
    }

    this._URLBarAttributes = {
      padding: contentPadding,
      left: urlbarLeftPos,
      width: urlbarWidth,
    };

    this.emit('update-attributes', this._URLBarAttributes);
  }

  _updateUrlbarBackgroundColor() {
    const CHANNEL_TRESHOLD = 220;
    const toolbar = this._window.document.getElementById('nav-bar');
    const bgColor = this._window.getComputedStyle(toolbar)['background-color'];

    // Check if toolbar background color is light-grey-ish and non-transparent
    const [, r, g, b, a] = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+))?/) || ['', '0', '0', '0', '0'];
    if (r > CHANNEL_TRESHOLD
        && g > CHANNEL_TRESHOLD
        && b > CHANNEL_TRESHOLD
        && (a === undefined || a >= 1)
    ) {
      this._color = bgColor;
    } else {
      this._color = null;
    }

    this.emit('update-attributes', {
      navbarColor: this._color,
    });
  }


  static navigateTo(window, url, options) {
    const urlbar = window.gURLBar;
    const { selectionStart, selectionEnd, value, focused, controller } = urlbar;
    const visibleValue = urlbar.inputField.value;

    urlbar.value = url;
    if (controller.input) {
      controller.input.value = url;
    }

    const keydownEnterEvent = new window.KeyboardEvent('keydown', { key: 'Enter' });
    urlbar.handleCommand(keydownEnterEvent, options.target);

    if (options.target === 'tabshifted') {
      if (focused) {
        urlbar.focus();
      }
      urlbar.value = value;
      urlbar.inputField.value = visibleValue;
      urlbar.selectionStart = selectionStart;
      urlbar.selectionEnd = selectionEnd;
    }
  }

  static update(window, { value }) {
    const urlbar = window.gURLBar;
    urlbar.value = value;
    urlbar.inputField.value = value;
  }
}
