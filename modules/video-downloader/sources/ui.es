import { utils } from '../core/cliqz';
import { isVideoURL, getVideoInfo, getFormats } from './video-downloader';
import Panel from '../core/ui/panel';
import { addStylesheet, removeStylesheet } from '../core/helpers/stylesheet';
import config from '../core/config';
import CliqzEvents from '../core/events';
import console from '../core/console';
import UITour from '../platform/ui-tour';
import History from '../platform/history/history';
import { Components } from '../platform/globals';

const events = CliqzEvents;
const DISMISSED_ALERTS = 'dismissedAlerts';

const TELEMETRY_VERSION = 1;
const TELEMETRY_TYPE = 'video_downloader';
const UI_TOUR_ID = 'video-downloader';
const BUTTON_ID = 'video-downloader-page-action';
const PANEL_ID = 'video-downloader-panel';

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
      defaultWidth: 300,
      defaultHeight: 115,
    });

    this.pageActionButtons =
      // Firefox 56 and bellow
      window.document.getElementById('urlbar-icons') ||
      // Firefox 57 and above
      window.document.getElementById('page-action-buttons');

    this.pageActionBtn = window.document.createElement('div');
    this.pageActionBtn.id = BUTTON_ID; // Use id to style this button
    this.onButtonClicked = this.onButtonClicked.bind(this);

    this.pageActionBtn.addEventListener('click', this.onButtonClicked);
    this.pageActionButtons.appendChild(this.pageActionBtn);
  }

  init() {
    this.panel.attach();
    // stylesheet for control center button
    addStylesheet(this.window.document, this.cssUrl);

    CliqzEvents.sub('core.location_change', this.actions.checkForVideoLink);
    CliqzEvents.sub('core.tab_state_change', this.actions.checkForVideoLink);
    this.showOnboarding();
    UITour.targets.set(UI_TOUR_ID, { query: `#${BUTTON_ID}`, widgetName: BUTTON_ID, allowAdd: true });
    this.hideButton(); // Don't show the button when user opens a new window
  }

  unload() {
    removeStylesheet(this.window.document, this.cssUrl);
    CliqzEvents.un_sub('core.tab_state_change', this.actions.checkForVideoLink);
    CliqzEvents.un_sub('core.location_change', this.actions.checkForVideoLink);
    UITour.targets.delete(UI_TOUR_ID);

    this.pageActionBtn.removeEventListener('click', this.onButtonClicked);
    this.pageActionButtons.removeChild(this.pageActionBtn);
    this.panel.detach();
  }

  resizePopup({ width, height }) {
    this.panel.resizePopup({ width, height });
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
    return this.window.gBrowser.currentURI.spec;
  }

  getCurrentFriendlyUrl() {
    let friendlyURL = this.getCurrentUrl();
    try {
      // try to clean the url
      friendlyURL = utils.stripTrailingSlash(utils.cleanUrlProtocol(friendlyURL, true));
    } catch (e) {
      utils.log(friendlyURL, e);
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
          origin: encodeURI(this.getCurrentUrl())
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

    this.panel.sendMessage(msg);
  }

  download({ url, filename, size, format, origin }) {
    this.background.actions.closeUITour(false);

    utils.telemetry({
      type: TELEMETRY_TYPE,
      version: TELEMETRY_VERSION,
      target: 'download',
      action: 'click',
      format,
    });

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
          if (origin) {
            History.fillFromVisit(url, origin);
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
    });
  }
}
