import { utils } from '../core/cliqz';
import { isVideoURL, getVideoInfo, getFormats } from './video-downloader';
import { addStylesheet, removeStylesheet } from '../core/helpers/stylesheet';
import config from '../core/config';
import CliqzEvents from '../core/events';
import console from '../core/console';
import UITour from '../platform/ui-tour';

const events = CliqzEvents;
const DISMISSED_ALERTS = 'dismissedAlerts';

const TELEMETRY_VERSION = 1;
const TELEMETRY_TYPE = 'video_downloader';
const UI_TOUR_ID = 'video-downloader';

export default class UI {
  showOnboarding() {
    const isInABTest = utils.getPref('extOnboardVideoDownloader', false);
    const isBrowser = this.settings.channel === '40';
    const dismissedAlerts = JSON.parse(utils.getPref(DISMISSED_ALERTS, '{}'));
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
    const { utils: Cu } = Components;
    const { Downloads } = Cu.import('resource://gre/modules/Downloads.jsm');
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
      hidePopup: background.pageAction.hidePopup.bind(background.pageAction, window),
      openConnectPage: this.openConnectPage.bind(this),
    };

    this.background = background;

    this.pageAction = background.pageAction;
    this.pageAction.addWindow(window, this.actions);
    this.pageActionBtn = window.document.getElementById(this.pageAction.id);
    this.onButtonClicked = this.onButtonClicked.bind(this);
    this.pageActionBtn.addEventListener('click', this.onButtonClicked);
    const pageActionButtons =
      // Firefox 56 and bellow
      window.document.getElementById('urlbar-icons') ||
      // Firefox 57 and above
      window.document.getElementById('page-action-buttons');

