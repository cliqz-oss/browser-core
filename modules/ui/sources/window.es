import { utils } from "core/cliqz";
import autocomplete from "autocomplete/autocomplete";
import CliqzHandlebars from "core/templates";
import CliqzEvents from "core/events";
import SearchHistory from "./search-history";
import { addStylesheet, removeStylesheet } from "../core/helpers/stylesheet";
import System from 'system';
import prefs from "core/prefs";
import placesUtils from 'platform/places-utils';


function getPopupDimensions(urlbar, win) {
  var urlbarRect = urlbar.getBoundingClientRect();
  // x,y are the distance from the topleft of the popup to urlbar.
  // This function is also used when calculating mouse position on click event (in UI.js).
  // If you change something here, please make sure this calculation also works as expected.
  if (utils.dropDownStyle === 'simple') {
    return {
      width: win.innerWidth,
      x: -1 * (urlbarRect.left || urlbarRect.x || 0),
      y: 0
    }
  } else {
    return {
      width: Math.max(urlbarRect.width || 0, 500),
      x: 0,
      y: 0
    }
  }
}

function patchFFPopup(popup) {
  // The FF popup has a bug that causes misalignment of elements with cliqz results
  // (or any provider that needs to render results more than once per query).
  popup.__appendCurrentResult = popup._appendCurrentResult.bind(popup);
  popup._appendCurrentResult = (invalidationReason) => {
    popup.__appendCurrentResult(invalidationReason);

    for (let i = 0; i < popup._matchCount; i++) {
      var item = popup.richlistbox.childNodes[i];
      // Original implementation fails to reference the right item when adjusting the position of the results
      // https://github.com/mozilla/gecko-dev/blob/master/toolkit/content/widgets/autocomplete.xml#L1377
      setTimeout((item) => {
        let changed = item.adjustSiteIconStart(this._siteIconStart);
        if (changed) {
          item.handleOverUnderflow();
        }
      }, 0, item);
    }

    const firstUIResult = popup.richlistbox.childNodes[0];
    const firstResult = {
      url: null,
      title: null,
    };

    if (firstUIResult) {
      firstResult.url = firstUIResult.getAttribute('url');
      firstResult.title = firstUIResult.getAttribute('title');
    }

    if(firstResult && firstResult.url){
      this.autocompleteQuery(
        utils.cleanMozillaActions(firstResult.url)[1],
        firstResult.title
      );
    }
  };
}

function unPatchFFPopup(popup) {
  // remove the patch at unload
  if(popup.__appendCurrentResult !== undefined){
    popup._appendCurrentResult = popup.__appendCurrentResult;
    delete popup.__appendCurrentResult;
  }
}

function initPopup(popup, urlbar, win) {
  //patch this method to avoid any caching FF might do for components.xml
  popup._appendCurrentResult = function(){
    if(popup.mInput){
      //try to break the call stack which cause 'too much recursion' exception on linux systems
      utils.setTimeout(win.CLIQZ.UI.handleResults.bind(win), 0);
    }
  };

  popup._openAutocompletePopup = function(aInput, aElement){
    const lr = autocomplete.lastResult;
    if(lr && lr.searchString != aInput.value && aInput.value == '') {
      return;
    }

    if (!autocomplete.isPopupOpen) {
      this.mInput = aInput;
      this._invalidate();
      const popupDimensions = getPopupDimensions(aElement, win);
      this.setAttribute("width", popupDimensions.width);
      win.document.getElementById('cliqz-popup').style.width = `${popupDimensions.width}px`;
      this.openPopup(aElement, "after_start", popupDimensions.x, popupDimensions.y, false, true);
    }
  }.bind(popup);

  // set initial width of the popup equal with the width of the urlbar
  setPopupWidth(popup, urlbar);
}

function setPopupWidth(popup, urlBar){
  var width = urlBar.getBoundingClientRect().width;
  popup.setAttribute("width", width > 500 ? width : 500);
}

const STYLESHEET_URL = 'chrome://cliqz/content/static/styles/styles.css';

