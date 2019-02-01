import utils from '../core/utils';
import prefs from '../core/prefs';
import { cleanUrlProtocol, stripTrailingSlash } from '../core/url';
import { isVideoURL, getVideoInfo } from './video-downloader';
import CliqzEvents from '../core/events';
import console from '../core/console';
import { getMessage } from '../core/i18n';

const TELEMETRY_VERSION = 2;
const TELEMETRY_TYPE = 'video_downloader';

export default class UI {
  constructor(PeerComm) {
    this.PeerComm = PeerComm;

    this.actions = {
      checkForVideoLink: this.checkForVideoLink.bind(this),
      sendToMobile: this.sendToMobile.bind(this),
      sendTelemetry: this.sendTelemetry.bind(this),
      download: this.download.bind(this),
      hideButton: this.hideButton.bind(this),
      openConnectPage: this.openConnectPage.bind(this),
    };

    this.onPaired = this.onPaired.bind(this);
  }

  init() {
    CliqzEvents.sub('core.location_change', this.actions.checkForVideoLink);
    CliqzEvents.sub('core.tab_state_change', this.actions.checkForVideoLink);
    CliqzEvents.sub('pairing.onPairingDone', this.onPaired);

    chrome.pageAction.onClicked.addListener(() => {
      utils.telemetry({
        type: TELEMETRY_TYPE,
        version: TELEMETRY_VERSION,
        target: 'icon',
        action: 'click',
      });
    });
  }

  unload() {
    CliqzEvents.un_sub('core.tab_state_change', this.actions.checkForVideoLink);
    CliqzEvents.un_sub('core.location_change', this.actions.checkForVideoLink);
    CliqzEvents.un_sub('pairing.onPairingDone', this.onPaired);
  }

  onPaired() {
    utils.telemetry({
      type: TELEMETRY_TYPE,
      version: TELEMETRY_VERSION,
      action: 'connect',
    });

    /* TODO
    this.sendMessageToPopup({
      action: 'pushData',
      data: {
        hidePairingIframe: true,
      },
    });
    */
  }

  openConnectPage() {
    utils.telemetry({
      type: TELEMETRY_TYPE,
      version: TELEMETRY_VERSION,
      action: 'click',
      target: 'connect_settings',
    });

    utils.openLink(this.window, 'about:preferences#connect', true, false, false, true);
  }

  hideButton(tabId) {
    if (typeof browser !== 'undefined') {
      browser.pageAction.hide(tabId);
    }
  }

  showButton(tabId) {
    if (typeof browser !== 'undefined') {
      browser.pageAction.show(tabId);
    }
  }

  sendToMobile({ url, format, title, type }) {
    prefs.set('videoDownloaderOptions', JSON.stringify({
      platform: 'mobile',
      quality: format
    }));

    utils.telemetry({
      type: TELEMETRY_TYPE,
      version: TELEMETRY_VERSION,
      view: 'mobile',
      action: 'click',
      target: 'download',
      format: format.includes('audio') ? 'audio' : format,
    });

    this.PeerComm.getObserver('YTDOWNLOADER').sendVideo({ url, format: type, title })
      .then(() => {
        utils.telemetry({
          type: 'connect',
          version: TELEMETRY_VERSION,
          action: 'send_video',
          is_success: true,
        });
      })
      .catch(() => {
        utils.telemetry({
          type: 'connect',
          version: TELEMETRY_VERSION,
          action: 'send_video',
          is_success: false,
        });
      });
  }

  cleanUrl(url) {
    try {
      return stripTrailingSlash(cleanUrlProtocol(url, true));
    } catch (e) {
      return url;
    }
  }

  checkForVideoLink(url, _, tabId) {
    if (isVideoURL(this.cleanUrl(url))) {
      this.showButton(tabId);
    } else {
      this.hideButton(tabId);
    }
  }

  // used for a first faster rendering
  async getVideoLinks(originalUrl) {
    const url = this.cleanUrl(originalUrl);
    if (this.PeerComm) {
      await this.PeerComm.waitInit();
    }
    try {
      const formats = await getVideoInfo(url);
      if (formats.length > 0) {
        const options = JSON.parse(prefs.get('videoDownloaderOptions', '{}'));
        const audioFile = formats.find(format => format.class === 'audio');
        if (audioFile) {
          audioFile.name = getMessage('video_downloader_audio_label');
        }
        const desiredFormat = formats.find(format =>
          format.name.toLowerCase().replace(' ', '_') === options.quality) || formats[0];
        desiredFormat.selected = true;

        const result = {
          isConnectPreferred: options.platform === 'mobile',
          pairingAvailable: !!this.PeerComm,
          isPaired: this.PeerComm && this.PeerComm.isPaired,
          formats,
          origin: encodeURI(originalUrl)
        };
        return result;
      }

      utils.telemetry({
        type: TELEMETRY_TYPE,
        version: TELEMETRY_VERSION,
        action: 'popup_open',
        is_downloadable: false,
      });

      return { unSupportedFormat: true };
    } catch (e) {
      console.error('Error getting video links', e);
      utils.telemetry({
        type: TELEMETRY_TYPE,
        version: TELEMETRY_VERSION,
        action: 'popup_open',
        is_downloadable: false,
      });

      return {
        unSupportedFormat: true,
        isLiveVideo: e && e.message === 'live_video'
      };
    }
  }


  sendTelemetry(data) {
    const signal = {
      type: TELEMETRY_TYPE,
      version: TELEMETRY_VERSION,
      target: data.target,
      action: data.action
    };
    if (data.format) {
      signal.format = data.format;
    }
    if (data.size) {
      signal.size = data.size;
    }
    utils.telemetry(signal);
  }

  download({ url, filename, size, format, origin }) {
    utils.telemetry({
      type: TELEMETRY_TYPE,
      version: TELEMETRY_VERSION,
      view: 'desktop',
      target: 'download',
      action: 'click',
      format: format.includes('audio') ? 'audio' : format,
    });

    prefs.set('videoDownloaderOptions', JSON.stringify({
      platform: 'desktop',
      quality: format
    }));

    const onStartedDownload = () => {
      utils.telemetry({
        type: TELEMETRY_TYPE,
        version: TELEMETRY_VERSION,
        action: 'download',
        size,
        is_success: true
      });

      if (origin && browser.cliqz) {
        browser.cliqz.history.fillFromVisit(url, origin);
      }

      console.log('Download started');
    };

    const onFailed = (error) => {
      utils.telemetry({
        type: TELEMETRY_TYPE,
        version: TELEMETRY_VERSION,
        action: 'download',
        size,
        is_success: false
      });

      console.error('Error downloading', error);
    };

    if (typeof browser !== 'undefined') {
      browser.downloads.download({
        url,
        filename,
      }).then(onStartedDownload, onFailed);
    }
  }
}
