import { utils } from 'core/cliqz';
import ToolbarButtonManager from 'video-downloader/ToolbarButtonManager';
import { isVideoURL, getVideoInfo } from 'video-downloader/video-downloader';
import Panel from '../core/ui/panel';
import { addStylesheet, removeStylesheet } from '../core/helpers/stylesheet';
import CliqzEvents from 'core/events';
import console from 'core/console';

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
Cu.import("resource://gre/modules/Downloads.jsm");

function toPx(pixels) {
  return `${pixels.toString()}px`;
}

function getSize(contentLength) {
  let size = parseInt(contentLength, 10);
  if (size >= 1073741824) {
    size = `${parseFloat((size / 1073741824).toFixed(1))} GB`;
  } else if (size >= 1048576) {
    size = `${parseFloat((size / 1048576).toFixed(1))} MB`;
  } else {
    size = `${parseFloat((size / 1024).toFixed(1))} KB`;
  }
  return size;
}

const BTN_ID = 'cliqz-vd-btn';
const PANEL_ID = `${BTN_ID}-panel`;
const firstRunPref = 'cliqz-vd-initialized';
const TOOLTIP_LABEL = 'CLIQZ Video Downloader';
const TELEMETRY_VERSION = 1;
const TELEMETRY_TYPE = 'video_downloader';

export default class UI {
  constructor(PeerComm, window) {
    this.PeerComm = PeerComm;
    this.window = window;
    this.cssUrl = 'chrome://cliqz/content/video-downloader/styles/xul.css';

    this.actions = {
      getVideoLinks: this.getVideoLinks.bind(this),
      getMockData: this.getMockData.bind(this),
      checkForVideoLink: this.checkForVideoLink.bind(this),
      resize: this.resizePopup.bind(this),
      sendToMobile: this.sendToMobile.bind(this),
      hidePopup: this.hidePopup.bind(this),
      "sendTelemetry": this.sendTelemetry.bind(this),
      download: this.download.bind(this),
    };

    this.panel = new Panel(
      this.window,
      'chrome://cliqz/content/video-downloader/index.html',
      PANEL_ID,
      TELEMETRY_TYPE,
      false,
      this.actions,
      TELEMETRY_VERSION
    );
  }

  init() {
    this.panel.attach();
    // stylesheet for control center button
    addStylesheet(this.window.document, this.cssUrl);
    this.addVDbutton();

    CliqzEvents.sub('core.location_change', this.actions.checkForVideoLink);
    CliqzEvents.sub("core.tab_state_change", this.actions.checkForVideoLink);
  }

  unload() {
    this.panel.detach();
    removeStylesheet(this.window.document, this.cssUrl);
    this.button.parentElement.removeChild(this.button);
    CliqzEvents.un_sub("core.tab_state_change", this.actions.checkForVideoLink);
    CliqzEvents.un_sub("core.location_change", this.actions.checkForVideoLink);
  }

  resizePopup({ width, height }) {
    this.panel.iframe.style.width = toPx(width);
    this.panel.iframe.style.height = toPx(height);

    this.panel.iframe.contentDocument.body.style.margin = 0;
    this.panel.iframe.contentDocument.body.style.overflowX = 'hidden';
  }

  hidePopup() {
    this.panel.hide();
  }

  showButton(isCustomizing) {
    if(isCustomizing) {
      this.button.setAttribute('class',
        'cliqz-video-downloader customizing toolbarbutton-1 chromeclass-toolbar-additional');
    } else {
      this.button.setAttribute('class',
        'cliqz-video-downloader toolbarbutton-1 chromeclass-toolbar-additional');
    }
  }

  hideButton() {
    this.button.setAttribute('class',
      'hidden toolbarbutton-1 chromeclass-toolbar-additional');
  }

