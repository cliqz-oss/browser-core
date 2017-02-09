import UI from './ui';
import { utils, events } from 'core/cliqz';

const DISMISSED_ALERTS = 'dismissedAlerts';

export default class {
  constructor(config) {
    this.window = config.window;
    this.settings = config.settings;
  }

  init() {
    // The UI's constructor receives Peercomm as the first param.
    // If pairing module is available, we pass it.
    // If not, we pass a null value.
    // So this video-downloader module could work
    // with/without 'pairing' module.
    CLIQZ.System.import('pairing/main')
    .then(x => (this.PeerComm = x.default))
    .catch(() => {})
    .then(() => {
      this.UI = new UI(this.PeerComm, this.window);
      this.UI.init();

      this.showOnboarding();
    });
  }

  unload() {
    if (this.UI) {
      this.UI.unload();
    }
  }

  showOnboarding() {
    const isInABTest = utils.getPref('extOnboardVideoDownloader', false);
    const isBrowser = this.settings.channel === '40';
    const dismissedAlerts = JSON.parse(utils.getPref(DISMISSED_ALERTS, '{}'));
    const messageType = 'video-downloader';
    const isDismissed = dismissedAlerts[messageType] && dismissedAlerts[messageType]['count'] >= 1 || false;
    if (isBrowser && isInABTest && !isDismissed) {
      events.pub(
        'msg_center:show_message',
        {
          "id": "video-downloader",
          "template": "video-downloader",
        },
        'MESSAGE_HANDLER_FRESHTAB'
      );
    }
  }
}
