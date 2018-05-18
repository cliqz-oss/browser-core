/* eslint no-param-reassign: 'off' */
/* eslint func-names: 'off' */
/* eslint prefer-arrow-callback: 'off' */

import AppWindow from '../core/base/window';
import utils from '../core/utils';
import CliqzEvents from '../core/events';
import { addStylesheet, removeStylesheet } from '../core/helpers/stylesheet';
import console from '../core/console';
import inject from '../core/kord/inject';
import urlbarEventHandlers from './urlbar-events';
import attachGoButton from './go-button';

const ACproviderName = 'cliqz-results';

/* eslint-disable */
function autocompleteTerm(urlbar, pattern, loose) {
  var MAX_AUTOCOMPLETE_LENGTH = 80; // max length of autocomplete portion

  function matchQuery(queries) {
    var query = '';
    for (var key in queries) {
      var q = queries[key].toLowerCase();
      if (q.indexOf(input) === 0 && q.length > query.length) {
        query = q;
      }
    }
    return query;
  }
  if (urlbar == 'www.' || urlbar == 'http://' || urlbar.substr(urlbar.indexOf('://') + 3) == 'www.' || urlbar === '')
    return {};

  var url = utils.simplifyUrl(pattern.url);
  url = utils.generalizeUrl(url, true);
  var input = utils.generalizeUrl(urlbar);
  if (urlbar[urlbar.length - 1] == '/') input += '/';

  var autocomplete = false,
    highlight = false,
    selectionStart = 0,
    urlbarCompleted = '';
  var queryMatch = matchQuery(pattern.query);

  // Url
  if (url.indexOf(input) === 0 && url != input &&
    (url.length - input.length) <= MAX_AUTOCOMPLETE_LENGTH) {
    autocomplete = true;
    highlight = true;
    urlbarCompleted = urlbar + url.substring(url.indexOf(input) + input.length);
  }

  if (autocomplete) {
    selectionStart = urlbar.toLowerCase().lastIndexOf(input) + input.length;
  }

  // Adjust url to user protocol
  if (urlbar.indexOf('://') != -1) {
    var prot_user = urlbar.substr(0, urlbar.indexOf('://') + 3);
    var prot_auto = pattern.url.substr(0, pattern.url.indexOf('://') + 3);
    pattern.url = pattern.url.replace(prot_auto, prot_user);
  }

  return {
    url: url,
    full_url: pattern.url,
    autocomplete: autocomplete,
    urlbar: urlbarCompleted,
    selectionStart: selectionStart,
    highlight: highlight
  };
};
/* eslint-enable */

function setPopupWidth(popup, urlBar) {
  const width = urlBar.getBoundingClientRect().width;
  popup.setAttribute('width', width > 500 ? width : 500);
}

function initPopup(popup, urlbar, win) {
  // patch this method to avoid any caching FF might do for components.xml
  popup._appendCurrentResult = () => { };

  popup._openAutocompletePopup = function (aInput) {
    this.mInput = aInput;
    this._invalidate();

    const attachToElement = win.document.querySelector('#nav-bar');

    popup.setAttribute('height', 0);
    popup.setAttribute('width', 0);

    this.openPopup(attachToElement, 'after_start', 0, 0, false, true);
  }.bind(popup);

  // set initial width of the popup equal with the width of the urlbar
  setPopupWidth(popup, urlbar);
}

