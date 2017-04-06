import CliqzHandlebars from 'handlebars';
import PairingObserver from 'pairing/apps/pairing-observer';
import PeerComm from 'pairing/main';
import utils from 'core/utils';

const i18n = utils.getLocalizedString.bind(utils);

const images = {
  video_downloader_inactive: 'chrome://cliqz/content/pairing/images/video-downloader-inactive.png',
  video_downloader_active: 'chrome://cliqz/content/pairing/images/video-downloader-active.png',
  send_tab_inactive: 'chrome://cliqz/content/pairing/images/send-tab-inactive.png',
  send_tab_active: 'chrome://cliqz/content/pairing/images/send-tab-active.png',
  pairing_status_unpaired: 'chrome://cliqz/content/pairing/images/pairing-status-unpaired.png',
  pairing_status_disconnected: 'chrome://cliqz/content/pairing/images/pairing-status-disconnected.png',
  pairing_status_active: 'chrome://cliqz/content/pairing/images/pairing-status-active.png',
};

export default class PairingUI {
  constructor(document, window) {
    this.document = document;
    this.window = window;
    this.$ = this.window.$.bind(this.window);
  }

  startPairing() {
    PeerComm.startPairing('CLIQZ Desktop Browser');
  }

  fetchTemplate(name) {
    const url = `chrome://cliqz/content/pairing/template/${name}.hbs`;
    return new Promise((resolve, reject) => {
      try {
        const xmlHttp = new XMLHttpRequest();
        xmlHttp.open('GET', url, false);
        xmlHttp.overrideMimeType('text/plain');
        xmlHttp.send(null);
        resolve({ name, html: xmlHttp.responseText });
      } catch (err) {
        reject(err);
      }
    });
  }

  compileTemplate() {
    return Promise.all(this.TEMPLATE_NAMES.map(this.fetchTemplate.bind(this))).then((templates) => {
      templates.forEach((tpl) => {
        this.TEMPLATE_CACHE[tpl.name] = CliqzHandlebars.compile(tpl.html);
      });
      return Promise.resolve();
    });
  }

  showExtraInfos() {
    const $ = this.window.$;
    const extraInfos = this.document.getElementsByClassName('extra-info');
    for (let i = 0; i < extraInfos.length; i += 1) {
      extraInfos[i].style.display = 'none';
    }

    $('#support-info').attr('class', 'steps-shown');
    $('#pairing-instructions').css('display', 'block');

    $('#video-downloader-img').attr('src', images.video_downloader_inactive);
    $('#send-tab-img').attr('src', images.send_tab_inactive);
    $('#devices-info').css('display', 'none');

    $('#connection-status-img').attr('src', images.pairing_status_unpaired);
  }

  hideExtraInfos(masterName) {
    const $ = this.window.$;
    const extraInfos = this.document.getElementsByClassName('extra-info');
    for (let i = 0; i < extraInfos.length; i += 1) {
      extraInfos[i].style.display = 'block';
    }

    $('#support-info').attr('class', 'steps-hidden');
    $('#pairing-instructions').css('display', 'none');
    $('#master-name').text(masterName);
    $('#devices-info').css('display', 'block');

    $('#video-downloader-img').attr('src', images.video_downloader_active);
    $('#send-tab-img').attr('src', images.send_tab_active);
  }

  updateConnectionInfo(isMasterConnected) {
    const $ = this.window.$;
    $('#device-name').text(PeerComm.deviceName);
    if (isMasterConnected) {
      $('#connection-status-img').attr('src', images.pairing_status_active);
      $('#connection-status-text').attr('class', 'connected');
      $('#connection-status-text').text(i18n('pairing-online'));
      $('#on-disconnected-tip').css('display', 'none');
    } else {
      $('#connection-status-img').attr('src', images.pairing_status_disconnected);
      $('#connection-status-text').attr('class', 'disconnected');
      $('#connection-status-text').text(i18n('pairing-offline'));
      $('#on-disconnected-tip').css('display', 'block');
    }
  }

  renderPairing() {
    const token = PeerComm.pairingToken;
    const $ = this.window.$;
    if (token) {
      if (!this.qr) {
        this.qr = new this.window.QRCode($('#qrcode')[0], {
          text: token,
          width: 256,
          height: 256,
          colorDark: '#000000',
          colorLight: '#ffffff',
          correctLevel: this.window.QRCode.CorrectLevel.Q,
        });
        $('<div class="icon-logo"></div>').insertAfter('#qrcode > canvas');
      } else {
        this.qr.makeCode(token);
      }
    }
  }