/**
  @namespace ui
*/
export default class {

  /**
  * @class Window
  * @constructor
  */
  constructor(settings) {
    this.elems = [];
    this.settings = settings.settings;
    this.window = settings.window;
    this.urlbar = this.window.document.getElementById('urlbar');
    this.urlbarGoClick = this.urlbarGoClick.bind(this);
    this.hidePopup = this.hidePopup.bind(this);
    this.initialized = false;
    this.actions = {
      updatePopupStyle: () => {
        if (!this.popup) {
          return;
        }
        const style = utils.dropDownStyle;
        const minHeight = style === 'simple' ? '0px' : null;
        this.popup.style.minHeight = minHeight;
        if (this.popup.cliqzBox) {
          this.window.CLIQZ.UI.main(this.popup.cliqzBox);
        }
      },
      updateUrlBar: () => { this.reloadUrlbar(this.urlbar); }
    },
    this.urlbarEventHandlers = {}
    Object.keys(urlbarEventHandlers).forEach( ev => {
      this.urlbarEventHandlers[ev] = urlbarEventHandlers[ev].bind(this)
    })

    this.popupEventHandlers = {}
    Object.keys(popupEventHandlers).forEach( ev => {
      this.popupEventHandlers[ev] = popupEventHandlers[ev].bind(this)
    })

    this.firefoxUrlbarEventHandlers = {};
    Object.keys(firefoxUrlbarEventHandlers).forEach(ev => {
      this.firefoxUrlbarEventHandlers[ev] = firefoxUrlbarEventHandlers[ev].bind(this);
    });

    this.firefoxPopupEventHandlers = {};
    Object.keys(firefoxPopupEventHandlers).forEach(ev => {
      this.firefoxPopupEventHandlers[ev] = firefoxPopupEventHandlers[ev].bind(this);
    });
  }