const STYLESHEET_URL = 'chrome://cliqz/content/static/styles/styles.css';

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

    syncUrlbarValue: () => {
      this.urlbar.value = this.urlbar.mInputField.value;
    },
  };

  /**
  * @class Window
  * @constructor
  */
  constructor(settings) {
    super(settings);

    this.dropdown = inject.module('dropdown');
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
    if (!this.window.locationbar.visible) return Promise.resolve();

    console.log('UI window init');

    // create a new panel for cliqz to avoid inconsistencies at FF startup
    const document = this.window.document;

    addStylesheet(this.window.document, STYLESHEET_URL);

    this._autocompletesearch = this.urlbar.getAttribute('autocompletesearch');
    this.urlbar.setAttribute('autocompletesearch', ACproviderName);

    return this.dropdown.windowAction(this.window, 'init')
      .then(() => {
        this.window.CLIQZ.Core.urlbar = this.urlbar;
        this.window.CLIQZ.settings = this.settings;

        this.window.CLIQZ.UI.autocompleteQuery = this.autocompleteQuery.bind(this);

        this.urlbar.setAttribute('pastetimeout', 0);

        const popup = document.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'panel');
        this.popup = popup;
        this.popup.oneOffSearchButtons = {
          maybeRecordTelemetry() { return false; }
        };
        this.window.CLIQZ.Core.popup = this.popup;
        popup.setAttribute('type', 'autocomplete-richlistbox');
        popup.setAttribute('noautofocus', 'true');
        popup.setAttribute('id', 'PopupAutoCompleteRichResultCliqz');
        this.elems.push(popup);
        document.getElementById('PopupAutoCompleteRichResult').parentElement.appendChild(popup);
        initPopup(this.popup, this.urlbar, this.window);

        this.window.CLIQZ.UI.showDebug = utils.getPref('showQueryDebug', false);

        this._autocompletepopup = this.urlbar.getAttribute('autocompletepopup');
        this.urlbar.setAttribute('autocompletepopup', 'PopupAutoCompleteRichResultCliqz');

        Object.keys(this.urlbarEventHandlers).forEach(function (ev) {
          this.urlbar.addEventListener(ev, this.urlbarEventHandlers[ev]);
        }.bind(this));

        // mock default FF function
        this.popup.enableOneOffSearches = function () {};

        // make CMD/CTRL + K equal with CMD/CTRL + L
        this.searchShortcutElements = this.window.document.getElementById('mainKeyset').querySelectorAll('#key_search, #key_search2');
        [].forEach.call(this.searchShortcutElements, (item) => {
          item.setAttribute('original_command', item.getAttribute('command'));
          item.setAttribute('command', 'Browser:OpenLocation');
        });

      // Add search history dropdown
      }).then(() => {
        this.reloadUrlbar();
        this.initialized = true;

        this.goButton = attachGoButton(this.window);

        this.applyAdditionalThemeStyles();
      });
  }

  autocompleteQuery(firstResult, firstTitle) {
    const results = [];
    const urlBar = this.window.gURLBar;
    firstResult = utils.cleanMozillaActions(firstResult)[1];

    if (urlBar.selectionStart !== urlBar.selectionEnd) {
      // TODO: temp fix for flickering,
      // need to make it compatible with auto suggestion
      urlBar.mInputField.value =
        urlBar.mInputField.value.slice(0, urlBar.selectionStart) +
        urlBar.mInputField.value.slice(urlBar.selectionEnd);
    }

    // try to update misspelings like ',' or '-'
    if (urlBar.selectionStart === urlBar.value.length) {
      if (this.cleanUrlBarValue(urlBar.value).toLowerCase() !== urlBar.value.toLowerCase()) {
        urlBar.mInputField.value = this.cleanUrlBarValue(urlBar.value).toLowerCase();
      }
    }

    // Use first entry if there are no patterns
    if (
      results.length === 0 ||
      utils.generalizeUrl(firstResult) !== utils.generalizeUrl(results[0].url)
    ) {
      const newResult = {};
      newResult.url = firstResult;
      newResult.title = firstTitle;
      newResult.query = [];
      results.unshift(newResult);
    }
    // FIXME: we get [[]] here for dropdown module
    if (!utils.isUrl(results[0].url)) return false;

    const historyClusterAutocomplete = autocompleteTerm(urlBar.mInputField.value, results[0], true);

    // No autocomplete
    if (
      !historyClusterAutocomplete.autocomplete ||
      !utils.getPref('browser.urlbar.autoFill', false, '') // user has disabled autocomplete
    ) {
      return false;
    }

    urlBar.mInputField.value = historyClusterAutocomplete.urlbar;

    urlBar.setSelectionRange(
      historyClusterAutocomplete.selectionStart,
      urlBar.mInputField.value.length
    );

    return true;
  }

  cleanUrlBarValue(value = '') {
    const val = value || '';
    const cleanParts = utils.cleanUrlProtocol(val, false).split('/');
    const host = cleanParts[0];
    let pathLength = 0;
    const SYMBOLS = /,|\./g;
    // any string, which starts with 'www' and then has any number of group:
    // '.' or ',' and at least one symbol [a-zA-Z0-9_]
    const hostTemplate = /^www((\.|,)\w[\w-]*)+$/;

    if (cleanParts.length > 1) {
      pathLength = (`/${cleanParts.slice(1).join('/')}`).length;
    }

    if (hostTemplate.test(host)) {
      // replace only issues in the host name, not ever in the path
      return val.substr(0, val.length - pathLength).replace(SYMBOLS, '.') +
        (pathLength ? val.substr(-pathLength) : '');
    }
    return val;
  }

  /**
  * triggers component reload at install/uninstall
  * @method reloadUrlbar
  */
  reloadUrlbar() {
    const el = this.urlbar;
    const oldVal = el.value;
    const hadFocus = el.focused;
    const popup = this.window.gURLBar.popup;

    const onFocus = () => {
      el.removeEventListener('focus', onFocus);

      if (this.urlbar.getAttribute('autocompletesearch').indexOf(ACproviderName) === -1) {
        return;
      }

      // close the old popup if it is open
      popup.closePopup();

      this.window.CLIQZ.Core.popup = this.popup;

      // redo search query
      if (oldVal) {
        inject.module('core').action('queryCliqz', oldVal);
      }
    };

    if (el && el.parentNode) {
      el.blur();
      el.parentNode.insertBefore(el, el.nextSibling);
      el.value = oldVal;

      if (hadFocus) {
        el.addEventListener('focus', onFocus);
        el.focus();
      }
    }
  }

  applyAdditionalThemeStyles() {
    const urlbar = this.urlbar;

    this.originalUrlbarPlaceholder = urlbar.mInputField.placeholder;

    urlbar.style.maxWidth = '100%';
    urlbar.style.margin = '0px 0px';

    if (this.settings.id !== 'funnelcake@cliqz.com' && this.settings.id !== 'description_test@cliqz.com') {
      urlbar.mInputField.placeholder = utils.getLocalizedString('freshtab_urlbar_placeholder');
    }
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

    this.urlbar.setAttribute('autocompletesearch', this._autocompletesearch);

    if (this.popupHideEvent) {
      this.popupHideEvent.unsubscribe();
      this.popupHideEvent = undefined;
    }

    if (this.clickOnUrlEvent) {
      this.clickOnUrlEvent.unsubscribe();
      this.clickOnUrlEvent = undefined;
    }

    this.urlbar.setAttribute('autocompletepopup', this._autocompletepopup);

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
