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

    browser.notifications.create({
      type: 'basic',
      message: getMessage('dataCollection'),
      title: 'Human Web',
    });

    browser.notifications.onClicked.addListener(() => {
      const learnMoreUrl = browser.runtime.getURL('modules/human-web/humanweb.html');
      utils.openLink(this.window, learnMoreUrl, true, false, false, true);
      updateDataCollectionState(3);
    });

    updateDataCollectionState(1);
  }
}