    pageActionButtons.appendChild(this.pageActionBtn);
  }

  init() {
    // stylesheet for control center button
    addStylesheet(this.window.document, this.cssUrl);

    CliqzEvents.sub('core.location_change', this.actions.checkForVideoLink);
    CliqzEvents.sub('core.tab_state_change', this.actions.checkForVideoLink);
    this.showOnboarding();
    UITour.targets.set(UI_TOUR_ID, { query: `#${this.pageAction.id}`, widgetName: this.pageAction.id, allowAdd: true });
    this.hideButton(); // Don't show the button when user opens a new window
  }

  unload() {
    removeStylesheet(this.window.document, this.cssUrl);
    CliqzEvents.un_sub('core.tab_state_change', this.actions.checkForVideoLink);
    CliqzEvents.un_sub('core.location_change', this.actions.checkForVideoLink);
    UITour.targets.delete(UI_TOUR_ID);
    this.pageActionBtn.removeEventListener('click', this.onButtonClicked);
    this.pageAction.removeWindow(this.window);
  }

  resizePopup({ width, height }) {
    this.pageAction.resizePopup(this.window, { width, height });
  }

  openConnectPage() {
    utils.openLink(this.window, 'about:preferences#connect', true, false, false, true);
  }

  maybeShowingUITour() {
    if (this.background.isUITourDismissed) {
      return;
    }

    const promise = UITour.getTarget(this.window, UI_TOUR_ID);
    const icon = `${config.baseURL}video-downloader/images/video-downloader-uitour.svg`;
    const title = utils.getLocalizedString('video-downloader-uitour-title');
    const text = utils.getLocalizedString('video-downloader-uitour-description');
    const btnTryLabel = utils.getLocalizedString('video-downloader-uitour-btn-try');
    const btnSkipLabel = utils.getLocalizedString('video-downloader-uitour-btn-skip');
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

          utils.setTimeout(() => {
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

  hideUITour() {
    try {
      UITour.hideInfo(this.window);
      UITour.hideHighlight(this.window);
    } catch (e) {
      // Expected exception when the UITour is not showing
    }
  }

  showPopup() {
    this.pageAction.showPopup(this.window);
  }

  showButton() {
    const pageActionBtn = this.window.document.getElementById(this.pageAction.id);
    if (pageActionBtn.style.display === 'block') {
      return;
    }
    pageActionBtn.style.display = 'block';

    this.maybeShowingUITour();
  }

  hideButton() {
    const pageActionBtn = this.window.document.getElementById(this.pageAction.id);
    if (pageActionBtn.style.display === 'none') {
      return;
    }
    pageActionBtn.style.display = 'none';

    this.hideUITour();
  }

  onButtonClicked() {
    this.hideUITour();
    this.background.actions.closeUITour(false);
  }

  sendToMobile({ url, format, title, resend }) {
    this.background.actions.closeUITour(false);

    if (resend) {
      utils.telemetry({
        type: TELEMETRY_TYPE,
        version: TELEMETRY_VERSION,
        action: 'click',
        target: 'send_to_mobile',
        state: 'error',
      });
    } else {
      utils.telemetry({
        type: TELEMETRY_TYPE,
        version: TELEMETRY_VERSION,
        action: 'click',
        target: 'send_to_mobile',
        state: 'initial',
      });
    }
    this.PeerComm.getObserver('YTDOWNLOADER').sendVideo({ url, format, title })
      .then(() => {
        this.sendMessageToPopup({
          action: 'pushData',
          data: { sendingStatus: 'success' },
        });

        utils.telemetry({
          type: 'connect',
          version: TELEMETRY_VERSION,
          action: 'send_video',
          is_success: true,
        });
      })
      .catch(() => {
        this.sendMessageToPopup({
          action: 'pushData',
          data: { sendingStatus: 'error' },
        });

        utils.telemetry({
          type: 'connect',
          version: TELEMETRY_VERSION,
          action: 'send_video',
          is_success: false,
        });
      });
  }

  getCurrentUrl() {
    const url = this.window.gBrowser.currentURI.spec;
    let friendlyURL = url;
    try {
      // try to clean the url
      friendlyURL = utils.stripTrailingSlash(utils.cleanUrlProtocol(url, true));
    } catch (e) {
      utils.log(url, e);
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
    const url = this.getCurrentUrl();

    if (isVideoURL(url)) {
      this.showButton();
    } else {
      this.hideButton();
    }
  }

  // used for a first faster rendering
  getVideoLinks() {
    const url = this.getCurrentUrl();
    Promise.resolve()
    .then(() => {
      if (this.PeerComm) {
        return this.PeerComm.waitInit();
      }
      return null;
    })
    .then(() => getVideoInfo(url))
    .then((info) => {
      const formats = getFormats(info);
      const videos = formats.filter(x => x.isVideoAudio);
      let videoForPairing = {};
      if (videos.length > 0) {
        videoForPairing = videos[videos.length - 1];
      }
      if (formats.length > 0) {
        const result = {
          pairingAvailable: !!this.PeerComm,
          isPaired: this.PeerComm && this.PeerComm.isPaired,
          videoForPairing,
          formats,
        };
        if (result.formats.length > 0) {
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
      }
    })
    .catch((e) => {
      console.error('Error getting video links', e);
      this.sendMessageToPopup({
        action: 'pushData',
        data: {
          unSupportedFormat: true,
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

    this.pageAction.sendMessage(this.window, msg);
  }

  download({ url, filename, size, format }) {
    this.background.actions.closeUITour(false);

    utils.telemetry({
      type: TELEMETRY_TYPE,
      version: TELEMETRY_VERSION,
      target: 'download',
      action: 'click',
      format,
    });

    const nsIFilePicker = Ci.nsIFilePicker;
    const fp = Cc['@mozilla.org/filepicker;1'].createInstance(nsIFilePicker);
    fp.defaultString = filename;

    const pos = filename.lastIndexOf('.');
    const extension = (pos > -1) ? filename.substring(pos + 1) : '*';
    fp.appendFilter((extension === 'm4a') ? 'Audio' : 'Video', `*.${extension}`);

    const windowMediator = Cc['@mozilla.org/appshell/window-mediator;1']
      .getService(Ci.nsIWindowMediator);
    const window = windowMediator.getMostRecentWindow(null);

    fp.init(window, null, nsIFilePicker.modeSave);
    const fileBox = fp.show();
    if ((fileBox === nsIFilePicker.returnOK) || (fileBox === nsIFilePicker.returnReplace)) {
      let download;
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
        return download.whenSucceeded();
      }).then(() => {
        utils.telemetry({
          type: TELEMETRY_TYPE,
          version: TELEMETRY_VERSION,
          action: 'download',
          size,
          is_success: true
        });
      }, () => {
        utils.telemetry({
          type: TELEMETRY_TYPE,
          version: TELEMETRY_VERSION,
          action: 'download',
          size,
          is_success: false
        });
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
  }
}
