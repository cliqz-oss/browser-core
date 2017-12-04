import CliqzHandlebars from 'handlebars';
import $ from 'jquery';
import QRCode from 'qrcode';

const images = {
  video_downloader_inactive: './images/video-downloader-inactive.png',
  video_downloader_active: './images/video-downloader-active.png',
  send_tab_inactive: './images/send-tab-inactive.png',
  send_tab_active: './images/send-tab-active.png',
  pairing_status_unpaired: './images/pairing-status-unpaired.png',
  pairing_status_disconnected: './images/pairing-status-disconnected.png',
  pairing_status_active: './images/pairing-status-active.png',
};

export default class PairingUI {
  constructor(window, PeerComm, telemetry) {
    this.i18n = window.chrome.i18n.getMessage.bind(window.chrome.i18n);
    this.document = window.document;
    this.window = window;
    this.PeerComm = PeerComm;
    this.telemetry = telemetry;


    this.TEMPLATE_NAMES = ['template'];
    this.TEMPLATE_CACHE = {};

    this.onHashChange = this.onHashChange.bind(this);
    this.window.parent.addEventListener('hashchange', this.onHashChange);
    this.onHashChange();

    this.connectionChecker = setInterval(() => {
      PeerComm.checkMasterConnection();
    }, PairingUI.checkInterval);

    // Pairing events
    this.oninit = (info) => {
      this.renderInitial();
      if (info.isPaired) {
        this.renderPaired(info);
      } else if (info.isPairing) {
        this.onpairing(info);
      } else {
        this.onunpaired(info);
      }
    };
    this.ondeviceadded = this.renderPaired.bind(this);
    this.onpairing = this.renderPairing.bind(this);
    this.onpaired = this.renderPaired.bind(this);
    this.onunpaired = ({ isUnpaired }) => {
      this.renderUnpaired();
      if (isUnpaired) {
        this.startPairing();
      }
    };
    this.onmasterconnected = this.renderPaired.bind(this);
    this.onmasterdisconnected = this.renderPaired.bind(this);
  }

  init() {
    this.compileTemplate().then(() => {
      this.PeerComm.getInfo().then((info) => {
        if (info.isInit) {
          this.oninit(info);
        }
      });
    });
  }

  startPairing() {
    this.PeerComm.startPairing();
  }

  fetchTemplate(name) {
    const url = `./template/${name}.hbs`;
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

  updateConnectionInfo(isMasterConnected, deviceName) {
    $('#device-name').text(deviceName);
    if (isMasterConnected) {
      $('#connection-status-img').attr('src', images.pairing_status_active);
      $('#connection-status-text').attr('class', 'connected');
      $('#connection-status-text').text(this.i18n('pairing-online'));
      $('#on-disconnected-tip').css('display', 'none');
    } else {
      $('#connection-status-img').attr('src', images.pairing_status_disconnected);
      $('#connection-status-text').attr('class', 'disconnected');
      $('#connection-status-text').text(this.i18n('pairing-offline'));
      $('#on-disconnected-tip').css('display', 'block');
    }
  }

  renderPairing({ pairingToken }) {
    const token = pairingToken;
    if (token) {
      if (!this.qr) {
        this.qr = new QRCode($('#qrcode')[0], {
          text: token,
          width: 256,
          height: 256,
          colorDark: '#000000',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.Q,
        });
        $('<div class="icon-logo"></div>').insertAfter('#qrcode > canvas');
      } else {
        this.qr.makeCode(token);
      }
    }
  }

  renderPaired({ isPaired, masterName, deviceName, isMasterConnected }) {
    if (!isPaired) return;
    this.hideExtraInfos(masterName);
    this.updateConnectionInfo(isMasterConnected, deviceName);
  }

  renderUnpaired() {
    this.showExtraInfos();
  }

  renderInitial() {
    const window = this.window;

    const deviceName = $('#browser-name').val() ||
      `Cliqz Browser on ${window.navigator.platform}`;

    const data = {
      deviceName,
    };

    data.i18n = {
      title: this.i18n('pairing-title'),
      description: this.i18n('pairing-description'),

      androidApp: this.i18n('pairing-android-app'),
      cliqzForAndroid: this.i18n('pairing-cliqz-for-android'),

      iOSApp: this.i18n('pairing-ios-app'),
      cliqzForIOS: this.i18n('pairing-cliqz-for-ios'),

      videoDownloaderTitle: this.i18n('pairing-video-title'),
      videoDownloaderTip1: this.i18n('pairing-video-tip1'),
      videoDownloaderTip2: this.i18n('pairing-video-tip2'),
      videoDownloaderTip3: this.i18n('pairing-video-tip3'),

      sendTabTitle: this.i18n('pairing-tab-title'),
      sendTabTip1: this.i18n('pairing-tab-tip1'),
      sendTabTip2: this.i18n('pairing-tab-tip2'),

      pairingBrowserPairWith: this.i18n('pairing-browser-pair-with'),
      onDisconnectedTip: this.i18n('pairing-on-disconnected-tip'),
      contactSupport: this.i18n('pairing-contact-support'),

      pairingStep1Title: this.i18n('pairing-step1-title'),

      pairingStep2Title: this.i18n('pairing-step2-title'),
      pairingStep2TitleAndroid: this.i18n('pairing-step2-title-android'),
      pairingStep2TitleIOS: this.i18n('pairing-step2-title-ios'),

      pairingStep3Title: this.i18n('pairing-step3-title'),
      pairingStep3TitleAndroid: this.i18n('pairing-step3-title-android'),
      pairingStep3TitleIOS: this.i18n('pairing-step3-title-ios'),

      pairingStep4Title: this.i18n('pairing-step4-title'),

      pairingScanTitle: this.i18n('pairing-scan-title'),
      pairingErrorMessage: this.i18n('pairing-error-message'),

      unpair: this.i18n('pairing-unpair'),
    };

    $('#content').html(this.TEMPLATE_CACHE.template(data));

    this.showExtraInfos();

    $('#unpair-button').click(() => {
      this.PeerComm.unpair();

      this.telemetry({
        type: 'settings',
        version: 1,
        view: 'connect',
        action: 'click',
        target: 'remove',
      });
    });

    $('#playstore-btn').click(() => {
      this.telemetry({
        type: 'settings',
        version: 1,
        view: 'connect',
        action: 'click',
        target: 'playstore',
      });
    });

    $('#appstore-btn').click(() => {
      this.telemetry({
        type: 'settings',
        version: 1,
        view: 'connect',
        action: 'click',
        target: 'appstore',
      });
    });

    $('.support-link').click(() => {
      this.telemetry({
        type: 'settings',
        version: 1,
        view: 'connect',
        action: 'click',
        target: 'support',
      });
    });
  }

  unload() {
    clearInterval(this.connectionChecker);
    this.window.parent.removeEventListener('hashchange', this.onHashChange);
  }

  onHashChange() {
    if (this.window.parent.location.hash === '#connect') {
      this.telemetry({
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

  static get checkInterval() {
    return 5000;
  }
}
