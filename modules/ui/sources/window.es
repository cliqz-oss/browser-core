import { utils } from "core/cliqz";
import autocomplete from "autocomplete/autocomplete";
import CliqzHandlebars from "core/templates";
import CliqzEvents from "core/events";
import SearchHistory from "./search-history";
import { addStylesheet, removeStylesheet } from "../core/helpers/stylesheet";
import System from 'system';

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
      setPopupWidth(this, aElement);

      // 0,0 is the distance from the topleft of the popup to aElement (the urlbar).
      // If these values change, please adjust how mouse position is calculated for click event (in telemetry signal)
      this.openPopup(aElement, "after_start", 0, 0 , false, true);
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
    this.urlbarGoClick = this.urlbarGoClick.bind(this);
    this.hidePopup = this.hidePopup.bind(this);
    this.initialized = false;

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
    // do not initialize the UI if the user decided to turn off search
    if(utils.getPref("cliqz_core_disabled", false)) return;

    Services.scriptloader.loadSubScript(System.baseURL + 'ui/UI.js', this.window);
    this.window.CLIQZ.UI.preinit(autocomplete, CliqzHandlebars, CliqzEvents);
    Services.scriptloader.loadSubScript(System.baseURL + 'ui/ContextMenu.js', this.window);
    //create a new panel for cliqz to avoid inconsistencies at FF startup
    var document = this.window.document,
        popup = document.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "panel");

    addStylesheet(this.window.document, STYLESHEET_URL);
    popup.setAttribute("type", 'autocomplete-richlistbox');
    popup.setAttribute("noautofocus", 'true');
    popup.setAttribute("id", 'PopupAutoCompleteRichResultCliqz');
    this.elems.push(popup);
    document.getElementById('PopupAutoCompleteRichResult').parentElement.appendChild(popup);

    this.urlbar = document.getElementById('urlbar');

    this.popup = popup;

    this.urlbarPrefs = Components.classes['@mozilla.org/preferences-service;1']
        .getService(Components.interfaces.nsIPrefService).getBranch('browser.urlbar.');


    this.window.CLIQZ.Core.urlbar = this.urlbar;
    this.window.CLIQZ.Core.popup = this.popup;
    this.window.CLIQZ.settings = this.settings;

    initPopup(this.popup, this.urlbar, this.window);
    CliqzEvents.sub('ui:popup_hide', this.hidePopup);
    this.window.CLIQZ.UI.init(this.urlbar);
    this.window.CLIQZ.UI.window = this;
    this.window.CLIQZ.UI.autocompleteQuery = this.autocompleteQuery.bind(this);

    this._autocompletesearch = this.urlbar.getAttribute('autocompletesearch');
    this.urlbar.setAttribute('autocompletesearch', 'cliqz-results');// + urlbar.getAttribute('autocompletesearch')); /* urlinline history'*/
    this.urlbar.setAttribute('pastetimeout', 0)

    this._autocompletepopup = this.urlbar.getAttribute('autocompletepopup');
    this.urlbar.setAttribute('autocompletepopup', /*'PopupAutoComplete'*/ 'PopupAutoCompleteRichResultCliqz');

    // Some versions of Firefox 52+ fail to update to the correct popup ref
    // The fix landed in Aurora an nightly mid december 2016
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1323600
    // we should keep this workaround for a short while to be sure we are
    // not breaking any versions
    if(this.urlbar._popup === undefined){
      this._originalFFpopup = this.urlbar.popup;
      this.urlbar.popup = this.popup;
    }

    var urlBarGo = document.getElementById('urlbar-go-button');
    this._urlbarGoButtonClick = urlBarGo.getAttribute('onclick');
    //we somehow break default FF -> on goclick the autocomplete doesnt get considered
    urlBarGo.setAttribute('onclick', "CLIQZ.UI.window.urlbarGoClick(); " + this._urlbarGoButtonClick);

    this.popup.addEventListener('popuphiding', this.popupEventHandlers.popupClose);
    this.popup.addEventListener('popupshowing', this.popupEventHandlers.popupOpen);

    Object.keys(this.urlbarEventHandlers).forEach(function(ev) {
      this.urlbar.addEventListener(ev, this.urlbarEventHandlers[ev]);

    }.bind(this));

    //mock default FF function
    this.popup.enableOneOffSearches = function() {}

    this.reloadUrlbar(this.urlbar);

    // Add search history dropdown
    var searchHistoryContainer = SearchHistory.insertBeforeElement(this.window);
    this.elems.push(searchHistoryContainer);

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

    this.initialized = true;
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

    this.window.CLIQZ.UI.unload();

    this.elems.forEach(item => {
      item && item.parentNode && item.parentNode.removeChild(item);
    });

    this.urlbar.setAttribute('autocompletesearch', this._autocompletesearch);
    this.urlbar.setAttribute('autocompletepopup', this._autocompletepopup);
    this.popup.removeEventListener('popuphiding', this.popupEventHandlers.popupClose);
    this.popup.removeEventListener('popupshowing', this.popupEventHandlers.popupOpen);
    if(this._originalFFpopup){
      this.urlbar.popup = this._originalFFpopup;
    }

    CliqzEvents.un_sub('ui:popup_hide', this.hidePopup);


    Object.keys(this.urlbarEventHandlers).forEach(function(ev) {
      this.urlbar.removeEventListener(ev, this.urlbarEventHandlers[ev]);
    }.bind(this));

    var searchContainer = this.window.document.getElementById('search-container');
    if(this._searchContainer){
      searchContainer.setAttribute('class', this._searchContainer);
    }

    // revert onclick handler
    var urlBarGo = this.window.document.getElementById('urlbar-go-button');
    urlBarGo.setAttribute('onclick', this._urlbarGoButtonClick);

    this.reloadUrlbar(this.urlbar);

    [].forEach.call(this.searchShortcutElements, function (item) {
      item.setAttribute('command', item.getAttribute('original_command'))
    });

    this.window.gBrowser.tabContainer.removeEventListener("TabSelect",
      this.tabChange, false);
    this.window.gBrowser.tabContainer.removeEventListener("TabClose",
      this.tabRemoved, false);

    delete this.window.CLIQZ.UI;
  }
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
    autocomplete.isPopupOpen = false;
    autocomplete.markResultsDone(null);
    this.popupEvent(false);
    this.window.CLIQZ.UI.popupClosed = true;
  }
};
