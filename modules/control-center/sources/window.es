import inject from '../core/kord/inject';
import utils from '../core/utils';
import events from '../core/events';
import ToolbarButtonManager from './ToolbarButtonManager';
import { addStylesheet, removeStylesheet } from '../core/helpers/stylesheet';
import UITour from '../platform/ui-tour';
import Panel from '../core/ui/panel';
import console from '../core/console';
import { queryActiveTabs } from '../core/tabs';
import { Window } from '../core/browser';

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
      TRIQZ_URL = 'https://cliqz.com/tips';

export default class {
  constructor(config) {
    this.window = config.window;
    this.controlCenter = inject.module('control-center');
    this.settings = config.settings;
    this.channel = config.settings.channel;
    this.cssUrl = 'chrome://cliqz/content/control-center/styles/xul.css';
    this.createFFhelpMenu = this.createFFhelpMenu.bind(this);
    this.helpMenu = config.window.document.getElementById("menu_HelpPopup");
    this.geolocation = inject.module('geolocation');
    this.core = inject.module('core');
    this.actions = {
      setBadge: this.setBadge.bind(this),
      getData: this.getData.bind(this),
      getEmptyFrameAndData: this.getEmptyFrameAndData.bind(this),
      openURL: this.openURL.bind(this),
      updatePref: this.updatePref.bind(this),
      updateState: this.updateState.bind(this),
      refreshState: this.refreshState.bind(this),
      resize: this.resizePopup.bind(this),
      "adb-optimized": this.adbOptimized.bind(this),
      "antitracking-activator": this.antitrackingActivator.bind(this),
      "adb-activator": this.adbActivator.bind(this),
      "antitracking-strict": this.antitrackingStrict.bind(this),
      "antitracking-clearcache": this.antitrackingClearCache.bind(this),
      "sendTelemetry": this.sendTelemetry.bind(this),
      "openPopUp": this.openPopUp.bind(this),
      "openMockPopUp": this.openMockPopUp.bind(this),
      "setMockBadge": this.setMockBadge.bind(this),
      "cliqz-tab": this.cliqzTab.bind(this),
      "complementary-search": this.complementarySearch.bind(this),
      "search-index-country": this.searchIndexCountry.bind(this),
      'type-filter': this.typeFilter.bind(this),
    }

    this.panel = new Panel(
      this.window,
      'chrome://cliqz/content/control-center/index.html',
      PANEL_ID,
      'control-center',
      false,
      this.actions,
      1 // telemetry version
    );
  }

