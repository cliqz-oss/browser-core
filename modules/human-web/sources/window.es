import utils from '../core/utils';
import prefs from '../core/prefs';
import HumanWeb from './human-web';
import background from './background';
import { getMessage } from '../core/i18n';

export default class Win {
  constructor(settings) {
    this.window = settings.window;
    this.settings = settings.settings;
    this.window.CliqzHumanWeb = HumanWeb;
  }

  enabled() {
    return prefs.get('humanWeb', false)
           && !prefs.get('humanWebOptOut', false)
           && !utils.isPrivateMode(this.window);
  }

  init() {
    if (!this.enabled() || !background.active) {
      return;
    }

    this._dataCollectionTimer = setTimeout(this.showDataCollectionMessage.bind(this), 1000);
  }

  unload() {
    if (this._dataCollectionTimer) {
      clearTimeout(this._dataCollectionTimer);
      this._dataCollectionTimer = undefined;
    }

    this.removeNotification();
    delete this.window.CliqzHumanWeb;
  }

  status() {
    if (background.active) {
      return {
        visible: true,
        state: !prefs.get('humanWebOptOut', false)
      };
    }
    return undefined;
  }

  removeNotification() {
    if (this.notification) {
      this.notification.close();
      this.window.document.getElementById('global-notificationbox').removeNotification(this.notification);
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
    if (!this.settings.showDataCollectionMessage
       || prefs.get('dataCollectionMessageState', 0) !== 0) {
      return;
    }

    function updateDataCollectionState(state) {
      utils.telemetry({
        type: 'dataCollectionMessage',
        state
      });

      prefs.set('dataCollectionMessageState', state);
    }

    const box = this.window.document.getElementById('global-notificationbox');
    const buttons = [];

    buttons.push({
      label: getMessage('learnMore'),
      callback: () => {
        const learnMoreUrl = 'resource://cliqz/human-web/humanweb.html';
        utils.openLink(this.window, learnMoreUrl, true, false, false, true);
        updateDataCollectionState(3);
        this.removeNotification();
      }
    });

    this.notification = box.appendNotification(
      getMessage('dataCollection'),
      null,
      null,
      box.PRIORITY_INFO_HIGH,
      buttons,
      () => {
        // notification hides if the user closes it or presses learn more
        if (prefs.get('dataCollectionMessageState', 0) < 2) {
          updateDataCollectionState(2);
          this.removeNotification();
        }
      }
    );

    updateDataCollectionState(1);
  }
}
