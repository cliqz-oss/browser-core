import ToolbarButtonManager from 'q-button/ToolbarButtonManager';
import { simpleBtn } from 'q-button/buttons';
import { utils } from 'core/cliqz';
import CLIQZEnvironment from "platform/environment";
import CliqzResultProviders from "autocomplete/result-providers";
import background from 'q-button/background';

const BTN_ID = 'cliqz-button',
      firstRunPref = 'firstStartDone',
      CC_ENABLE_PREF = 'controlCenter',
      TRIQZ_URL = 'https://cliqz.com/home/cliqz-triqz',
      TOUR_URL = 'chrome://cliqz/content/onboarding/onboarding.html',
      SEARCH_BAR_ID = 'search-container'
      dontHideSearchBar = 'dontHideSearchBar',
      //toolbar
      searchBarPosition = 'defaultSearchBarPosition',
      //next element in the toolbar
      searchBarPositionNext = 'defaultSearchBarPositionNext';

export default class {

  constructor(config) {
    this.window = config.window;
    this.settings = config.settings;
    this.createFFhelpMenu = this.createFFhelpMenu.bind(this);
    this.helpMenu = this.window.document.getElementById("menu_HelpPopup");
  }

  init() {
    // if Control center is enabled Q button is disabled
    if(background.buttonEnabled){
      this.addQbutton();
    }

    // TODO: handle this help menu once ControlCenter goes 100%
    this.updateFFHelpMenu();
    if (!utils.getPref(dontHideSearchBar, false)) {
      //try to hide quick search
      try{
          var doc = this.window.document;
          var [toolbarID, nextEl] = ToolbarButtonManager.hideToolbarElement(doc, SEARCH_BAR_ID);
          if(toolbarID){
              utils.setPref(searchBarPosition, toolbarID);
          }
          if(nextEl){
              utils.setPref(searchBarPositionNext, nextEl);
          }
          utils.setPref(dontHideSearchBar, true);
      } catch(e){}
    }
  }

  updateFFHelpMenu() {
    if (this.helpMenu && this.settings.helpMenus) {
      this.helpMenu.addEventListener('popupshowing', this.createFFhelpMenu);
    }
  }

  createFFhelpMenu(win){
    if(this
        .window
        .document
        .querySelectorAll("#menu_HelpPopup>.cliqz-item")
        .length > 0) return;

    this.helpMenu.insertBefore(this.tipsAndTricks(this.window), this.helpMenu.firstChild);
    this.helpMenu.insertBefore(this.tour(this.window), this.helpMenu.firstChild);
    this.helpMenu.insertBefore(this.feedback(this.window), this.helpMenu.firstChild);
  }

  unload() {
    if(background.buttonEnabled){
      // remove Q menu
      var btn = this.window.document.getElementById(BTN_ID);
      if (btn) {
        btn.parentNode.removeChild(btn);
      }
    }

    //remove custom items from the Help Menu
    var nodes = this.helpMenu.querySelectorAll(".cliqz-item");

    Array.prototype.slice.call(nodes, 0)
      .forEach(node => this.helpMenu.removeChild(node));

    this.helpMenu.removeEventListener('popupshowing', this.createFFhelpMenu);
  }

  addQbutton(){
    var doc = this.window.document;
    var firstRunPrefVal = utils.getPref(firstRunPref, false);
    if (!firstRunPrefVal) {
        utils.setPref(firstRunPref, true);

        ToolbarButtonManager.setDefaultPosition(BTN_ID, 'nav-bar', 'downloads-button');
    }

    // cliqz button
    let button = doc.createElement('toolbarbutton');
    button.setAttribute('id', BTN_ID);
    button.setAttribute('type', 'menu-button');
    button.setAttribute('label', 'CLIQZ');
    button.setAttribute('tooltiptext', 'CLIQZ');
    button.setAttribute('class', 'toolbarbutton-1 chromeclass-toolbar-additional');
    button.style.listStyleImage = 'url(' + CLIQZEnvironment.SKIN_PATH + 'cliqz_btn.svg)';

    var menupopup = doc.createElement('menupopup');
    menupopup.setAttribute('id', 'cliqz_menupopup');
    button.appendChild(menupopup);

    menupopup.addEventListener('popupshowing', (ev) => {
        // only care about top level menu
        if(ev.target.id != 'cliqz_menupopup') return;

        this.createQbutton(this.window, menupopup);
        utils.telemetry({
          type: 'activity',
          action: 'cliqz_menu_button',
          button_name: 'main_menu'
        });
      }
    );
    button.addEventListener('command', () => {
        if(button.children[0] && button.children[0].openPopup)
        button.children[0].openPopup(button,"after_start", 0, 0, false, true);
    }, false);

    ToolbarButtonManager.restorePosition(doc, button);
  }