  sendToMobile({ url, format, title }) {
    this.PeerComm.getObserver('YTDOWNLOADER').sendVideo({ url, format, title })
      .then(() => {
        this.sendMessageToPopup({
          action: 'pushData',
          data: { sendingStatus: 'success' },
        });
      })
      .catch(() => {
        this.sendMessageToPopup({
          action: 'pushData',
          data: { sendingStatus: 'error' },
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
    if (!this.button) {
      return;
    }

    const url = this.getCurrentUrl();

    const isCustomizing = this.window.document.documentElement.hasAttribute("customizing");

    if (isVideoURL(url)) {
      this.showButton();
    } else if (isCustomizing) {
      this.showButton(true);
    } else {
      this.hideButton();
    }
  }

  addVDbutton() {
    const doc = this.window.document;
    const firstRunPrefVal = utils.getPref(firstRunPref, false);
    if (!firstRunPrefVal) {
      utils.setPref(firstRunPref, true);
      ToolbarButtonManager.setDefaultPosition(BTN_ID, 'nav-bar', 'bookmarks-menu-button');
    }

    const button = doc.createElement('toolbarbutton');
    button.setAttribute('id', BTN_ID);
    button.setAttribute('label', TOOLTIP_LABEL);
    button.setAttribute('tooltiptext', TOOLTIP_LABEL);
    button.classList.add('toolbarbutton-1');
    button.classList.add('chromeclass-toolbar-additional');

    const div = doc.createElement('div');
    div.setAttribute('class', 'cliqz-video-downloader');
    button.appendChild(div);

    button.addEventListener('command', () => {
      this.panel.open(button);
    });

    ToolbarButtonManager.restorePosition(doc, button);

    this.badge = div;
    this.button = button;
    this.button.setAttribute('class', 'hidden');
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
    .then(info => {
      if (info.formats.length > 0) {
        const videos = [];
        let audio;
        const videosOnly = [];
        let videoForPairing = {};
        info.formats.forEach(item => {
          if (item.size === 0) {
            return;
          }
          if (item.type.includes('audio/mp4')) {
            audio = {
              name: `M4A ${item.audioBitrate}kbps Audio Only`,
              size: getSize(item.size),
              url: item.url,
              title: info.title,
              format: 'm4a',
            };
          } else if (item.container === 'mp4') {
            const video = {
              name: `${item.container.toUpperCase()} ${item.resolution}`,
              size: getSize(item.size),
              url: item.url,
              title: info.title,
              format: item.container,
            };

            if (item.audioBitrate !== null) {
              videos.push(video);
            } else {
              video.name = `${video.name} Video Only`;
              video.class = 'hidden';
              videosOnly.push(video);
            }
          }
        });
        if (videos.length > 0) {
          videoForPairing = videos[videos.length - 1];
        }
        videos.push(audio);
        const result = {
          pairingAvailable: !!this.PeerComm,
          isPaired: this.PeerComm && this.PeerComm.isPaired,
          videoForPairing,
          formats: videos.concat(videosOnly),
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
            is_downloadable: 'false',
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
        is_downloadable: 'false',
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
    this.panel.sendMessage({
      target: 'cliqz-video-downloader',
      origin: 'window',
      message,
    });
  }

  download({ url, filename, size, format }) {
    utils.telemetry({
      type: TELEMETRY_TYPE,
      version: TELEMETRY_VERSION,
      target: 'download',
      action: 'click',
      format: format
    });

    const nsIFilePicker = Ci.nsIFilePicker;
    const fp = Cc['@mozilla.org/filepicker;1'].createInstance(nsIFilePicker);
    fp.defaultString = filename;

    const pos = filename.lastIndexOf('.');
    const extension = (pos >- 1) ? filename.substring(pos + 1) : '*';
    fp.appendFilter((extension === 'm4a') ? 'Audio' : 'Video', '*.' + extension);

    const windowMediator = Cc['@mozilla.org/appshell/window-mediator;1'].
    getService(Ci.nsIWindowMediator);
    const window = windowMediator.getMostRecentWindow(null);

    fp.init(window, null, nsIFilePicker.modeSave);
    const fileBox = fp.show();
    if ((fileBox === nsIFilePicker.returnOK) || (fileBox === nsIFilePicker.returnReplace)) {
      let download;
      const downloadPromise = Downloads.createDownload({
          source: url,
          target: fp.file
        });

      Promise.all([
        Downloads.getList(Downloads.ALL),
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
          size: size,
          is_success: true
        });
      }, e => {
        utils.telemetry({
          type: TELEMETRY_TYPE,
          version: TELEMETRY_VERSION,
          action: 'download',
          size: size,
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
