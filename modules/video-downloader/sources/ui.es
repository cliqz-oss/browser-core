import utils from '../core/utils';
import prefs from '../core/prefs';
import { cleanUrlProtocol, stripTrailingSlash } from '../core/url';
import { isVideoURL, getVideoInfo } from './video-downloader';
import Panel from '../core/ui/panel';
import { addStylesheet, removeStylesheet } from '../core/helpers/stylesheet';
import config from '../core/config';
import CliqzEvents from '../core/events';
import console from '../core/console';
import UITour from '../platform/ui-tour';
import History from '../platform/history/history';
import history from '../platform/history-service';
import { Components } from '../platform/globals';
import { getMessage } from '../core/i18n';

const events = CliqzEvents;
const DISMISSED_ALERTS = 'dismissedAlerts';

const TELEMETRY_VERSION = 1;
const TELEMETRY_TYPE = 'video_downloader';
const UI_TOUR_ID = 'video-downloader';
const BUTTON_ID = 'video-downloader-page-action';
const PANEL_ID = 'video-downloader-panel';
const DONWLOADS_UITOUR_ID = 'downloads-uitour';
const DONWLOADS_BTN_ID = 'downloads-button';

export default class UI {
  showOnboarding() {
    const isInABTest = prefs.get('extOnboardVideoDownloader', false);
    const isBrowser = this.settings.channel === '40';
    const dismissedAlerts = JSON.parse(prefs.get(DISMISSED_ALERTS, '{}'));
    const messageType = 'video-downloader';
    const isDismissed = dismissedAlerts[messageType] && dismissedAlerts[messageType].count >= 1;
    if (isBrowser && isInABTest && !isDismissed) {
      events.pub(
        'msg_center:show_message',
        {
          id: 'video-downloader',
          template: 'video-downloader',
        },
        'MESSAGE_HANDLER_FRESHTAB'
      );
    }
  }
  constructor(PeerComm, window, settings, background) {
    this.settings = settings;
    const { Downloads } = Components.utils.import('resource://gre/modules/Downloads.jsm');
    this.Downloads = Downloads;
    this.PeerComm = PeerComm;
    this.window = window;
    this.cssUrl = `${config.baseURL}video-downloader/styles/xul.css`;

    this.actions = {
      getVideoLinks: this.getVideoLinks.bind(this),
      getMockData: this.getMockData.bind(this),
      checkForVideoLink: this.checkForVideoLink.bind(this),
      resize: this.resizePopup.bind(this),
      sendToMobile: this.sendToMobile.bind(this),
      sendTelemetry: this.sendTelemetry.bind(this),
      download: this.download.bind(this),
      hidePopup: this.hidePopup.bind(this),
      openConnectPage: this.openConnectPage.bind(this),
    };

    this.background = background;

    this.panel = new Panel({
      window: this.window,
      url: `${config.baseURL}video-downloader/index.html`,
      id: PANEL_ID,
      type: TELEMETRY_TYPE,
      autohide: false,
      actions: this.actions,
      version: TELEMETRY_VERSION,
      onShowingCallback: () => {
        this.pageActionBtn.setAttribute('open', 'true');
      },
      onHidingCallback: () => {
        this.pageActionBtn.removeAttribute('open');
      },
      defaultWidth: 270,
      defaultHeight: 115,
    });

    this.pageActionButtons =
      // Firefox 56 and bellow
      window.document.getElementById('urlbar-icons') ||
      // Firefox 57 and above
      window.document.getElementById('page-action-buttons');

    this.pageActionBtn = window.document.createElement('div');
    this.pageActionBtn.id = BUTTON_ID; // Use id to style this button
    this.pageActionBtn.className = 'urlbar-icon';
    this.onButtonClicked = this.onButtonClicked.bind(this);

    this.pageActionBtn.addEventListener('click', this.onButtonClicked);
    this.pageActionButtons.prepend(this.pageActionBtn);
    this.onEvent = this.onEvent.bind(this);
    this.onPaired = this.onPaired.bind(this);
  }

