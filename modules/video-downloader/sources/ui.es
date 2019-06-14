import telemetry from '../core/services/telemetry';
import prefs from '../core/prefs';
import { cleanUrlProtocol, stripTrailingSlash } from '../core/url';
import { isVideoURL, getVideoInfo } from './video-downloader';
import CliqzEvents from '../core/events';
import console from '../core/console';
import { getMessage } from '../core/i18n';
import { chrome } from '../platform/globals';
import { showUITour, hideUITour } from '../core/ui-tour';
import { uiTourSignal, downloadUiTourSignal } from './utils/ui-tour-telemetry';
import { getResourceUrl } from '../core/platform';

const TELEMETRY_VERSION = 2;
const TELEMETRY_TYPE = 'video_downloader';
const UI_TOUR_PREF = 'videoDownloaderUITourDismissed';
const DOWNLOADS_UI_TOUR_PREF = 'downloadsUITourDismissed';
const ONE_DAY = 24 * 60 * 60 * 1000;

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

    if (chrome && chrome.pageAction) {
      chrome.pageAction.onClicked.addListener(() => {
        telemetry.push({
          type: TELEMETRY_TYPE,
          version: TELEMETRY_VERSION,
          target: 'icon',
          action: 'click',
        });
      });
    }
  }

  unload() {
    CliqzEvents.un_sub('core.tab_state_change', this.actions.checkForVideoLink);
    CliqzEvents.un_sub('core.location_change', this.actions.checkForVideoLink);
    CliqzEvents.un_sub('pairing.onPairingDone', this.onPaired);
  }

  onPaired() {
    telemetry.push({
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
    telemetry.push({
      type: TELEMETRY_TYPE,
      version: TELEMETRY_VERSION,
      action: 'click',
      target: 'connect_settings',
    });

    this.openPage('about:preferences#connect');
  }

  openPage(url) {
    chrome.omnibox2.navigateTo(url, { target: 'tab' });
  }

  hideButton(tabId) {
    if (typeof browser !== 'undefined') {
      browser.pageAction.hide(tabId);
    }

    hideUITour();
  }

  showButton(tabId) {
    if (typeof browser !== 'undefined') {
      browser.pageAction.show(tabId);
    }

    setTimeout(() => {
      this.showVDUITour();
    }, 1000);
  }

  sendToMobile({ url, format, title, type }) {
    prefs.set('videoDownloaderOptions', JSON.stringify({
      platform: 'mobile',
      quality: format
    }));

    telemetry.push({
      type: TELEMETRY_TYPE,
      version: TELEMETRY_VERSION,
      view: 'mobile',
      action: 'click',
      target: 'download',
      format: format.includes('audio') ? 'audio' : format,
    });

    this.PeerComm.getObserver('YTDOWNLOADER').sendVideo({ url, format: type, title })
      .then(() => {
        telemetry.push({
          type: 'connect',
          version: TELEMETRY_VERSION,
          action: 'send_video',
          is_success: true,
        });
      })
      .catch(() => {
        telemetry.push({
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
    this.markUITourDismissed(UI_TOUR_PREF);
    hideUITour();

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

      telemetry.push({
        type: TELEMETRY_TYPE,
        version: TELEMETRY_VERSION,
        action: 'popup_open',
        is_downloadable: false,
      });

      return { unSupportedFormat: true };
    } catch (e) {
      console.error('Error getting video links', e);
      telemetry.push({
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
    telemetry.push(signal);
  }

  isUITourDismissed(prefName) {
    const lastSkip = prefs.get(prefName, '0');

    if (lastSkip === 'dismissed') {
      return true;
    }

    if (Number(lastSkip) + ONE_DAY < Date.now()) {
      return false;
    }

    return true;
  }

  markUITourDismissed(prefName, isSkipping) {
    if (isSkipping) {
      prefs.set(prefName, Date.now().toString());
    } else {
      prefs.set(prefName, 'dismissed');
    }
  }

  showVDUITour() {
    if (this.isUITourDismissed(UI_TOUR_PREF)) {
      return;
    }

    const settings = {
      targetId: 'video-downloader',
      title: getMessage('video_downloader_uitour_title'),
      text: getMessage('video_downloader_uitour_description'),
      icon: getResourceUrl('video-downloader/images/video-downloader-uitour.svg'),
    };

    const ctaButton = {
      label: getMessage('video_downloader_uitour_btn_try'),
      style: 'primary'
    };

    const skipButton = {
      label: getMessage('video_downloader_uitour_btn_skip'),
      style: 'link'
    };

    const promise = showUITour(settings, ctaButton, skipButton);

    uiTourSignal({ action: 'show' });

    promise.then((button) => {
      switch (button) {
        case 'CTA': {
          this.markUITourDismissed(UI_TOUR_PREF);
          uiTourSignal({ action: 'click', target: 'try_now' });
          setTimeout(() => {
            browser.cliqz.openPageActionPopup();
          }, 1000);
          break;
        }

        case 'skip': {
          this.markUITourDismissed(UI_TOUR_PREF, true);
          uiTourSignal({ action: 'click', target: 'later' });
          break;
        }

        case 'close': {
          this.markUITourDismissed(UI_TOUR_PREF);
          uiTourSignal({ action: 'click', target: 'dismiss' });
          break;
        }

        default: {
          console.log(button);
        }
      }
    });
  }

  showDownloadUITour() {
    if (this.isUITourDismissed(DOWNLOADS_UI_TOUR_PREF)) {
      return;
    }

    const settings = {
      targetId: 'downloads-button',
      title: getMessage('video_downloader_uitour_downloads_title'),
      text: getMessage('video_downloader_uitour_downloads_description'),
      icon: null,
    };

    const ctaButton = {
      label: 'AppStore',
      style: ''
    };

    const skipButton = {
      label: 'PlayStore',
      style: ''
    };

    const promise = showUITour(settings, ctaButton, skipButton);

    downloadUiTourSignal({ action: 'show' });

    promise.then((button) => {
      switch (button) {
        case 'CTA': {
          this.markUITourDismissed(DOWNLOADS_UI_TOUR_PREF);
          downloadUiTourSignal({ action: 'click', target: 'apple' });
          this.openPage(getMessage('video_downloader_mobile_ios_app'));
          break;
        }

        case 'skip': {
          this.markUITourDismissed(DOWNLOADS_UI_TOUR_PREF);
          downloadUiTourSignal({ action: 'click', target: 'google' });
          this.openPage(getMessage('video_downloader_mobile_android_app'));
          break;
        }

        case 'close': {
          this.markUITourDismissed(DOWNLOADS_UI_TOUR_PREF);
          downloadUiTourSignal({ action: 'click', target: 'dismiss' });
          break;
        }

        default: {
          console.log(button);
        }
      }
    });
  }

  download({ url, filename, size, format, origin }) {
    const hasDownloadsPanelShown = prefs.get('download.panel.shown', false, 'browser.');
    telemetry.push({
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
      telemetry.push({
        type: TELEMETRY_TYPE,
        version: TELEMETRY_VERSION,
        action: 'download',
        size,
        is_success: true
      });

      if (origin && browser.cliqzHistory) {
        browser.cliqzHistory.history.fillFromVisit(url, origin);
      }

      // instead of detecting opening downloadsPanel, check the pref
      if (hasDownloadsPanelShown) {
        setTimeout(() => {
          this.showDownloadUITour();
        }, 1000);
      }

      console.log('Download started');
    };

    const onFailed = (error) => {
      telemetry.push({
        type: TELEMETRY_TYPE,
        version: TELEMETRY_VERSION,
        action: 'download',
        size,
        is_success: false
      });

      console.error('Error downloading', error);
    };

    if (typeof browser !== 'undefined') {
      browser.tabs.query({
        active: true,
        currentWindow: true,
      }).then((tabs) => {
        const tab = tabs[tabs.length - 1];

        browser.downloads.download({
          url,
          filename: filename.trim(),
          incognito: tab.incognito,
        }).then(onStartedDownload, onFailed);
      });
    }
  }
}
