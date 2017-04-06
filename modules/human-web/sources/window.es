import { utils } from "core/cliqz";
import HumanWeb from "human-web/human-web";
import background from 'human-web/background';

export default class {
  constructor(settings) {
    this.window = settings.window;
    this.settings = settings.settings;
  }

  enabled() {
    return utils.getPref("humanWeb", false)
           && !utils.getPref("dnt", false)
           && !utils.isPrivate(this.window);
  }

  init() {
    if (!this.enabled() || !background.enabled) {
      return;
    }

    HumanWeb.init(this.window);

    this.window.gBrowser.addProgressListener(HumanWeb.listener);

    this._dataCollectionTimer = utils.setTimeout(this.showDataCollectionMessage.bind(this), 1000);
  }

  unload() {
    if (!this.enabled()) {
      return;
    }

    utils.clearTimeout(this._dataCollectionTimer);

    this.window.gBrowser.removeProgressListener(HumanWeb.listener);

    let tabs = Array.prototype.slice.apply(this.window.gBrowser.tabContainer.childNodes);
    tabs.forEach( tab => {
      const currentBrowser = this.window.gBrowser.getBrowserForTab(tab);
      try {
        currentBrowser.contentDocument.removeEventListener("keypress",  HumanWeb.captureKeyPressPage,true);
        currentBrowser.contentDocument.removeEventListener("mousemove", HumanWeb.captureMouseMovePage,true);
        currentBrowser.contentDocument.removeEventListener("mousedown", HumanWeb.captureMouseClickPage,true);
        currentBrowser.contentDocument.removeEventListener("scroll",    HumanWeb.captureScrollPage,true);
        currentBrowser.contentDocument.removeEventListener("copy",      HumanWeb.captureCopyPage,true);
      } catch(e) {}
    });

    if(this.notification){
      this.notification.close();
    }
  }

  status() {
    if(background.enabled) {
      return {
        visible: true,
        state: !utils.getPref('dnt', false)
      }
    }
  }

  /**
   * dataCollectionMessageState
   *   0 - not shown
   *   1 - shown
   *   2 - ignored
   *   3 - learn more
   */
  showDataCollectionMessage() {
    if (!this.settings.showDataCollectionMessage ||
       utils.getPref('dataCollectionMessageState', 0) !== 0) {
      return;
    }

    function updateDataCollectionState(state) {
      utils.telemetry({
        type: 'dataCollectionMessage',
        state: state
      });

      utils.setPref('dataCollectionMessageState', state);
    }

    let box = this.window.document.getElementById("global-notificationbox"),
        buttons = [];

    buttons.push({
      label: utils.getLocalizedString("learnMore"),
      callback: () => {
        let learnMoreUrl = 'chrome://cliqz/content/human-web/humanweb.html';
        this.window.gBrowser.selectedTab = this.window.gBrowser.addTab(learnMoreUrl);
        updateDataCollectionState(3);
      }
    });

    this.notification = box.appendNotification(
      utils.getLocalizedString("dataCollection"),
      null,
      null,
      box.PRIORITY_INFO_HIGH,
      buttons,
      function () {
        // notification hides if the user closes it or presses learn more
        if(utils.getPref('dataCollectionMessageState', 0) < 2){
          updateDataCollectionState(2);
        }
      }
    );

    updateDataCollectionState(1);
  }
}