  init() {
    this.panel.attach();
    // stylesheet for control center button
    addStylesheet(this.window.document, this.cssUrl);

    CliqzEvents.sub('core.location_change', this.actions.checkForVideoLink);
    CliqzEvents.sub('core.tab_state_change', this.actions.checkForVideoLink);
    CliqzEvents.sub('pairing.onPairingDone', this.onPaired);
    this.showOnboarding();
    UITour.targets.set(UI_TOUR_ID, { query: `#${BUTTON_ID}`, widgetName: BUTTON_ID, allowAdd: true });
    UITour.targets.set(DONWLOADS_UITOUR_ID, { query: `#${DONWLOADS_BTN_ID}`, widgetName: DONWLOADS_BTN_ID, allowAdd: true });
    this.hideButton(); // Don't show the button when user opens a new window
  }

  unload() {
    removeStylesheet(this.window.document, this.cssUrl);
    CliqzEvents.un_sub('core.tab_state_change', this.actions.checkForVideoLink);
    CliqzEvents.un_sub('core.location_change', this.actions.checkForVideoLink);
    CliqzEvents.un_sub('pairing.onPairingDone', this.onPaired);
    UITour.targets.delete(UI_TOUR_ID);
    UITour.targets.delete(DONWLOADS_UITOUR_ID);
    this.removeTooltipEventListener();

    this.pageActionBtn.removeEventListener('click', this.onButtonClicked);
    this.pageActionButtons.removeChild(this.pageActionBtn);
    this.panel.detach();
  }

  onPaired() {
    utils.telemetry({
      type: TELEMETRY_TYPE,
      version: TELEMETRY_VERSION,
      action: 'connect',
    });

    this.sendMessageToPopup({
      action: 'pushData',
      data: {
        hidePairingIframe: true,
      },
    });
  }

  onEvent(e) {
    const tooltipSelector = `#UITourTooltip[targetName=${DONWLOADS_UITOUR_ID}]`;
    const tooltip = this.window.document.querySelector(tooltipSelector);
    // Hide the uitour when user clicks outside the tooltip
    if (tooltip && tooltip.state === 'open' && !tooltip.contains(e.target)) {
      this.background.actions.closeDownloadsUITour(true);
      this.hideUITour();
    }
  }

  addTooltipEventListener() {
    this.window.addEventListener('blur', this.onEvent);
    this.window.addEventListener('click', this.onEvent);
  }

  removeTooltipEventListener() {
    this.window.removeEventListener('blur', this.onEvent);
    this.window.removeEventListener('click', this.onEvent);
  }