  /**
  * @method init
  */
  init() {

    // do not initialize the UI if the user decided to turn off search
    if(utils.getPref("cliqz_core_disabled", false)) return;
    utils.dropDownStyle = prefs.get('dropDownStyle', '');
    this.applyAdditionalThemeStyles(this.urlbar);
    Services.scriptloader.loadSubScript(System.baseURL + 'ui/UI.js', this.window);
    this.window.CLIQZ.UI.preinit(autocomplete, CliqzHandlebars, CliqzEvents, placesUtils);
    this.window.CLIQZ.UI.getPopupDimensions = getPopupDimensions;
    Services.scriptloader.loadSubScript(System.baseURL + 'ui/ContextMenu.js', this.window);
    //create a new panel for cliqz to avoid inconsistencies at FF startup
    var document = this.window.document;


    addStylesheet(this.window.document, STYLESHEET_URL);

    this.urlbarPrefs = Components.classes['@mozilla.org/preferences-service;1']
        .getService(Components.interfaces.nsIPrefService).getBranch('browser.urlbar.');

    this.window.CLIQZ.Core.urlbar = this.urlbar;
    this.window.CLIQZ.settings = this.settings;


    CliqzEvents.sub('ui:popup_hide', this.hidePopup);

    this.window.CLIQZ.UI.window = this;
    this.window.CLIQZ.UI.autocompleteQuery = this.autocompleteQuery.bind(this);

    this._autocompletesearch = this.urlbar.getAttribute('autocompletesearch');
    this.urlbar.setAttribute('autocompletesearch', 'cliqz-results');
    this.urlbar.setAttribute('pastetimeout', 0)



    var urlBarGo = document.getElementById('urlbar-go-button');
    this._urlbarGoButtonClick = urlBarGo.getAttribute('onclick');
    //we somehow break default FF -> on goclick the autocomplete doesnt get considered
    urlBarGo.setAttribute('onclick', "CLIQZ.UI.window.urlbarGoClick(); " + this._urlbarGoButtonClick);

    if (utils.dropDownStyle !== 'ff') {
      var popup = document.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "panel");
      popup.setAttribute("type", 'autocomplete-richlistbox');
      popup.setAttribute("noautofocus", 'true');
      popup.setAttribute("id", 'PopupAutoCompleteRichResultCliqz');
      this.elems.push(popup);
      document.getElementById('PopupAutoCompleteRichResult').parentElement.appendChild(popup);
      this.popup = popup;
      initPopup(this.popup, this.urlbar, this.window);
      this.window.CLIQZ.Core.popup = this.popup;
      this.window.CLIQZ.UI.init(this.urlbar);
      this._autocompletepopup = this.urlbar.getAttribute('autocompletepopup');
      this.urlbar.setAttribute('autocompletepopup', /*'PopupAutoComplete'*/ 'PopupAutoCompleteRichResultCliqz');

      this.popup.addEventListener('popuphiding', this.popupEventHandlers.popupClose);
      this.popup.addEventListener('popupshowing', this.popupEventHandlers.popupOpen);

      Object.keys(this.urlbarEventHandlers).forEach(function(ev) {
        this.urlbar.addEventListener(ev, this.urlbarEventHandlers[ev]);

      }.bind(this));

      //mock default FF function
      this.popup.enableOneOffSearches = function() {}



      // make CMD/CTRL + K equal with CMD/CTRL + L
      this.searchShortcutElements = this.window.document.getElementById('mainKeyset').querySelectorAll('#key_search, #key_search2');
      [].forEach.call(this.searchShortcutElements, function (item) {
        item.setAttribute('original_command', item.getAttribute('command'))
        item.setAttribute('command', 'Browser:OpenLocation')
      });

      this.tabChange = SearchHistory.tabChanged.bind(SearchHistory);
      this.window.gBrowser.tabContainer.addEventListener("TabSelect",
        this.tabChange, false);

      this.tabRemoved = SearchHistory.tabRemoved.bind(SearchHistory);
      this.window.gBrowser.tabContainer.addEventListener("TabClose",
        this.tabRemoved, false);
      this.actions.updatePopupStyle();
      this.reloadUrlbar(this.urlbar);
      // Add search history dropdown
      var searchHistoryContainer = SearchHistory.insertBeforeElement(this.window);
      this.elems.push(searchHistoryContainer);
    }
    // FF UI
    else {
      this.popup = this.window.document.getElementById(this.urlbar.getAttribute('autocompletepopup'));
      patchFFPopup.call(this, this.popup);
      this.window.CLIQZ.Core.popup = this.popup;
      if (!this.urlbar.popup) {
        this.urlbar.popup = this.popup;
      }

      this.urlbarGoButton = this.window.document.getElementById('urlbar-go-button');

      Object.keys(this.firefoxUrlbarEventHandlers).forEach(ev => {
        this.urlbar.addEventListener(ev, this.firefoxUrlbarEventHandlers[ev]);
      }.bind(this));

      Object.keys(this.firefoxPopupEventHandlers).forEach(ev => {
        this.popup.addEventListener(ev, this.firefoxPopupEventHandlers[ev]);
      }.bind(this));

      this.firefoxUrlbarGoButtonHandler = this.firefoxUrlbarGoButtonHandler.bind(this);
      this.urlbarGoButton.addEventListener('click', this.firefoxUrlbarGoButtonHandler);
    }
    this.initialized = true;
  }

  firefoxUrlbarGoButtonHandler(event) {
    utils.telemetry({
      type: 'activity',
      position_type: ['inbar_' + (utils.isUrl(this.urlbar.value) ? 'url' : 'query')],
      autocompleted: autocomplete.lastAutocompleteActive,
      action: 'urlbar_go_click',
    });
  }

  firefoxGetResultSelection() {
    const resultList = this.popup.richlistbox;
    const selectedItem = resultList.children.find(child => child.getAttribute('selected'));
    const selectedIndex = resultList.children.indexOf(selectedItem);
    return {selectedItem, selectedIndex};
  }

  firefoxLogUIEvent(signal, selectedItem) {
    const url = utils.cleanMozillaActions(
      (selectedItem && (selectedItem.getAttribute('href') || selectedItem.getAttribute('url'))) || this.urlbar.value || ''
    )[1];

    // TODO: get once and store in object
    const urlbar = this.window.document.getElementById('urlbar');
    const popup = this.window.document.getElementById(urlbar.getAttribute('autocompletepopup'));
    const resultList = popup.richlistbox;
    const lastResult = autocomplete.lastResult;
    let resultOrder = [];
    if (lastResult && lastResult._results) {
      resultOrder = autocomplete.prepareResultOrder(lastResult._results);
    }
    const resultIndex = resultList.children.findIndex(child => child.getAttribute('selected'));
    Object.assign(signal, {
      clustering_override: !!(lastResult && lastResult._results[0] && lastResult._results[0].override),
      current_position: resultIndex,
      display_time: autocomplete.lastDisplayTime ?
        (new Date()).getTime() - autocomplete.lastDisplayTime : null,
      local_source: selectedItem ? selectedItem.getAttribute('type') : null,
      position_type: signal.position_type || (resultIndex < resultOrder.length ? resultOrder[resultIndex] : []),
      query_length: autocomplete.lastSearch.length,
      reaction_time: (new Date()).getTime() - autocomplete.lastQueryTime,
      result_order: resultOrder,
      search: utils.isSearch(url),
      type: 'activity',
      v: 2.2,
    });
    utils.telemetry(signal);
  }

  autocompleteQuery(firstResult, firstTitle) {
      var urlBar = this.urlbar;
      if (urlBar.selectionStart !== urlBar.selectionEnd) {
          // TODO: temp fix for flickering,
          // need to make it compatible with auto suggestion
          urlBar.mInputField.value = urlBar.mInputField.value.slice(0, urlBar.selectionStart);
      }
      if(autocomplete._lastKey  === this.window.KeyEvent.DOM_VK_BACK_SPACE ||
         autocomplete._lastKey  === this.window.KeyEvent.DOM_VK_DELETE){
          if (autocomplete.selectAutocomplete) {
              this.window.CLIQZ.UI.selectAutocomplete();
          }
          autocomplete.selectAutocomplete = false;
          return;
      }
      autocomplete.selectAutocomplete = false;

      // History cluster does not have a url attribute, therefore firstResult is null
      var lastPattern = autocomplete.lastPattern,
          fRes = lastPattern ? lastPattern.filteredResults() : null;
      if(!firstResult && lastPattern && fRes.length > 1)
        firstResult = fRes[0].url;

      var r, endPoint = urlBar.value.length;
      var lastPattern = autocomplete.lastPattern;
      var results = lastPattern ? fRes : [];

      // try to update misspelings like ',' or '-'
      if (this.cleanUrlBarValue(urlBar.value).toLowerCase() != urlBar.value.toLowerCase()) {
          urlBar.mInputField.value = this.cleanUrlBarValue(urlBar.value).toLowerCase();
      }
      // Use first entry if there are no patterns
      if (results.length === 0 || lastPattern.query != urlBar.value ||
        utils.generalizeUrl(firstResult) != utils.generalizeUrl(results[0].url)) {
          var newResult = [];
          newResult.url = firstResult;
          newResult.title = firstTitle;
          newResult.query = [];
          results.unshift(newResult);
      }
      if (!utils.isUrl(results[0].url)) return;

      // Detect autocomplete
      var historyClusterAutocomplete = autocomplete.CliqzHistoryCluster.autocompleteTerm(urlBar.value, results[0], true);

      // No autocomplete
      if(!historyClusterAutocomplete.autocomplete ||
         !utils.getPref("browser.urlbar.autoFill", false, '')){ // user has disabled autocomplete
          this.window.CLIQZ.UI.clearAutocomplete();
          autocomplete.lastAutocomplete = null;
          autocomplete.lastAutocompleteType = null;
          autocomplete.selectAutocomplete = false;
          return;
      }

      // Apply autocomplete
      autocomplete.lastAutocompleteType = historyClusterAutocomplete.type;
      autocomplete.lastAutocompleteLength = historyClusterAutocomplete.full_url.length;
      autocomplete.lastAutocompleteUrlbar = historyClusterAutocomplete.urlbar;
      autocomplete.lastAutocompleteSelectionStart = historyClusterAutocomplete.selectionStart;
      urlBar.mInputField.value = historyClusterAutocomplete.urlbar;
      urlBar.setSelectionRange(historyClusterAutocomplete.selectionStart, urlBar.mInputField.value.length);
      autocomplete.lastAutocomplete = historyClusterAutocomplete.full_url;
      this.window.CLIQZ.UI.cursor = historyClusterAutocomplete.selectionStart;

      // Highlight first entry in dropdown
      if (historyClusterAutocomplete.highlight) {
          autocomplete.selectAutocomplete = true;
          this.window.CLIQZ.UI.selectAutocomplete();
      }
  }

  cleanUrlBarValue(val) {
      var cleanParts = utils.cleanUrlProtocol(val, false).split('/'),
          host = cleanParts[0],
          pathLength = 0,
          SYMBOLS = /,|\./g;

      if(cleanParts.length > 1){
          pathLength = ('/' + cleanParts.slice(1).join('/')).length;
      }
      if(host.indexOf('www') == 0 && host.length > 4){
          // only fix symbols in host
          if(SYMBOLS.test(host[3]) && host[4] != ' ')
              // replace only issues in the host name, not ever in the path
              return val.substr(0, val.length - pathLength).replace(SYMBOLS, '.') +
                     (pathLength? val.substr(-pathLength): '');
      }
      return val;
  }
  /**
  * triggers component reload at install/uninstall
  * @method reloadUrlbar
  */
  reloadUrlbar (el) {
    var oldVal = el.value;
    if(el && el.parentNode) {
      el.parentNode.insertBefore(el, el.nextSibling);
      el.value = oldVal;
    }
    this.applyAdditionalThemeStyles(el);
  }

  applyAdditionalThemeStyles() {
    var fb = this.window.document.getElementById('forward-button'),
        bb = this.window.document.getElementById('back-button'),
        urlbar = this.urlbar;
    switch (utils.dropDownStyle) {
      case 'simple':
      case 'ff':
        utils.log(utils.dropDownStyle, '========= dropDownStyle CASE ff simple ========');
        urlbar.style.maxWidth = '100%';
        urlbar.style.margin = '0px 0px';
        fb.style.border = 'none';
        fb.style.borderRight = '0px';
        bb.style.border = 'none';
        bb.style.border = '1px solid #e1e1e1';
        break;
      default:
        utils.log(utils.dropDownStyle, '========= dropDownStyle CASE default ========');
        urlbar.style.maxWidth = '800px';
        urlbar.style.margin = '0 2.5em !important';
        fb.style.border = 'none';
        fb.style.borderRight = '1px solid #e1e1e1';
        bb.style.border = 'none';
        bb.style.border = '1px solid #e1e1e1';
        break;
    }
  }

  /**
  * @method urlbarGoClick
  */
  urlbarGoClick (){
    //we somehow break default FF -> on goclick the autocomplete doesnt get considered
    this.urlbar.value = this.urlbar.mInputField.value;

    var action = {
      type: 'activity',
      position_type: ['inbar_' + (utils.isUrl(this.urlbar.mInputField.value)? 'url': 'query')],
      autocompleted: autocomplete.lastAutocompleteActive,
      action: 'urlbar_go_click'
    };
    utils.telemetry(action);
  }

  popupEvent(open) {
    var action = {
      type: 'activity',
      action: 'dropdown_' + (open ? 'open' : 'close')
    };

    if (open) {
      action['width'] = this.popup ?
        Math.round(this.popup.width) : 0;
    }

    utils.telemetry(action);
  }

  hidePopup() {
    this.window.CLIQZ.Core.popup.hidePopup();
  }

  urlbarEvent(ev) {
    var action = {
      type: 'activity',
      action: 'urlbar_' + ev
    };

    CliqzEvents.pub('core:urlbar_' + ev);
    utils.telemetry(action);
  }

  unload() {
    if(!this.initialized) return;

    removeStylesheet(this.window.document, STYLESHEET_URL);


    this.elems.forEach(item => {
      item && item.parentNode && item.parentNode.removeChild(item);
    });
    this.urlbar.setAttribute('autocompletesearch', this._autocompletesearch);
    CliqzEvents.un_sub('ui:popup_hide', this.hidePopup);


    if (utils.dropDownStyle !== 'ff') {
      this.window.CLIQZ.UI.unload();
      this.urlbar.setAttribute('autocompletepopup', this._autocompletepopup);

      this.popup.removeEventListener('popuphiding', this.popupEventHandlers.popupClose);
      this.popup.removeEventListener('popupshowing', this.popupEventHandlers.popupOpen);
      Object.keys(this.urlbarEventHandlers).forEach(function(ev) {
        this.urlbar.removeEventListener(ev, this.urlbarEventHandlers[ev]);
      }.bind(this));
      // revert onclick handler
      [].forEach.call(this.searchShortcutElements, function (item) {
        item.setAttribute('command', item.getAttribute('original_command'))
      });
      this.window.gBrowser.tabContainer.removeEventListener("TabSelect",
        this.tabChange, false);
      this.window.gBrowser.tabContainer.removeEventListener("TabClose",
        this.tabRemoved, false);
      var urlBarGo = this.window.document.getElementById('urlbar-go-button');
      urlBarGo.setAttribute('onclick', this._urlbarGoButtonClick);
    } else {
      Object.keys(this.firefoxUrlbarEventHandlers).forEach(ev => {
        this.urlbar.removeEventListener(ev, this.firefoxUrlbarEventHandlers[ev]);
      }.bind(this));

      Object.keys(this.firefoxPopupEventHandlers).forEach(ev => {
        this.popup.removeEventListener(ev, this.firefoxPopupEventHandlers[ev]);
      }.bind(this));

      this.urlbarGoButton.removeEventListener('click', this.firefoxUrlbarGoButtonHandler);
    }

    unPatchFFPopup(this.popup);

    var searchContainer = this.window.document.getElementById('search-container');
    if(this._searchContainer){
      searchContainer.setAttribute('class', this._searchContainer);
    }
    this.reloadUrlbar(this.urlbar);

    delete this.window.CLIQZ.UI;
  }
}