  createQbutton(win, menupopup){
    var doc = win.document;

    //clean it
    while(menupopup.lastChild)
      menupopup.removeChild(menupopup.lastChild);

    menupopup.appendChild(this.feedback(win));

    // hide search prefs if the user decided to disable CLIQZ search
    if (!utils.getPref("cliqz_core_disabled", false)) {
      menupopup.appendChild(this.tipsAndTricks(win));
      menupopup.appendChild(doc.createElement('menuseparator'));

      menupopup.appendChild(this.createAdultFilterOptions(doc));
    }

    // module buttons
    win.CLIQZ.config.modules.forEach(moduleName=> {
      var mod = win.CLIQZ.Core.windowModules[moduleName],
          buttonItem = mod && mod.createButtonItem && mod.createButtonItem(win);

      if (buttonItem) {
        if (Array.isArray(buttonItem)) {
          for (let b of buttonItem) {
            menupopup.appendChild(b);
          }
        } else {
          menupopup.appendChild(buttonItem);
        }
      }
    });

    if (utils.getPref("cliqz_core_disabled", false)) {
      menupopup.appendChild(doc.createElement('menuseparator'));
      menupopup.appendChild(this.createActivateButton(doc));
    }
  }

  tipsAndTricks(win) {
    return simpleBtn(win.document,
      utils.getLocalizedString('btnTipsTricks'),
      () => CLIQZEnvironment.openTabInWindow(win, TRIQZ_URL),
      'triqz'
    );
  }

  feedback(win) {
    return simpleBtn(win.document,
      utils.getLocalizedString('btnFeedbackFaq'),
      () => {
        //TODO - use the original channel instead of the current one (it will be changed at update)
        CLIQZEnvironment.openTabInWindow(win, utils.FEEDBACK_URL);
      },
      'feedback'
    );
  }

  tour(win) {
    return simpleBtn(win.document,
      "CLIQZ tour",
      () => CLIQZEnvironment.openTabInWindow(win, TOUR_URL),
      'tour'
    );
  }

  createAdultFilterOptions(doc) {
    var menu = doc.createElement('menu'),
        menupopup = doc.createElement('menupopup');

    menu.setAttribute('label', utils.getLocalizedString('result_filter'));

    var filter_levels = utils.getAdultFilterState();

    for(var level in filter_levels) {
      var item = doc.createElement('menuitem');
      item.setAttribute('label', filter_levels[level].name);
      item.setAttribute('class', 'menuitem-iconic');

      if(filter_levels[level].selected){
        item.style.listStyleImage = 'url(' + CLIQZEnvironment.SKIN_PATH + 'checkmark.png)';
      }

      item.filter_level = new String(level);
      item.addEventListener('command', function(event) {
        utils.setPref('adultContentFilter', this.filter_level.toString());
        utils.telemetry({
          type: 'activity',
          action: 'cliqz_menu_button',
          button_name: 'adult_filter_change_' + this.filter_level
        });
      }, false);

      menupopup.appendChild(item);
    };
    menu.appendChild(menupopup);
    return menu;
  }

  createActivateButton(doc) {
    var button = doc.createElement('menuitem');
    button.setAttribute('label', utils.getLocalizedString('btnActivateCliqz'));
    button.addEventListener('command', (function(event) {
      CLIQZEnvironment.enableCliqzResults(doc.getElementById('urlbar'));
    }).bind(this));
    return button;
  }

}
