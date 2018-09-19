/* eslint no-param-reassign: 'off' */
/* eslint func-names: 'off' */
/* eslint prefer-arrow-callback: 'off' */

import AppWindow from '../core/base/window';
import utils from '../core/utils';
import prefs from '../core/prefs';
import CliqzEvents from '../core/events';
import { addStylesheet, removeStylesheet } from '../core/helpers/stylesheet';
import inject from '../core/kord/inject';
import urlbarEventHandlers from './urlbar-events';
import attachGoButton from './go-button';
import { getMessage } from '../core/i18n';

const ACproviderName = 'cliqz-results';
const STYLESHEET_URL = 'chrome://cliqz/content/static/styles/styles.css';
const QUICK_SEARCH_PREF = 'modules.search.providers.cliqz.enabled';

/**
  @namespace ui
*/
export default class UIWindow extends AppWindow {
  events = {
  };

  actions = {
    setUrlbarValue: (value, options = {}) => {
      const opts = typeof options === 'object' ?
        options :
        { visibleValue: options };

      let ifMatches = opts.match || (() => true);

      if (ifMatches instanceof RegExp) {
        const re = ifMatches;
        ifMatches = s => re.test(s);
      } else if (typeof ifMatches !== 'function') {
        const m = ifMatches.toString();
        ifMatches = s => m === s;
      }

      if (ifMatches(this.urlbar.value)) {
        this.urlbar.value = value;
      }

      if (ifMatches(this.urlbar.mInputField.value)) {
        let newValue = value;
        if (Object.prototype.hasOwnProperty.call(opts, 'visibleValue')) {
          if (opts.visibleValue) {
            newValue = opts.visibleValue;
          } else {
            newValue = '';
          }
        }

        this.urlbar.mInputField.value = newValue;
      }

      if (opts.focus) {
        this.urlbar.mInputField.focus();
      }
    },
  };

  /**
  * @class Window
  * @constructor
  */
  constructor(settings) {
    super(settings);
    this.elems = [];
    this.settings = settings.settings;
    this.urlbar = this.window.gURLBar;
    this.initialized = false;
    this.window.CLIQZ.UI = {};
    this.urlbarEventHandlers = {};
    Object.keys(urlbarEventHandlers).forEach((ev) => {
      this.urlbarEventHandlers[ev] = urlbarEventHandlers[ev].bind(this);
    });
  }

  /**
  * @method init
  */
  init() {
    super.init();

    // do not initialize the UI if locationbar is invisible in this window
    if (!this.window.locationbar.visible) return;

    // create a new panel for cliqz to avoid inconsistencies at FF startup
    const document = this.window.document;

    addStylesheet(this.window.document, STYLESHEET_URL);

    this._autocompletesearch = this.urlbar.getAttribute('autocompletesearch');
    this.urlbar.setAttribute('autocompletesearch', ACproviderName);

    this.window.CLIQZ.Core.urlbar = this.urlbar;

    this.urlbar.setAttribute('pastetimeout', 0);

    const popup = document.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'panel');
    this.popup = popup;
    // mock default FF function
    this.popup.enableOneOffSearches = function () {};
    this.popup.closePopup = function () {};
    this.popup.oneOffSearchButtons = {
      maybeRecordTelemetry() { return false; }
    };
    this.popup.openAutocompletePopup = function () {};
    this.window.CLIQZ.Core.popup = this.popup;
    popup.setAttribute('id', 'PopupAutoCompleteRichResultCliqz');
    this.elems.push(popup);
    document.getElementById('PopupAutoCompleteRichResult').parentElement.appendChild(popup);

    this._autocompletepopup = this.urlbar.getAttribute('autocompletepopup');
    this.urlbar.setAttribute('autocompletepopup', 'PopupAutoCompleteRichResultCliqz');

    this._disableKeyNavigation = this.urlbar.disableKeyNavigation;
    this.urlbar.disableKeyNavigation = true;

    Object.keys(this.urlbarEventHandlers).forEach((ev) => {
      this.urlbar.addEventListener(ev, this.urlbarEventHandlers[ev]);
    });

