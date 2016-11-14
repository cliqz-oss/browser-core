import ToolbarButtonManager from 'control-center/ToolbarButtonManager';
import { utils, events } from 'core/cliqz';
import CLIQZEnvironment from 'platform/environment';
import background from 'control-center/background';
import { addStylesheet, removeStylesheet } from '../core/helpers/stylesheet';
import UITour from 'platform/ui-tour';

function toPx(pixels) {
  return pixels.toString() + 'px';
}

const BTN_ID = 'cliqz-cc-btn',
      PANEL_ID = BTN_ID + '-panel',
      firstRunPref = 'cliqz-cc-initialized',
      BTN_LABEL = 0,
      TOOLTIP_LABEL = 'CLIQZ',
      TELEMETRY_TYPE = 'control_center',
      SEARCH_BAR_ID = 'search-container',
      TRIQZ_URL = 'https://cliqz.com/tips',
      dontHideSearchBar = 'dontHideSearchBar',
      //toolbar
      searchBarPosition = 'defaultSearchBarPosition',
      //next element in the toolbar
      searchBarPositionNext = 'defaultSearchBarPositionNext';

export default class {
  constructor(config) {
    this.window = config.window;
    this.settings = config.settings;
    this.channel = config.settings.channel;
    this.cssUrl = 'chrome://cliqz/content/control-center/styles/xul.css';
    this.createFFhelpMenu = this.createFFhelpMenu.bind(this);
    this.helpMenu = config.window.document.getElementById("menu_HelpPopup");
    this.actions = {
      setBadge: this.setBadge.bind(this),
      getData: this.getData.bind(this),
      openURL: this.openURL.bind(this),
      updatePref: this.updatePref.bind(this),
      updateState: this.updateState.bind(this),
      refreshState: this.refreshState.bind(this),
      resize: this.resizePopup.bind(this),
      "adb-optimized": this.adbOptimized.bind(this),
      "antitracking-activator": this.antitrackingActivator.bind(this),
      "adb-activator": this.adbActivator.bind(this),
      "antitracking-strict": this.antitrackingStrict.bind(this),
      "sendTelemetry": this.sendTelemetry.bind(this),
      "openPopUp": this.openPopUp.bind(this),
      "openMockPopUp": this.openMockPopUp.bind(this),
      "setMockBadge": this.setMockBadge.bind(this),
      "enableSearch": this.enableSearch.bind(this),
      "amo-cliqz-tab": this.amoCliqzTab.bind(this),
      "complementary-search": this.complementarySearch.bind(this)
    }
  }

