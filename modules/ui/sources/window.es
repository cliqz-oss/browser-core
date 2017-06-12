import { utils } from "core/cliqz";
import autocomplete from "autocomplete/autocomplete";
import CliqzHandlebars from "core/templates";
import CliqzEvents from "core/events";
import SearchHistory from "./search-history";
import { addStylesheet, removeStylesheet } from "../core/helpers/stylesheet";
import placesUtils from '../platform/places-utils';
import console from '../core/console';
import prefs from '../core/prefs';
import inject from '../core/kord/inject';
import Background from './background';

const SEARCH_BAR_ID = 'search-container';
const dontHideSearchBar = 'dontHideSearchBar';
// toolbar
const searchBarPosition = 'defaultSearchBarPosition';
// next element in the toolbar
const searchBarPositionNext = 'defaultSearchBarPositionNext';

const ACproviderName = 'cliqz-results';

function restoreSearchBar(win) {
  const toolbarId = utils.getPref(searchBarPosition, '');
  utils.setPref(dontHideSearchBar, false);
  if (toolbarId) { const toolbar = win.document.getElementById(toolbarId);
    if (toolbar) {
      if (toolbar.currentSet.indexOf(SEARCH_BAR_ID) === -1) {
        const next = utils.getPref(searchBarPositionNext, '');
        if (next) {
          const set = toolbar.currentSet.split(',');
          const idx = set.indexOf(next);

          if (idx !== -1) {
            set.splice(idx, 0, SEARCH_BAR_ID);
          } else {
            set.push(SEARCH_BAR_ID);
          }

          toolbar.currentSet = set.join(',');
        } else {
          // no next element, append it to the end
          toolbar.currentSet += `,${SEARCH_BAR_ID}`;
        }
      } else {
        // the user made it visible
        utils.setPref(dontHideSearchBar, true);
      }
    }
  }
}

function getPopupDimensions(urlbar, win) {
  var urlbarRect = urlbar.getBoundingClientRect();
  // x,y are the distance from the topleft of the popup to urlbar.
  return {
    width: win.innerWidth,
    x: -1 * (urlbarRect.left || urlbarRect.x || 0),
    y: 0
  }
}