const firefoxUrlbarEventHandlers = {
  focus: function (event) {
    autocomplete.lastFocusTime = Date.now();
    utils.setSearchSession(utils.rand(32));
    this.urlbarEvent('focus');
  },
  blur: function (event) {
    autocomplete.lastFocusTime = null;
    autocomplete.isPopupOpen = false;
    this.window.CLIQZ.UI.sessionEnd();
    this.urlbarEvent('blur');
  },
  keyup: function (event) {
    const keyEvent = this.window.KeyEvent;
    switch (event.keyCode) {
      case keyEvent.DOM_VK_UP:
      case keyEvent.DOM_VK_DOWN:
        const {selectedIndex} = this.firefoxGetResultSelection();
        utils.telemetry({
          type: 'activity',
          action: 'arrow_key',
          current_position: selectedIndex,
        });
        break;
    }
  },
  keydown: function (event) {
    const keyEvent = this.window.KeyEvent;
    autocomplete._lastKey = event.keyCode;
    switch (event.keyCode) {
      case keyEvent.DOM_VK_BACK_SPACE:
      case keyEvent.DOM_VK_DELETE:
        utils.telemetry({
          type: 'activity',
          action: 'keystroke_del',
        });
        break;
    }

    if (event.keyCode !== keyEvent.DOM_VK_RETURN) {
      return;
    }

    const urlbarTime = autocomplete.lastFocusTime ? (new Date()).getTime() - autocomplete.lastFocusTime : null;
    const isNewTab = event.metaKey || event.ctrlKey;
    const {selectedItem, selectedIndex} = this.firefoxGetResultSelection();

    let input = this.urlbar.value;
    let cleanInput = input;
    const lastAutocomplete = autocomplete.lastAutocomplete ? autocomplete.lastAutocomplete : '';
    // Check if protocols match
    if (input.indexOf('://') === -1 && lastAutocomplete.indexOf('://') !== -1) {
      if (utils.generalizeUrl(lastAutocomplete) === utils.generalizeUrl(input)) {
        input = lastAutocomplete;
      }
    }
    // Check for login url
    if (input.indexOf('@') !== -1 && input.split('@')[0].indexOf(':') !== -1) {
      if (input.indexOf('://') === -1) {
        input = 'http://' + input;
      }
      const login = input.substr(input.indexOf('://') + 3, input.indexOf('@') - input.indexOf('://') - 2);
      cleanInput = input.replace(login, '');
    }

    const signal = {
      action: 'result_enter',
      urlbar_time: urlbarTime,
      new_tab: isNewTab,
    };

    // Autocomplete
    if (utils.generalizeUrl(lastAutocomplete) === utils.generalizeUrl(input) && urlbar.selectionStart !== 0 && urlbar.selectionStart !== urlbar.selectionEnd) {
      Object.assign(signal, {
        autocompleted: autocomplete.lastAutocompleteActive,
        autocompleted_length: autocomplete.lastAutocompleteLength,
        current_position: -1,
        position_type: ['inbar_url'],
      });
    }
    // Google
    else if ((!utils.isUrl(input) && !utils.isUrl(cleanInput)) || input.endsWith('.')) {
      Object.assign(signal, {
        current_position: -1,
        position_type: ['inbar_query'],
      });
    }
    // Typed
    else if (!selectedItem) {
      Object.assign(signal, {
        current_position: -1,
        position_type: ['inbar_url'],
      });
    }
    // Result
    else {
      Object.assign(signal, {
        current_position: selectedIndex,
      });
    }
    this.firefoxLogUIEvent(signal, selectedItem);
  },
  paste: function (event) {
    // wait for the value to change
    this.window.setTimeout(function() {
      // ensure the lastSearch value is always correct although paste event has 1 second throttle time.
      autocomplete.lastSearch = event.target.value;
      utils.telemetry({
        type: 'activity',
        action: 'paste',
        current_length: event.target.value.length,
      });
    }, 0);
  },
}