    // make CMD/CTRL + K equal with CMD/CTRL + L
    this.searchShortcutElements = this.window.document.getElementById('mainKeyset').querySelectorAll('#key_search, #key_search2');
    [].forEach.call(this.searchShortcutElements, (item) => {
      item.setAttribute('original_command', item.getAttribute('command'));
      item.setAttribute('command', 'Browser:OpenLocation');
    });

    // Add search history dropdown
    this.reloadUrlbar();
    this.initialized = true;

    this.goButton = attachGoButton(this.window, inject.module('search'));
    this.onPrefChange = CliqzEvents.subscribe('prefchange', (pref) => {
      if (pref === QUICK_SEARCH_PREF) {
        this.updateUrlbarPlaceholder();
      }
    });

    this.applyAdditionalThemeStyles();
  }

  updateUrlbarPlaceholder() {
    this.urlbar.mInputField.placeholder = prefs.get(QUICK_SEARCH_PREF, true) ?
      getMessage('freshtab_urlbar_placeholder') :
      this.originalUrlbarPlaceholder;
  }

  /**
  * triggers component reload at install/uninstall
  * @method reloadUrlbar
  */
  reloadUrlbar() {
    const el = this.urlbar;
    const oldVal = el.value;
    const hadFocus = el.focused;

    const onFocus = () => {
      el.removeEventListener('focus', onFocus);

      if (this.urlbar.getAttribute('autocompletesearch').indexOf(ACproviderName) === -1) {
        return;
      }

      // redo search query
      if (oldVal && !prefs.get('integration-tests.started', false)) {
        inject.module('core').action('queryCliqz', oldVal);
      }
    };

    if (el && el.parentNode) {
      el.blur();
      el.parentNode.insertBefore(el, el.nextSibling);
      el.value = oldVal;

      if (hadFocus) {
        el.addEventListener('focus', onFocus);
        inject.module('search').isWindowReady(this.window).then(() => el.focus());
      }
    }
  }

  applyAdditionalThemeStyles() {
    const urlbar = this.urlbar;
    this.originalUrlbarPlaceholder = urlbar.mInputField.placeholder;
    this.updateUrlbarPlaceholder();
  }

  revertAdditionalThemeStyles() {
    const urlbar = this.urlbar;

    urlbar.style.maxWidth = '';
    urlbar.style.margin = '';
    urlbar.mInputField.placeholder = this.originalUrlbarPlaceholder;
  }

  urlbarEvent(ev) {
    const action = {
      type: 'activity',
      action: `urlbar_${ev}`
    };

    CliqzEvents.pub(`core:urlbar_${ev}`);
    utils.telemetry(action);
  }

  unload() {
    super.unload();

    if (!this.initialized) return;

    removeStylesheet(this.window.document, STYLESHEET_URL);
    this.onPrefChange.unsubscribe();

    this.urlbar.setAttribute('autocompletesearch', this._autocompletesearch);
    this.urlbar.setAttribute('autocompletepopup', this._autocompletepopup);
    this.urlbar.disableKeyNavigation = this._disableKeyNavigation;

    Object.keys(this.urlbarEventHandlers).forEach(function (ev) {
      this.urlbar.removeEventListener(ev, this.urlbarEventHandlers[ev]);
    }.bind(this));
    // revert onclick handler
    [].forEach.call(this.searchShortcutElements, (item) => {
      item.setAttribute('command', item.getAttribute('original_command'));
    });

    if (this.goButton) {
      this.goButton.deattach();
    }

    const searchContainer = this.window.document.getElementById('search-container');
    if (this._searchContainer) {
      searchContainer.setAttribute('class', this._searchContainer);
    }
    this.reloadUrlbar();
    this.revertAdditionalThemeStyles();

    this.elems.forEach((item) => {
      if (item && item.parentNode) {
        item.parentNode.removeChild(item);
      }
    });

    delete this.window.CLIQZ.UI;
  }
}
