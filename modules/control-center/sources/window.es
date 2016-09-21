import ToolbarButtonManager from 'q-button/ToolbarButtonManager';
import { utils, events } from 'core/cliqz';
import CLIQZEnvironment from 'platform/environment';
import background from 'control-center/background';

function toPx(pixels) {
  return pixels.toString() + 'px';
}

const BTN_ID = 'cliqz-cc-btn',
      PANEL_ID = BTN_ID + '-panel',
      firstRunPref = 'cliqz-cc-initialized',
      BTN_LABEL = 0,
      TOOLTIP_LABEL = 'CLIQZ',
      TELEMETRY_TYPE = 'control_center';

export default class {
  constructor(config) {
    if(!background.buttonEnabled){
      return;
    }

    this.window = config.window;
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
      "enableSearch": this.enableSearch.bind(this)
    }
  }

  init() {
    if(background.buttonEnabled){
      // stylesheet for control center button
      this.window.CLIQZ.Core.addCSS(this.window.document,
        'chrome://cliqz/content/control-center/styles/xul.css');

      this.addCCbutton();
      CliqzEvents.sub("core.location_change", this.actions.refreshState);
    }
  }

  unload() {
    if(background.buttonEnabled){
      CliqzEvents.un_sub("core.location_change", this.actions.refreshState);
      this.panel.parentElement.removeChild(this.panel);
      this.button.parentElement.removeChild(this.button);
    }
  }

  refreshState() {
    this.prepareData((data) => {
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

  antitrackingActivator(data){
    events.pub("control-center:antitracking-activator", data);
    var state;
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

  setBadge(info){
    this.badge.textContent = info;
  }

  updateState(state){
    if(!background.buttonEnabled){
      return;
    }

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
    if(data.pref == 'extensions.cliqz.dnt') data.value = !data.value;

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

  prepareData(cb){
    utils.callAction(
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
      if(utils.hasPref('browser.privatebrowsing.apt', '')){
        moduleData.apt = { visible: true, state: utils.getPref('browser.privatebrowsing.apt', false, '') }
      }

      try {
        // try to clean the url
        friendlyURL = utils.stripTrailingSlash(utils.cleanUrlProtocol(url, true))
      } catch (e) {}

      cb({
          activeURL: url,
          friendlyURL: friendlyURL,
          module: moduleData,
          generalState: generalState,
          feedbackURL: utils.FEEDBACK_URL,
          searchDisabled: utils.getPref('cliqz_core_disabled', false),
          debug: utils.getPref('showConsoleLogs', false)
        });
    });
  }

  getData(data){
    this.prepareData((data) => {
      this.sendMessageToPopup({
        action: 'pushData',
        data: data
      })
    });
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

  handleMessagesFromPopup(message){
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

    var vbox = doc.createElement("vbox");
    vbox.classList.add("panel-subview-body");

    panel.appendChild(vbox);

    var iframe;
    panel.addEventListener("ViewShowing", () => {

      function onPopupReady() {
        var body = iframe.contentDocument.body;
        var clientHeight = body.scrollHeight;
        var clientWidth = body.scrollWidth;

        iframe.style.height = toPx(clientHeight);
        iframe.style.width = toPx(clientWidth);

        this.attachMessageHandlers(iframe);
      }

      iframe = doc.createElement('iframe');
      iframe.setAttribute('type', 'content');
      iframe.setAttribute('src','chrome://cliqz/content/control-center/index.html');
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

    button.addEventListener('command', () => {
      this.window.PanelUI.showSubView(
        PANEL_ID,
        button,
        this.window.CustomizableUI.AREA_NAVBAR
      );
    }, false);

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

  enableSearch() {
    CLIQZEnvironment.enableCliqzResults(this.window.document.getElementById('urlbar'));
    let panel = this.window.document.querySelector("panel[viewId=" + PANEL_ID + "]");
    panel.hidePopup();
  }
}