const firefoxPopupEventHandlers = {
  click: function (event) {
    if (!(event.button === 0 || event.button === 1)) {
      return;
    }

    const isNewTab = event.metaKey || event.button === 1 || event.ctrlKey || false;
    const clickCoordinates = [
      event.offsetX,
      event.offsetY,
      this.popup.clientWidth,
      this.popup.clientHeight,
    ];

    let target = event.originalTarget;
    let selectedItem = null;
    let extra = null;
    const extraMapping = {
      'title-text': 'title',
      'url-text': 'url',
      'site-icon': 'icon',
    };

    while (target && !selectedItem) {
      extra = extra || target.getAttribute('anonid') || null;
      if (target.tagName === 'richlistitem') {
        selectedItem = target;
      }
      target = target.parentElement;
    }
    extra = extraMapping[extra] || extra;

    if (!selectedItem) {
      return;
    }

    const signal = {
      action: 'result_click',
      extra,
      mouse: clickCoordinates,
      new_tab: isNewTab,
    };
    this.firefoxLogUIEvent(signal, selectedItem);
  },
  popupshowing: function (event) {
    autocomplete.isPopupOpen = true;
    this.popupEvent(true);
    this.window.CLIQZ.UI.popupClosed = false;
  },
  popuphiding: function (event) {
    autocomplete.isPopupOpen = false;
    autocomplete.markResultsDone(null);
    this.popupEvent(false);
    this.window.CLIQZ.UI.popupClosed = true;
  },
}