function tryHideSearchBar(win){
  function getCurrentset(toolbar) {
    return (toolbar.getAttribute("currentset") ||
      toolbar.getAttribute("defaultset")).split(",");
  }

  function $(sel, all){
    return win.document[all ? "querySelectorAll" : "getElementById"](sel);
  }

  if (prefs.get(dontHideSearchBar, false)) {
    return;
  }
  try {
    let toolbar, currentset, idx, next, toolbarID,
      toolbars = $("toolbar", true);

    for (let i = 0; i < toolbars.length; ++i) {
      let tb = toolbars[i];
      currentset = getCurrentset(tb);
      idx = currentset.indexOf(SEARCH_BAR_ID);
      if (idx != -1) {
        //store exact position
        if(currentset.length > idx+1)next = currentset[idx+1];

        currentset.splice(idx, 1);
        currentset = currentset.join(",");
        tb.currentSet = currentset;
        tb.setAttribute("currentset", currentset);
        win.document.persist(tb.id, "currentset");

        toolbarID = tb.id;
        break;
      }
    }

    if(toolbarID){
      prefs.set(searchBarPosition, toolbarID);
    }

    if(next){
      prefs.set(searchBarPositionNext, next);
    }

  } catch(e){
    console.log(e, 'Search bar hiding failed!');
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
      let popupDimensions = getPopupDimensions(aElement, win);
      let attachToElement = aElement;

      attachToElement = win.document.querySelector('#nav-bar');
      popupDimensions = Object.assign(popupDimensions, {
        x: 0,
        y: 0,
      });


      this.setAttribute("width", popupDimensions.width);
      win.document.getElementById('cliqz-popup').style.width = `${popupDimensions.width}px`;
      this.openPopup(attachToElement, "after_start", popupDimensions.x, popupDimensions.y, false, true);
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
    this.dropdown = inject.module('dropdown');
    this.autocompleteModule = inject.module('autocomplete');
    this.elems = [];
    this.settings = settings.settings;
    this.window = settings.window;
    this.urlbar = this.window.document.getElementById('urlbar');
    this.hidePopup = this.hidePopup.bind(this);
    this.initialized = false;
    this.window.CLIQZ.UI = {};
    this.actions = {
      setUrlbarValue: (value, visibleValue) => {
        this.urlbar.value = value;
        this.urlbar.mInputField.value = visibleValue || value;
      },
      syncUrlbarValue: () => {
        this.urlbar.value = this.urlbar.mInputField.value;
      },
      updatePopupStyle: () => {
        if (!this.popup) {
          return;
        }
      },
      updateUrlBar: () => { this.reloadUrlbar(); }
    },
    this.urlbarEventHandlers = {}
    Object.keys(urlbarEventHandlers).forEach( ev => {
      this.urlbarEventHandlers[ev] = urlbarEventHandlers[ev].bind(this)
    })

    this.popupEventHandlers = {}
    Object.keys(popupEventHandlers).forEach( ev => {
      this.popupEventHandlers[ev] = popupEventHandlers[ev].bind(this)
    })
  }

  /**
  * @method init
  */
  init() {
    // do not initialize the UI if locationbar is invisible in this window
    if(!this.window.locationbar.visible) return;

    console.log("UI window init");

    //create a new panel for cliqz to avoid inconsistencies at FF startup
    var document = this.window.document;

    tryHideSearchBar(this.window);

    addStylesheet(this.window.document, STYLESHEET_URL);

    const autocompleteLoadingPromise = this.autocompleteModule.isReady().then( () => {
      // Load autocompletesearch as soon as possible - it is compatible with
      // default firefox and will work with any UI
      this._autocompletesearch = this.urlbar.getAttribute('autocompletesearch');
      this.urlbar.setAttribute('autocompletesearch', ACproviderName);
    });

    let uiLoadingPromise;
    return autocompleteLoadingPromise.then(() => {
      return this.dropdown.windowAction(this.window, 'init');
    }).then(() => {

      this.window.CLIQZ.Core.urlbar = this.urlbar;
      this.window.CLIQZ.settings = this.settings;

      CliqzEvents.sub('ui:popup_hide', this.hidePopup);

      this.window.CLIQZ.UI.autocompleteQuery = this.autocompleteQuery.bind(this);

      this.urlbar.setAttribute('pastetimeout', 0)

      var popup = document.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "panel");
      this.popup = popup;
      this.window.CLIQZ.Core.popup = this.popup;
      popup.setAttribute("type", 'autocomplete-richlistbox');
      popup.setAttribute("noautofocus", 'true');
      popup.setAttribute("id", 'PopupAutoCompleteRichResultCliqz');
      this.elems.push(popup);
      document.getElementById('PopupAutoCompleteRichResult').parentElement.appendChild(popup);
      initPopup(this.popup, this.urlbar, this.window);

      this.window.CLIQZ.UI.showDebug = utils.getPref('showQueryDebug', false);

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
      this.window.gBrowser.tabContainer.addEventListener("TabSelect", this.tabChange, false);

      this.tabRemoved = SearchHistory.tabRemoved.bind(SearchHistory);
      this.window.gBrowser.tabContainer.addEventListener("TabClose", this.tabRemoved, false);
      this.actions.updatePopupStyle();
      // Add search history dropdown
      }).then(() => {
        this.reloadUrlbar();
        this.urlbar.focus();
        this.initialized = true;
        this.elems.push(SearchHistory.insertBeforeElement(this.window));
      });
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
      if(!firstResult && lastPattern && fRes.length > 1) {
        firstResult = fRes[0].url;
      }

      firstResult = utils.cleanMozillaActions(firstResult)[1];

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
      // FIXME: we get [[]] here for dropdown module
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

      return true;
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
  reloadUrlbar() {
    const el = this.urlbar;
    var oldVal = el.value;
    if(el && el.parentNode) {
      el.parentNode.insertBefore(el, el.nextSibling);
      el.value = oldVal;
    }
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

  disable() {

    if(Background.firstWindowDisabled == undefined){
      // we only need to restore it for one window
      Background.firstWindowDisabled = true;
      restoreSearchBar(this.window);
    }
  }

  unload() {
    if(!this.initialized) return;

    removeStylesheet(this.window.document, STYLESHEET_URL);


    this.elems.forEach(item => {
      item && item.parentNode && item.parentNode.removeChild(item);
    });
    this.urlbar.setAttribute('autocompletesearch', this._autocompletesearch);
    CliqzEvents.un_sub('ui:popup_hide', this.hidePopup);

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


    var searchContainer = this.window.document.getElementById('search-container');
    if(this._searchContainer){
      searchContainer.setAttribute('class', this._searchContainer);
    }
    this.reloadUrlbar();

    delete this.window.CLIQZ.UI;
  }
}

const urlbarEventHandlers = {
  /**
  * Urlbar focus event
  * @event focus
  */
  focus: function(ev) {
    if(utils.ACproviderInitialized == undefined){
      // try once to force the initialization of the AC provider
      this.urlbar.blur();
      setTimeout(function(urlbar){ urlbar.focus() }, 0, this.urlbar);
      utils.ACproviderInitialized = true;
      return;
    }

    if(this.urlbar.getAttribute('autocompletesearch').indexOf(ACproviderName) === -1){
      // BUMMER!! Something happened and our AC provider was overriden!
      // trying to set it back while keeping the new value in case CLIQZ
      // gets disabled
      this._autocompletesearch = this.urlbar.getAttribute('autocompletesearch');
      this.urlbar.setAttribute('autocompletesearch', ACproviderName);
      this.reloadUrlbar();
      this.urlbar.blur();
      setTimeout(function(urlbar){ urlbar.focus() }, 0, this.urlbar);
      return;
    }

    //try to 'heat up' the connection
    utils.pingCliqzResults();

    autocomplete.lastFocusTime = Date.now();
    SearchHistory.hideLastQuery(this.window);
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

    // force a dropdown close on urlbar blur
    this.window.CLIQZ.Core.popup.hidePopup();

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
  keydown(ev) {
    autocomplete._lastKey = ev.keyCode;
    let cancel;
    try {
      cancel = this.window.CLIQZ.UI.keyDown(ev);
    } catch(e) {
      console.error(e);
      throw e;
    }
    if (cancel) {
      ev.preventDefault();
      ev.stopImmediatePropagation();
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
  popupOpen: function(e){
    autocomplete.isPopupOpen = true;
    if (e.composedTarget !== this.popup) {
      return;
    }
    this.popupEvent(true);
    this.window.CLIQZ.UI.popupClosed = false;
  },

  /**
  * @event popupClose
  * @param e
  */
  popupClose: function(e){
    autocomplete.markResultsDone(null);
    autocomplete.isPopupOpen = false;
    if (e.composedTarget !== this.popup) {
      return;
    }
    this.popupEvent(false);
    this.window.CLIQZ.UI.popupClosed = true;
  }
};
