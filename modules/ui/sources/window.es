import { utils } from "core/cliqz";

/**
  @namespace ui
*/
export default class {

  /**
  * @class Window
  * @constructor
  */
  constructor(settings) {
    this.window = settings.window;
    this.urlbarGoClick = this.urlbarGoClick.bind(this);
    this.initialzied = false;

    this.urlbarEventHandlers = {}
    Object.keys(urlbarEventHandlers).forEach( ev => {
      this.urlbarEventHandlers[ev] = urlbarEventHandlers[ev].bind(this)
    })

    this.popupEventHandlers = {}
    Object.keys(popupEventHandlers).forEach( ev => {
      this.popupEventHandlers[ev] = popupEventHandlers[ev].bind(this)
    })

    this.miscHandlers = {}
    Object.keys(miscHandlers).forEach( ev => {
      this.miscHandlers[ev] = miscHandlers[ev].bind(this)
    })
  }

  /**
  * @method init
  */
  init() {
    // do not initialize the UI if the user decided to turn off search
    if(CliqzUtils.getPref("cliqz_core_disabled", false)) return;

    Services.scriptloader.loadSubScript(this.window.CLIQZ.System.baseURL + 'ui/UI.js', this.window);
    //create a new panel for cliqz to avoid inconsistencies at FF startup
    var document = this.window.document,
        popup = document.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "panel");

    this.window.CLIQZ.Core.addCSS(document, 'chrome://cliqz/content/static/styles/styles.css');
    popup.setAttribute("type", 'autocomplete-richlistbox');
    popup.setAttribute("noautofocus", 'true');
    popup.setAttribute("onpopuphiding", "CLIQZ.UI.closeResults(event)");
    popup.setAttribute("id", 'PopupAutoCompleteRichResultCliqz');
    this.window.CLIQZ.Core.elem.push(popup);
    document.getElementById('PopupAutoCompleteRichResult').parentElement.appendChild(popup);

    this.urlbar = document.getElementById('urlbar');

    this.popup = popup;

    this.urlbarPrefs = Components.classes['@mozilla.org/preferences-service;1']
        .getService(Components.interfaces.nsIPrefService).getBranch('browser.urlbar.');


    this.window.CLIQZ.Core.urlbar = this.urlbar;
    this.window.CLIQZ.Core.popup = this.popup;

    this.window.CLIQZ.UI.init(this.urlbar);
    this.window.CLIQZ.UI.window = this

    this._autocompletesearch = this.urlbar.getAttribute('autocompletesearch');
    this.urlbar.setAttribute('autocompletesearch', 'cliqz-results');// + urlbar.getAttribute('autocompletesearch')); /* urlinline history'*/
    this.urlbar.setAttribute('pastetimeout', 0)

    this._autocompletepopup = this.urlbar.getAttribute('autocompletepopup');
    this.urlbar.setAttribute('autocompletepopup', /*'PopupAutoComplete'*/ 'PopupAutoCompleteRichResultCliqz');

    var urlBarGo = document.getElementById('urlbar-go-button');
    this._urlbarGoButtonClick = urlBarGo.getAttribute('onclick');
    //we somehow break default FF -> on goclick the autocomplete doesnt get considered
    urlBarGo.setAttribute('onclick', "CLIQZ.UI.window.urlbarGoClick(); " + this._urlbarGoButtonClick);

    this.popup.addEventListener('popuphiding', this.popupEventHandlers.popupClose);
    this.popup.addEventListener('popupshowing', this.popupEventHandlers.popupOpen);

    Object.keys(this.urlbarEventHandlers).forEach(function(ev) {
      this.urlbar.addEventListener(ev, this.urlbarEventHandlers[ev]);

    }.bind(this));

    this.reloadUrlbar(this.urlbar);

    // Add search history dropdown
    var searchHistoryContainer = CliqzSearchHistory.insertBeforeElement(null, this.window);
    this.window.CLIQZ.Core.elem.push(searchHistoryContainer);

    this.window.addEventListener("keydown", this.miscHandlers.handleKeyboardShortcuts);