  init() {
    this.panel.attach();
    // stylesheet for control center button
    addStylesheet(this.window.document, this.cssUrl);

    this.addCCbutton();
    setTimeout(this.actions.refreshState, 100);
    events.sub("core.location_change", this.actions.refreshState);

    this.updateFFHelpMenu();
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
      () => utils.openTabInWindow(win, TRIQZ_URL),
      'triqz'
    );
  }

  feedback(win) {
    return this.simpleBtn(win.document,
      utils.getLocalizedString('btnFeedbackFaq'),
      () => {
        //TODO - use the original channel instead of the current one (it will be changed at update)
        utils.openTabInWindow(win, utils.FEEDBACK_URL);
      },
      'feedback'
    );
  }

  unload() {
    this.panel.detach();
    removeStylesheet(this.window.document, this.cssUrl);
    events.un_sub("core.location_change", this.actions.refreshState);

    this.button.parentElement.removeChild(this.button);

    //remove custom items from the Help Menu
    var nodes = this.helpMenu.querySelectorAll(".cliqz-item");

    Array.prototype.slice.call(nodes, 0)
      .forEach(node => this.helpMenu.removeChild(node));

    this.helpMenu.removeEventListener('popupshowing', this.createFFhelpMenu);
  }

  refreshState(url) {
    // wait for tab content to load
    if (!url || url === "about:blank") {
      return;
    }
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

  antitrackingClearCache() {
    events.pub("control-center:antitracking-clearcache");
  }

  cliqzTab(data) {
    events.pub("control-center:cliqz-tab");
    utils.telemetry({
      type: TELEMETRY_TYPE,
      target: 'cliqz_tab',
      action: 'click',
      state: data.status === true ? 'on' : 'off'
    });
  }

  typeFilter(data){
    utils.setPref(`type_filter_${data.target}`, data.status);
    events.pub('type_filter:change', { target: data.target, status: data.status});
  }

  antitrackingActivator(data){
    switch(data.status) {
      case 'active':
        this.core.action('enableModule', 'antitracking').then(() => {
          events.pub('antitracking:whitelist:remove', data.hostname);
        });
        break;
      case 'inactive':
        this.core.action('enableModule', 'antitracking').then(() => {
          events.pub('antitracking:whitelist:add', data.hostname);
        });
        break;
      case 'critical':
        events.pub('antitracking:whitelist:remove', data.hostname);
        events.nextTick(() => {
          this.core.action('disableModule', 'antitracking');
        });
        //reset the badge when the anti tracking module gets offline
        this.updateBadge('0');
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

  searchIndexCountry(data) {
    function rerender(target, n){
      target.classList.toggle('forceRerender');

      if(n >= 0){
        utils.setTimeout(rerender, 10, target, n - 1);
      }
    }

    events.pub('control-center:setDefault-indexCountry', data.defaultCountry);

    // changing the search index triggers an update of the UI module
    // which reloads the urlbar which makes the control center crazy
    // -> we need to trigger a rerender to avoid having it empty
    rerender(this.panel.panel.children[0], 10);

    utils.telemetry({
      type: TELEMETRY_TYPE,
      target: 'search-index-country',
      state: 'search_index_country_' + data.defaultCountry,
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
          this.controlCenter.windowAction(
            win,
            'refreshState'
          );
        }, 3000 /* some modules need time to start eg: antitracking */, win);
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
    switch (data.pref){
      case 'extensions.cliqz.dnt':
        events.pub("control-center:toggleHumanWeb");
        break;
      case 'extensions.cliqz.share_location':
        this.geolocation.action(
          "setLocationPermission",
          data.value
        );

        events.pub("message-center:handlers-freshtab:clear-message", {
          id: 'share-location',
          template: 'share-location'
        });
        break;
      default:
        utils.setPref(data.pref, data.value, '' /* full pref name required! */);
    }

    utils.telemetry({
      type: TELEMETRY_TYPE,
      target: data.target,
      state: data.value,
      action: 'click'
    });
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
          this.panel.hide();
        } catch(err) {}
        break;
      default:
        var tab = utils.openLink(this.window, data.url, true);
        if(data.closePopup == true) this.panel.hide();
        this.window.gBrowser.selectedTab = tab;
    }

    utils.telemetry({
      type: TELEMETRY_TYPE,
      target: data.target,
      action: 'click',
      index: data.index
    })
  }
  // creates the static frame data without any module details
  // re-used for fast first render and onboarding
  getFrameData(){
    var url = this.window.gBrowser.currentURI.spec,
        friendlyURL = url,
        isSpecialUrl = false,
        urlDetails = utils.getDetailsFromUrl(url);

    if(url.indexOf('about:') === 0){
      friendlyURL = url;
      isSpecialUrl = true;
    } else if(url.indexOf(utils.CLIQZ_NEW_TAB_RESOURCE_URL) === 0){
      friendlyURL = 'Cliqz Tab';
      isSpecialUrl = true;
    }
    return {
      activeURL: url,
      friendlyURL: friendlyURL,
      isSpecialUrl: isSpecialUrl,
      domain: urlDetails.domain,
      extraUrl: urlDetails.extra === '/' ? '' : urlDetails.extra,
      hostname: urlDetails.host,
      module: {}, //will be filled later
      generalState: 'active',
      feedbackURL: utils.FEEDBACK_URL,
      onboarding: this.isOnboarding(),
      debug: utils.getPref('showConsoleLogs', false),
      amo: this.settings.channel !== '40',
      securityON: this.settings.controlCenterSecurity
    }
  }

  prepareData(){
    return this.core.action(
      "getWindowStatus",
      this.window
    ).then((moduleData) => {
      var ccData = this.getFrameData();

      if(this.settings.controlCenterSecurity == true){
        if(moduleData['anti-phishing'] && !moduleData['anti-phishing'].active){
          ccData.generalState = 'inactive';
        }

        if(!moduleData.antitracking){
          ccData.generalState = 'critical';
        } else if(!moduleData.antitracking.enabled && moduleData.antitracking.isWhitelisted){
          ccData.generalState = 'inactive';
        }
      } else {
        ccData.generalState = 'off';
      }

      moduleData.adult = { visible: true, state: utils.getAdultFilterState() };
      if(utils.hasPref('browser.privatebrowsing.apt', '') && this.settings.channel === '40'){
        moduleData.apt = { visible: true, state: utils.getPref('browser.privatebrowsing.apt', false, '') }
      }

      ccData.module = moduleData;

      return ccData;
    });
  }

  numberAnimation() {

  }

  _getMockData() {
    var self = this,
        numberCounter = 0,
        ccDataMocked = this.getFrameData();

    ccDataMocked.module = this.mockedData;
    // we also need to override some of the frame Data
    ccDataMocked.activeURL = 'examplepage.de/webpage';
    ccDataMocked.isSpecialUrl = false;
    ccDataMocked.domain = 'examplepage.de';
    ccDataMocked.extraUrl = '/webpage';
    ccDataMocked.onboarding = true;

    var numberAnimation = function () {
      if(numberCounter === 27)
       return

      if(numberCounter < 18){
        ccDataMocked.module.antitracking.totalCount = numberCounter;
      }

      ccDataMocked.module.adblocker.totalCount = numberCounter;

      self.sendMessageToPopup({
        action: 'pushData',
        data: ccDataMocked
      })

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
        });
        this.updateBadge(data.module.antitracking.badgeData);
      }).catch(e => utils.log(e.toString(), "getData error"))
    }
  }

  // used for a first faster rendering
  getEmptyFrameAndData(){
    this.sendMessageToPopup({
      action: 'pushData',
      data: this.getFrameData()
    });

    this.getData();
  }

  sendMessageToPopup(message) {
    this.panel.sendMessage({
      target: 'cliqz-control-center',
      origin: 'window',
      message: message
    });
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
    div.setAttribute('class','cliqz-control-center');
    if(this.settings.controlCenterSecurity == true){
      div.textContent = BTN_LABEL;
    } else {
      // default state for Control center without security features is "off"
      div.setAttribute('state','off');
    }
    button.appendChild(div);

    UITour.targets.set("cliqz", { query: '#cliqz-cc-btn', widgetName: 'cliqz-cc-btn', allowAdd: true });
    var promise = UITour.getTarget(this.window, "cliqz");
    var win = this.window
    promise.then(target => {
      button.addEventListener('command', () => {
        if (this.isOnboarding()) {
          this.panel.createIframe();

          UITour.showInfo(win, target, "", "");
          doc.getElementById("UITourTooltipDescription").appendChild(this.panel.iframe)
        } else {
          this.panel.open(button);
        }
      });
    });

    ToolbarButtonManager.restorePosition(doc, button);

    this.badge = div;
    this.button = button;
  }

  resizePopup({ width, height }) {
    this.panel.iframe.style.width = toPx(width);
    this.panel.iframe.style.height = toPx(height);
  }

  sendTelemetry(data) {
    let signal = {
          type: TELEMETRY_TYPE,
          target: data.target,
          action: 'click'
        },
        state = data.state;
    if (state) {
      signal.state = state;
    }
    if (data.index) {
      signal.index = data.index;
    }
    utils.telemetry(signal);
  }

  openPopUp() {
    this.window.document.querySelector('toolbarbutton#' + BTN_ID).click();
  }
}