  renderPaired() {
    const masterName = PeerComm.masterName;
    const isMasterConnected = PeerComm.isMasterConnected;
    this.hideExtraInfos(masterName);
    this.updateConnectionInfo(isMasterConnected);
  }

  renderUnpaired() {
    this.showExtraInfos();
  }

  renderInitial() {
    const $ = this.$;
    const window = this.window;

    const deviceName = $('#browser-name').val() ||
      `CLIQZ Browser on ${window.navigator.platform}`;

    const data = {
      deviceName,
    };

    data.i18n = {
      title: i18n('pairing-title'),

      description: i18n('pairing-description'),
      androidApp: i18n('pairing-android-app'),
      videoDownloaderTitle: i18n('pairing-video-title'),
      videoDownloaderTip: i18n('pairing-video-tip'),
      sendTabTitle: i18n('pairing-tab-title'),
      sendTabTip: i18n('pairing-tab-tip'),
      pairingBrowserPairWith: i18n('pairing-browser-pair-with'),
      onDisconnectedTip: i18n('pairing-on-disconnected-tip'),
      contactSupport: i18n('pairing-contact-support'),
      pairingStep1Title: i18n('pairing-step1-title'),
      pairingStep2Title: i18n('pairing-step2-title'),
      pairingScanTitle: i18n('pairing-scan-title'),
      pairingErrorMessage: i18n('pairing-error-message'),

      unpair: i18n('pairing-unpair'),
    };

    $('#content').html(this.TEMPLATE_CACHE.template(data));

    this.showExtraInfos();

    $('#unpair-button').click(() => {
      PeerComm.unpair();

      utils.telemetry({
        type: 'settings',
        version: 1,
        view: 'connect',
        action: 'click',
        target: 'remove',
      });
    });

    $('#playstore-btn').click(() => {
      utils.telemetry({
        type: 'settings',
        version: 1,
        view: 'connect',
        action: 'click',
        target: 'playstore',
      });
    });

    $('.support-link').click(() => {
      utils.telemetry({
        type: 'settings',
        version: 1,
        view: 'connect',
        action: 'click',
        target: 'support',
      });
    });
  }

  unload() {
    PeerComm.removeObserver(this.observerID, this.observer);
    utils.clearInterval(this.connectionChecker);
    this.window.parent.removeEventListener('hashchange', this.onHashChange);
  }

  onHashChange() {
    if (this.window.parent.location.hash === '#connect') {
      utils.telemetry({
        type: 'settings',
        version: 1,
        view: 'connect',
        action: 'show',
      });
    }
  }

  get observerID() {
    if (!this._observerID) {
      this._observerID = `__PAIRING__DASHBOARD__${Math.random()}`;
    }
    return this._observerID;
  }

  init() {
    this.TEMPLATE_NAMES = ['template'];
    this.TEMPLATE_CACHE = {};

    const observer = this.observer = new PairingObserver();
    this.compileTemplate().then(() => {
      PeerComm.addObserver(this.observerID, observer);
    });

    this.onHashChange = this.onHashChange.bind(this);
    this.window.parent.addEventListener('hashchange', this.onHashChange);
    this.onHashChange();

    observer.onerror = () => {
      // TODO: handle error
    };
    observer.onpairingtick = () => {
      // NOTHING
    };

    observer.oninit = () => {
      this.renderInitial();
      if (PeerComm.isPaired) {
        observer.onpaired();
      } else if (PeerComm.isPairing) {
        observer.onpairing();
      } else {
        observer.onunpaired();
      }
    };

    observer.onunload = () => {
      // clearPage();
    };

    observer.ondeviceadded = () => {
      observer.onpaired();
    };

    observer.ondeviceremoved = () => {
      // When we show other paired devices we should update them here
    };

    observer.onpairing = () => {
      if (PeerComm.isPairing) {
        this.renderPairing();
      }
    };

    observer.onpaired = () => {
      if (PeerComm.isPaired) {
        this.renderPaired();
      }
    };

    observer.onunpaired = () => {
      this.renderUnpaired();
      if (PeerComm.isUnpaired) {
        this.startPairing();
      }
    };

    observer.onmasterconnected = () => {
      observer.onpaired();
    };

    observer.onmasterdisconnected = () => {
      observer.onpaired();
    };

    if (PeerComm.isInit && PeerComm.isPaired) {
      PeerComm.checkMasterConnection();
    }

    this.connectionChecker = utils.setInterval(() => {
      if (PeerComm.isInit && PeerComm.isPaired) {
        PeerComm.checkMasterConnection();
      }
    }, PairingUI.checkInterval);
  }

  static get checkInterval() {
    return 5000;
  }
}