    this.initialzied = true;
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
      position_type: ['inbar_' + (CliqzUtils.isUrl(this.urlbar.mInputField.value)? 'url': 'query')],
      autocompleted: CliqzAutocomplete.lastAutocompleteActive,
      action: 'urlbar_go_click'
    };
    CliqzUtils.telemetry(action);
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

    CliqzUtils.telemetry(action);
  }

  urlbarEvent(ev) {
    var action = {
      type: 'activity',
      action: 'urlbar_' + ev
    };

    CliqzEvents.pub('core:urlbar_' + ev);
    CliqzUtils.telemetry(action);
  }

  unload() {
    if(!this.initialzied) return;

    this.window.CLIQZ.UI.unload();

    for(var i in this.window.CLIQZ.Core.elem){
      var item = this.window.CLIQZ.Core.elem[i];
      item && item.parentNode && item.parentNode.removeChild(item);
    }

    this.urlbar.setAttribute('autocompletesearch', this._autocompletesearch);
    this.urlbar.setAttribute('autocompletepopup', this._autocompletepopup);
    this.popup.removeEventListener('popuphiding', this.popupEventHandlers.popupClose);
    this.popup.removeEventListener('popupshowing', this.popupEventHandlers.popupOpen);



    Object.keys(this.urlbarEventHandlers).forEach(function(ev) {
      this.urlbar.removeEventListener(ev, this.urlbarEventHandlers[ev]);
    }.bind(this));

    var searchContainer = this.window.document.getElementById('search-container');
    if(this._searchContainer){
      searchContainer.setAttribute('class', this._searchContainer);
    }
    var urlBarGo = this.window.document.getElementById('urlbar-go-button');
    urlBarGo.removeEventListener("click",  this.urlbarGoClick);

    this.reloadUrlbar(this.urlbar);

    this.window.removeEventListener("keydown", this.miscHandlers.handleKeyboardShortcuts);

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
    CliqzUtils.pingCliqzResults();

    CliqzAutocomplete.lastFocusTime = Date.now();
    CliqzSearchHistory.hideLastQuery();
    this.triggerLastQ = false;
    CliqzUtils.setSearchSession(CliqzUtils.rand(32));
    this.urlbarEvent('focus');

    if(CliqzUtils.getPref('newUrlFocus') == true && this.urlbar.value.trim().length > 0) {
      var urlbar = this.urlbar.mInputField.value;
      var search = urlbar;
      if (CliqzUtils.isUrl(search)) {
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
    CliqzAutocomplete.resetSpellCorr();

    if(this.window.CLIQZ.Core.triggerLastQ)
        CliqzSearchHistory.lastQuery();

    this.urlbarEvent('blur');

    CliqzAutocomplete.lastFocusTime = null;
    CliqzAutocomplete.resetSpellCorr();
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

      CliqzUtils.telemetry({
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
      CliqzAutocomplete.lastSearch = ev.target.value;
      CliqzUtils.telemetry({
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
    CliqzAutocomplete.isPopupOpen = true;
    this.popupEvent(true);
    this.window.CLIQZ.UI.popupClosed = false;
  },
  /**
  * @event popupClose
  * @param e
  */
  popupClose: function(e){
    CliqzAutocomplete.isPopupOpen = false;
    CliqzAutocomplete.markResultsDone(null);
    this.popupEvent(false);
    this.window.CLIQZ.UI.popupClosed = true;
  }
};

const miscHandlers = {
  _handleKeyboardShortcutsAction: function(val){
    CliqzUtils.telemetry({
      type: 'activity',
      action: 'keyboardShortcut',
      value: val
    });
  },
  handleKeyboardShortcuts: function(ev) {
    if(ev.keyCode == this.window.KeyEvent.DOM_VK_K && !this.urlbar.focused) {
      if((CliqzUtils.isMac(this.window)  &&  ev.metaKey && !ev.ctrlKey && !ev.altKey) ||  // CMD-K
        (!CliqzUtils.isMac(this.window) && !ev.metaKey &&  ev.ctrlKey && !ev.altKey)){   // CTRL-K
        this.urlbar.focus();
        miscHandlers._handleKeyboardShortcutsAction(ev.keyCode);
        ev.preventDefault();
        ev.stopPropagation();
      }
    }
  }
};