  resizePopup({ width, height }) {
    this.panel.resizePopup({ width, height });
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

  maybeShowingUITour() {
    if (this.background.isUITourDismissed) {
      return;
    }

    const promise = UITour.getTarget(this.window, UI_TOUR_ID);
    const icon = `${config.baseURL}video-downloader/images/video-downloader-uitour.svg`;
    const title = getMessage('video_downloader_uitour_title');
    const text = getMessage('video_downloader_uitour_description');
    const btnTryLabel = getMessage('video_downloader_uitour_btn_try');
    const btnSkipLabel = getMessage('video_downloader_uitour_btn_skip');
    const buttons = [
      {
        label: btnTryLabel,
        style: 'primary',
        callback: () => {
          utils.telemetry({
            type: 'notification',
            version: TELEMETRY_VERSION,
            topic: 'video_downloader',
            view: 'urlbar',
            action: 'click',
            target: 'try_now',
          });

          setTimeout(() => {
            this.showPopup();
          }, 1000);

          this.hideUITour();
          this.background.actions.closeUITour(false);
        }
      },
      {
        label: btnSkipLabel,
        style: 'link',
        callback: () => {
          utils.telemetry({
            type: 'notification',
            version: TELEMETRY_VERSION,
            topic: 'video_downloader',
            view: 'urlbar',
            action: 'click',
            target: 'later',
          });

          this.hideUITour();
          this.background.actions.closeUITour(true);
        }
      }
    ];
    const options = {
      closeButtonCallback: () => {
        utils.telemetry({
          type: 'notification',
          version: TELEMETRY_VERSION,
          topic: 'video_downloader',
          view: 'urlbar',
          action: 'click',
          target: 'dismiss',
        });

        this.hideUITour();
        this.background.actions.closeUITour(false);
      }
    };

    promise.then((target) => {
      utils.telemetry({
        type: 'notification',
        version: TELEMETRY_VERSION,
        topic: 'video_downloader',
        view: 'urlbar',
        action: 'show',
      });

      UITour.showInfo(this.window, target, title, text, icon, buttons, options);
      UITour.showHighlight(this.window, target, 'wobble');
    }).catch((e) => {
      console.log(e);
    });
  }

  maybeShowingDownloadsUITour() {
    if (this.background.isDownloadsUITourDismissed) {
      return;
    }

    const promise = UITour.getTarget(this.window, DONWLOADS_UITOUR_ID);
    const icon = null;
    const title = getMessage('downloads_uitour_title');
    const text = getMessage('downloads_uitour_description');

    const buttons = [
      {
        label: 'AppStore',
        callback: () => {
          utils.telemetry({
            type: 'notification',
            version: TELEMETRY_VERSION,
            topic: 'video_downloader_mobile',
            view: 'toolbar',
            action: 'click',
            target: 'apple',
          });
          this.background.actions.closeDownloadsUITour(false);
          utils.openLink(this.window, getMessage('pairing_ios_app'), true, false, false, true);
        }
      },
      {
        label: 'PlayStore',
        callback: () => {
          utils.telemetry({
            type: 'notification',
            version: TELEMETRY_VERSION,
            topic: 'video_downloader_mobile',
            view: 'toolbar',
            action: 'click',
            target: 'google',
          });
          this.background.actions.closeDownloadsUITour(false);
          utils.openLink(this.window, getMessage('pairing_android_app'), true, false, false, true);
        }
      }
    ];
    const options = {
      closeButtonCallback: () => {
        utils.telemetry({
          type: 'notification',
          version: TELEMETRY_VERSION,
          topic: 'video_downloader_mobile',
          view: 'toolbar',
          action: 'click',
          target: 'dismiss',
        });
        this.background.actions.closeDownloadsUITour(false);
      }
    };

    promise.then((target) => {
      utils.telemetry({
        type: 'notification',
        version: TELEMETRY_VERSION,
        topic: 'video_downloader_mobile',
        view: 'toolbar',
        action: 'show',
      });
      UITour.showInfo(this.window, target, title, text, icon, buttons, options);
      this.addTooltipEventListener();
    }).catch((e) => {
      console.log(e);
    });
  }

  hideUITour() {
    try {
      this.removeTooltipEventListener();
      UITour.hideInfo(this.window);
      UITour.hideHighlight(this.window);
    } catch (e) {
      // Expected exception when the UITour is not showing
    }
  }

  showPopup() {
    this.panel.open(this.pageActionBtn);
  }

  hidePopup() {
    this.panel.hide();
  }

  showButton() {
    if (this.pageActionBtn.style.display === 'block') {
      return;
    }
    this.pageActionBtn.style.display = 'block';

    this.maybeShowingUITour();
  }

  hideButton() {
    if (this.pageActionBtn.style.display === 'none') {
      return;
    }
    this.pageActionBtn.style.display = 'none';

    this.hideUITour();
  }

  onButtonClicked() {
    utils.telemetry({
      type: TELEMETRY_TYPE,
      version: TELEMETRY_VERSION,
      target: 'icon',
      action: 'click',
    });

    this.hideUITour();
    this.background.actions.closeUITour(false);
    this.panel.open(this.pageActionBtn);
  }

  sendToMobile({ url, format, title, type }) {
    this.background.actions.closeUITour(false);

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

  getCurrentUrl() {
    return this.window.gBrowser.currentURI.spec;
  }

  getCurrentFriendlyUrl() {
    let friendlyURL = this.getCurrentUrl();
    try {
      // try to clean the url
      friendlyURL = stripTrailingSlash(cleanUrlProtocol(friendlyURL, true));
    } catch (e) {
      console.log(friendlyURL, e);
    }

    return friendlyURL;
  }

  getMockData() {
    const result = { isMockData: true };
    this.sendMessageToPopup({
      action: 'pushData',
      data: result,
    });

    this.getVideoLinks();
  }

  checkForVideoLink() {
    const url = this.getCurrentFriendlyUrl();

    if (isVideoURL(url)) {
      this.showButton();
    } else {
      this.hideButton();
    }
  }

  // used for a first faster rendering
  getVideoLinks() {
    const url = this.getCurrentFriendlyUrl();
    Promise.resolve()
      .then(() => {
        if (this.PeerComm) {
          return this.PeerComm.waitInit();
        }
        return null;
      })
      .then(() => getVideoInfo(url))
      .then((formats) => {
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
            origin: encodeURI(this.getCurrentUrl())
          };
          this.sendMessageToPopup({
            action: 'pushData',
            data: result,
          });
        } else {
          this.sendMessageToPopup({
            action: 'pushData',
            data: {
              unSupportedFormat: true,
            },
          });
          utils.telemetry({
            type: TELEMETRY_TYPE,
            version: TELEMETRY_VERSION,
            action: 'popup_open',
            is_downloadable: false,
          });
        }
      })
      .catch((e) => {
        console.error('Error getting video links', e);
        this.sendMessageToPopup({
          action: 'pushData',
          data: {
            unSupportedFormat: true,
            isLiveVideo: e.message === 'live_video',
          },
        });
        // Should we send a different telemetry message here?
        utils.telemetry({
          type: TELEMETRY_TYPE,
          version: TELEMETRY_VERSION,
          action: 'popup_open',
          is_downloadable: false,
        });
      });
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

  sendMessageToPopup(message) {
    const msg = {
      target: 'cliqz-video-downloader',
      origin: 'window',
      message,
    };

    this.panel.sendMessage(msg);
  }

  download({ url, filename, size, format, origin }) {
    this.background.actions.closeUITour(false);

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

    const nsIFilePicker = Components.interfaces.nsIFilePicker;
    const fp = Components.classes['@mozilla.org/filepicker;1'].createInstance(nsIFilePicker);
    fp.defaultString = filename;

    const pos = filename.lastIndexOf('.');
    const extension = (pos > -1) ? filename.substring(pos + 1) : '*';
    fp.appendFilter((extension === 'm4a') ? 'Audio' : 'Video', `*.${extension}`);

    const windowMediator = Components.classes['@mozilla.org/appshell/window-mediator;1']
      .getService(Components.interfaces.nsIWindowMediator);
    const window = windowMediator.getMostRecentWindow(null);

    fp.init(window, null, nsIFilePicker.modeSave);
    fp.open((rv) => {
      if ((rv === nsIFilePicker.returnOK) || (rv === nsIFilePicker.returnReplace)) {
        let download;
        let onVisited;
        const downloadPromise = this.Downloads.createDownload({
          source: url,
          target: fp.file
        });

        Promise.all([
          this.Downloads.getList(this.Downloads.ALL),
          downloadPromise,
        ]).then(([list, d]) => {
          download = d;
          download.start();
          list.add(download);
          const hasDownloadsPanelShown = prefs.get('download.panel.shown', false, 'browser.');
          setTimeout(() => {
            // instead of detecting opening downloadsPanel, check the pref
            if (!hasDownloadsPanelShown) {
              return;
            }
            this.maybeShowingDownloadsUITour();
          }, 1000);
          if (origin) {
            onVisited = (visits) => {
              visits.forEach((visit) => {
                if (visit.url === url) {
                  History.fillFromVisit(url, origin);
                }
              });
            };
            history.onVisited.addListener(onVisited);
          }
          return download.whenSucceeded();
        }).then(() => {
          utils.telemetry({
            type: TELEMETRY_TYPE,
            version: TELEMETRY_VERSION,
            action: 'download',
            size,
            is_success: true
          });
          if (onVisited) {
            history.onVisited.removeListener(onVisited);
          }
        }, () => {
          utils.telemetry({
            type: TELEMETRY_TYPE,
            version: TELEMETRY_VERSION,
            action: 'download',
            size,
            is_success: false
          });
          if (onVisited) {
            history.onVisited.removeListener(onVisited);
          }
        }).then(() => {
          download.finalize(true);
        });
      } else {
        utils.telemetry({
          type: TELEMETRY_TYPE,
          version: TELEMETRY_VERSION,
          action: 'download_cancel',
        });
      }
    });
  }
}