  init() {
    // stylesheet for control center button
    addStylesheet(this.window.document, this.cssUrl);

    this.addCCbutton();
    CliqzEvents.sub("core.location_change", this.actions.refreshState);

    this.updateFFHelpMenu();
    if (!utils.getPref(dontHideSearchBar, false)) {
      //try to hide quick search
      try {
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
    this.helpMenu.insertBefore(this.feedback(this.window), this.helpMenu.firstChild);
  }

  simpleBtn(doc, txt, func, action){
    var item = doc.createElement('menuitem');
    item.setAttribute('label', txt);
    item.setAttribute('action', action);
    item.classList.add('cliqz-item');

    if(func)
      item.addEventListener(
          'command',
          function() {
              utils.telemetry({
                  type: 'activity',
                  action: 'cliqz_menu_button',
                  button_name: action
              });
              func();
          },
          false);
    else
        item.setAttribute('disabled', 'true');

    return item
  }

  tipsAndTricks(win) {
    return this.simpleBtn(win.document,
      utils.getLocalizedString('btnTipsTricks'),
      () => CLIQZEnvironment.openTabInWindow(win, TRIQZ_URL),
      'triqz'
    );
  }

  feedback(win) {
    return this.simpleBtn(win.document,
      utils.getLocalizedString('btnFeedbackFaq'),
      () => {
        //TODO - use the original channel instead of the current one (it will be changed at update)
        CLIQZEnvironment.openTabInWindow(win, utils.FEEDBACK_URL);
      },
      'feedback'
    );
  }

  unload() {
    removeStylesheet(this.window.document, this.cssUrl);
    CliqzEvents.un_sub("core.location_change", this.actions.refreshState);
    this.panel.parentElement.removeChild(this.panel);
    this.button.parentElement.removeChild(this.button);

    //remove custom items from the Help Menu
    var nodes = this.helpMenu.querySelectorAll(".cliqz-item");

    Array.prototype.slice.call(nodes, 0)
      .forEach(node => this.helpMenu.removeChild(node));

    this.helpMenu.removeEventListener('popupshowing', this.createFFhelpMenu);
  }

  refreshState() {
    this.prepareData().then((data) => {
      this.setState(data.generalState);
    });
  }

  adbOptimized(data) {
    events.pub("control-center:adb-optimized");
    utils.telemetry({
      type: TELEMETRY_TYPE,
      target: 'adblock_fair',
      action: 'click',
      state: data.status === true ? 'on' : 'off'
    });
  }

  antitrackingStrict(data) {
    events.pub("control-center:antitracking-strict");
    utils.telemetry({
      type: TELEMETRY_TYPE,
      target: 'attrack_fair',
      action: 'click',
      state: data.status === true ? 'on' : 'off'
    });
  }

  amoCliqzTab(data) {
    events.pub("control-center:amo-cliqz-tab");
    utils.telemetry({
      type: TELEMETRY_TYPE,
      target: 'cliqz_tab',
      action: 'click',
      state: data.status === true ? 'on' : 'off'
    });
  }

  antitrackingActivator(data){
    switch(data.status) {
      case 'active':
        utils.callAction('core', 'enableModule', ['antitracking']).then(() => {
          events.pub('antitracking:whitelist:remove', data.hostname);
        });
        break;
      case 'inactive':
        utils.callAction('core', 'enableModule', ['antitracking']).then(() => {
          events.pub('antitracking:whitelist:add', data.hostname);
        });
        break;
      case 'critical':
        events.pub('antitracking:whitelist:remove', data.hostname);
        events.nextTick(() => {
          utils.callAction('core', 'disableModule', ['antitracking']);
        });
        break;
      default:
        break;
    }

    let state;
    if(data.type === 'switch') {
      state = data.state === 'active' ? 'on' : 'off';
    } else {
      state = data.state;
    }

    utils.telemetry({
      type: TELEMETRY_TYPE,
      target: 'attrack_' + data.type,
      state: state,
      action: 'click',
    });
  }

  complementarySearch(data) {
    events.pub("control-center:setDefault-search", data.defaultSearch);
    utils.telemetry({
      type: TELEMETRY_TYPE,
      target: 'complementary_search',
      state: 'search_engine_change_' + data.defaultSearch,
      action: 'click'
    });
  }

  adbActivator(data){

    events.pub("control-center:adb-activator", data);
    var state;
    if(data.type === 'switch') {
      state = data.state === 'active' ? 'on' : 'off';
    } else {
      state = data.state;
    }
    utils.telemetry({
      type: TELEMETRY_TYPE,
      target: 'adblock_' + data.type,
      state: state,
      action: 'click',
    });
  }

  setMockBadge(info) {
    this.updateBadge(info);
  }

  updateBadge(info) {
    this.badge.textContent = info;
  }

  isOnboarding() {
    var step = utils.getPref(utils.BROWSER_ONBOARDING_STEP_PREF, 1);
    return this.window.gBrowser.currentURI.spec === utils.CLIQZ_ONBOARDING && step === 2;
  }

  setBadge(info, mock){
    if(!this.isOnboarding()) {
      this.updateBadge(info);
    }
  }

  updateState(state){

    // set the state of the current window
    this.setState(state);

    // go to all the other windows and refresh the state
    var enumerator = Services.wm.getEnumerator('navigator:browser');
    while (enumerator.hasMoreElements()) {
      var win = enumerator.getNext();
      if(win != this.window){
        setTimeout((win) => {
          utils.callWindowAction(
            win,
            'control-center',
            'refreshState',
            []
          );
        }, 200, win);
      }
      else {
        // current window - nothing to do
      }
    }
  }

  setState(state){
    this.badge.setAttribute('state', state);
  }

  updatePref(data){

    // NASTY!
    if(data.pref == 'extensions.cliqz.dnt') {
     data.value = !data.value;

     events.pub("control-center:toggleHumanWeb");

     return;
   }

    utils.telemetry({
      type: TELEMETRY_TYPE,
      target: data.target,
      state: data.value,
      action: 'click'
    });

    // more NASTY
    if(data.pref == 'extensions.cliqz.share_location'){
      utils.callAction(
        "geolocation",
        "setLocationPermission",
        [data.value]
      );

      return;
    }

    utils.setPref(data.pref, data.value, '' /* full pref name required! */);
  }

  openURL(data){
    switch(data.url) {
      case 'history':
        //use firefox command to ensure compatibility
        this.window.document.getElementById("Browser:ShowAllHistory").click();
        break;
      case 'forget_history':
        //use firefox command to ensure compatibility
        this.window.document.getElementById("Tools:Sanitize").click();
        break;
      case 'moncomp':
        try {
          var murl = utils.getPref('moncomp_endpoint', '') + this.window.gBrowser.selectedBrowser.currentURI.spec;
          utils.openTabInWindow(this.window, murl);
          this.window.document.querySelector("panel[viewId=" + PANEL_ID + "]").hidePopup();
        } catch(err) {}
        break;
      default:
        var tab = utils.openLink(this.window, data.url, true),
            panel = this.window.document.querySelector("panel[viewId=" + PANEL_ID + "]");
        if(data.closePopup == true) panel.hidePopup();
        this.window.gBrowser.selectedTab = tab;
    }

    utils.telemetry({
      type: TELEMETRY_TYPE,
      target: data.target,
      action: 'click'
    })
  }

  prepareData(){
    return utils.callAction(
      "core",
      "getWindowStatus",
      [this.window]
    ).then((moduleData) => {
      var url = this.window.gBrowser.currentURI.spec,
          friendlyURL = url,
          generalState = 'active';

      if(moduleData['anti-phishing'] && !moduleData['anti-phishing'].active){
        generalState = 'inactive';
      }

      if(moduleData.antitracking && !moduleData.antitracking.enabled){
        if(moduleData.antitracking.isWhitelisted){
          // only this website is whitelisted
          generalState = 'inactive';
        }
        else {
          // completely disabled
          generalState = 'critical';
        }
      }

      moduleData.adult = { visible: true, state: utils.getAdultFilterState() };
      if(utils.hasPref('browser.privatebrowsing.apt', '') && config.settings.channel === '40'){
        moduleData.apt = { visible: true, state: utils.getPref('browser.privatebrowsing.apt', false, '') }
      }

      try {
        // try to clean the url
        friendlyURL = utils.stripTrailingSlash(utils.cleanUrlProtocol(url, true))
      } catch (e) {}

      return {
        activeURL: url,
        friendlyURL: friendlyURL,
        module: moduleData,
        generalState: generalState,
        feedbackURL: utils.FEEDBACK_URL,
        onboarding: this.isOnboarding(),
        searchDisabled: utils.getPref('cliqz_core_disabled', false),
        debug: utils.getPref('showConsoleLogs', false),
        amo: config.settings.channel !== '40'
      }
    });
  }

  numberAnimation() {

  }

  _getMockData() {
    var self = this,
        numberCounter = 0,
        url = 'examplepage.de/webpage';
    var numberAnimation = function () {
      if(numberCounter === 27)
       return

      if(numberCounter < 18)
        self.mockedData.antitracking.totalCount = numberCounter;

      self.mockedData.adblocker.totalCount = numberCounter;
      self.sendMessageToPopup({
        action: 'pushData',
        data: {
          activeURL: url,
          friendlyURL: url,
          module: self.mockedData,
          "generalState":"active",
          "feedbackURL":"https://cliqz.com/feedback/1.2.99-40",
          "onboarding": true
        }
      });

      numberCounter++;
      setTimeout(numberAnimation, 40);
    }
    numberAnimation();
  }

  openMockPopUp(data) {
    this.mockedData = data;
    this.openPopUp();
  }

  getData() {
    if(this.isOnboarding()){
      this._getMockData();
    } else {
      this.prepareData().then(data => {
        this.sendMessageToPopup({
          action: 'pushData',
          data: data
        })
      }).catch(e => utils.log(e.toString(), "getData error"))
    }
  }

  attachMessageHandlers(iframe){

    this.iframe = iframe;
    this.iframe.contentWindow.addEventListener('message', this.decodeMessagesFromPopup.bind(this))
  }

  decodeMessagesFromPopup(ev){
    var data = JSON.parse(ev.data);
    if(data.target == 'cliqz-control-center' &&
       data.origin == 'iframe'){
      this.handleMessagesFromPopup(data.message);
    }
  }

  handleMessagesFromPopup(message) {

    this.actions[message.action](message.data);
  }

  sendMessageToPopup(message) {
    this.iframe.contentWindow.postMessage(JSON.stringify({
      target: 'cliqz-control-center',
      origin: 'window',
      message: message
    }), '*')
  }

  addCCbutton() {
    var doc = this.window.document;
    var firstRunPrefVal = utils.getPref(firstRunPref, false);
    if (!firstRunPrefVal) {
        utils.setPref(firstRunPref, true);

        ToolbarButtonManager.setDefaultPosition(BTN_ID, 'nav-bar', 'bookmarks-menu-button');
    }

    let button = doc.createElement('toolbarbutton');
    button.setAttribute('id', BTN_ID);
    button.setAttribute('label', TOOLTIP_LABEL);
    button.setAttribute('tooltiptext', TOOLTIP_LABEL);
    button.classList.add('toolbarbutton-1')
    button.classList.add('chromeclass-toolbar-additional')

    var div = doc.createElement('div');
    div.setAttribute('id','cliqz-control-center-badge')
    div.setAttribute('class','cliqz-control-center')
    button.appendChild(div);
    div.textContent = BTN_LABEL;

    var panel = doc.createElement('panelview');
    panel.setAttribute('id', PANEL_ID);
    panel.setAttribute('flex', '1');
    panel.setAttribute('panelopen', "true")
    panel.setAttribute("animate", "true")
    panel.setAttribute("type", "arrow");


    var vbox = doc.createElement("vbox");
    vbox.classList.add("panel-subview-body");

    panel.appendChild(vbox);

    var iframe;
    function onPopupReady() {
      var body = iframe.contentDocument.body;
      var clientHeight = body.scrollHeight;
      var clientWidth = body.scrollWidth;

      iframe.style.height = toPx(clientHeight);
      iframe.style.width = toPx(clientWidth);

      this.attachMessageHandlers(iframe);
    }

    function createIframe() {
      iframe = doc.createElement('iframe');
      iframe.setAttribute('type', 'content');
      iframe.setAttribute('src','chrome://cliqz/content/control-center/index.html');
    }

    panel.addEventListener("ViewShowing", () => {
      createIframe();
      iframe.addEventListener('load', onPopupReady.bind(this), true);

      vbox.appendChild(iframe);

      utils.telemetry({
        type: TELEMETRY_TYPE,
        target: 'icon',
        action: 'click',
      });
    });

    panel.addEventListener("ViewHiding", function () {
      vbox.removeChild(iframe);
    });

    doc.getElementById('PanelUI-multiView').appendChild(panel);

    UITour.targets.set("cliqz", { query: '#cliqz-cc-btn', widgetName: 'cliqz-cc-btn', allowAdd: true });
    var promise = UITour.getTarget(this.window, "cliqz");
    var win = this.window
    promise.then(function(target) {
      button.addEventListener('command', () => {

        if (this.isOnboarding()) {
          createIframe();
          UITour.showInfo(win, target, "", "");
          iframe.addEventListener('load', onPopupReady.bind(this), true);
          doc.getElementById("UITourTooltipDescription").appendChild(iframe)
        } else {
          win.PanelUI.showSubView(
            PANEL_ID,
            button,
            win.CustomizableUI.AREA_NAVBAR
          );
        }
      }.bind(this));
    }.bind(this));

    ToolbarButtonManager.restorePosition(doc, button);

    this.badge = div;
    this.panel = panel;
    this.button = button;
  }

  resizePopup({ width, height }) {
    this.iframe.style.width = toPx(width);
    this.iframe.style.height = toPx(height);
  }

  sendTelemetry(data) {
    utils.telemetry({
      type: TELEMETRY_TYPE,
      target: data.target,
      action: 'click',
      state: data.state
    });
  }

  openPopUp() {
    this.window.document.querySelector('toolbarbutton#' + BTN_ID).click();
  }

  enableSearch() {
    events.pub('autocomplete:enable-search',{
      urlbar: this.window.document.getElementById('urlbar')
    });
    let panel = this.window.document.querySelector("panel[viewId=" + PANEL_ID + "]");
    panel.hidePopup();
  }
}
