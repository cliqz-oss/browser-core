import { utils } from "../core/cliqz";
import HumanWeb from "./human-web";
import background from './background';

export default class Win {
  constructor(settings) {
    this.window = settings.window;
    this.settings = settings.settings;
    this.window.CliqzHumanWeb = HumanWeb;
  }

  enabled() {
    return utils.getPref("humanWeb", false)
           && !utils.getPref("humanWebOptOut", false)
           && !utils.isPrivate(this.window);
  }

  init() {
    if (!this.enabled() || !background.active) {
      return;
    }

    this._dataCollectionTimer = utils.setTimeout(this.showDataCollectionMessage.bind(this), 1000);
  }

  unload() {
    if (this._dataCollectionTimer) {
      utils.clearTimeout(this._dataCollectionTimer);
      this._dataCollectionTimer = undefined;
    }

    this.removeNotification();
    delete this.window.CliqzHumanWeb;
  }

  status() {
    if(background.active) {
      return {
        visible: true,
        state: !utils.getPref('humanWebOptOut', false)
      }
    }
  }

  removeNotification() {
    if (this.notification) {
      this.notification.close();
      this.window.document.getElementById("global-notificationbox").removeNotification(this.notification);
      this.notification = null;
    }
  }

  /**
   * dataCollectionMessageState
   *   0 - not shown
   *   1 - shown
   *   2 - ignored
   *   3 - learn more
   */
  // TODO: migrate to message-manager
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
        this.removeNotification();
      }
    });

    this.notification = box.appendNotification(
      utils.getLocalizedString("dataCollection"),
      null,
      null,
      box.PRIORITY_INFO_HIGH,
      buttons,
      () => {
        // notification hides if the user closes it or presses learn more
        if(utils.getPref('dataCollectionMessageState', 0) < 2){
          updateDataCollectionState(2);
          this.removeNotification();
        }
      }
    );

    updateDataCollectionState(1);
  }
}