const urlbarEventHandlers = {
  /**
  * Urlbar focus event
  * @event focus
  */
  focus: function(ev) {
    //try to 'heat up' the connection
    utils.pingCliqzResults();

    autocomplete.lastFocusTime = Date.now();
    SearchHistory.hideLastQuery(this.window);
    this.triggerLastQ = false;
    utils.setSearchSession(utils.rand(32));
    this.urlbarEvent('focus');

    if(utils.getPref('newUrlFocus') == true && this.urlbar.value.trim().length > 0) {
      var urlbar = this.urlbar.mInputField.value;
      var search = urlbar;
      if (utils.isUrl(search)) {
        search = search.replace("www.", "");
        if(search.indexOf("://") != -1) search = search.substr(search.indexOf("://")+3);
        if(search.indexOf("/") != -1) search = search.split("/")[0];
      }
      this.urlbar.mInputField.setUserInput(search);
      this.popup._openAutocompletePopup(this.urlbar, this.urlbar);
      this.urlbar.mInputField.value = urlbar;
    }
  },
  /**
  * Urlbar blur event
  * @event blur
  * @param ev
  */
  blur: function(ev) {
    if (autocomplete.spellCheck){
      autocomplete.spellCheck.resetState();
    }
    // reset this flag as it can block the dropdown from opening
    autocomplete.isPopupOpen = false;

    if(this.window.CLIQZ.Core.triggerLastQ)
        SearchHistory.lastQuery(this.window);

    this.urlbarEvent('blur');

    autocomplete.lastFocusTime = null;
    this.window.CLIQZ.UI.sessionEnd();
  },
  /**
  * Urlbar keypress event
  * @event keypress
  * @param ev
  */
  keypress: function(ev) {
    if (!ev.ctrlKey && !ev.altKey && !ev.metaKey) {
      var urlbar = this.urlbar;
      if (urlbar.mInputField.selectionEnd !== urlbar.mInputField.selectionStart &&
          urlbar.mInputField.value[urlbar.mInputField.selectionStart] == String.fromCharCode(ev.charCode)) {
        // prevent the redraw in urlbar but send the search signal
        var query = urlbar.value,
            old = urlbar.mInputField.value,
            start = urlbar.mInputField.selectionStart;
        query = query.slice(0, urlbar.selectionStart) + String.fromCharCode(ev.charCode);
        urlbar.mInputField.setUserInput(query);
        urlbar.mInputField.value = old;
        urlbar.mInputField.setSelectionRange(start+1, urlbar.mInputField.value.length);
        ev.preventDefault();
      }
    }
  },
  /**
  * Urlbar drop event
  * @event drop
  * @param ev
  */
  drop: function(ev){
  var dTypes = ev.dataTransfer.types;
    if (dTypes.indexOf && dTypes.indexOf("text/plain") !== -1 ||
      dTypes.contains && dTypes.contains("text/plain") !== -1) {
      // open dropdown on text drop
      var inputField = this.urlbar.mInputField, val = inputField.value;
      inputField.setUserInput('');
      inputField.setUserInput(val);

      utils.telemetry({
        type: 'activity',
        action: 'textdrop'
      });
    }
  },
  /**
  * Urlbar paste event
  * @event paste
  * @param ev
  */
  paste: function(ev){
    //wait for the value to change
    this.window.setTimeout(function(){
      // ensure the lastSearch value is always correct although paste event has 1 second throttle time.
      autocomplete.lastSearch = ev.target.value;
      utils.telemetry({
        type: 'activity',
        action: 'paste',
        current_length: ev.target.value.length
      });
    }, 0);
  }
};

const popupEventHandlers = {
  /**
  * @event popupOpen
  */
  popupOpen: function(){
    autocomplete.isPopupOpen = true;
    this.popupEvent(true);
    this.window.CLIQZ.UI.popupClosed = false;
  },

  /**
  * @event popupClose
  * @param e
  */
  popupClose: function(e){
    // ensures popup is closed (EX-3819)
    CliqzEvents.pub('ui:popup_hide');
    autocomplete.isPopupOpen = false;
    autocomplete.markResultsDone(null);
    this.popupEvent(false);
    this.window.CLIQZ.UI.popupClosed = true;
  }
};
