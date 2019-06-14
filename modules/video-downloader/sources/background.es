import background from '../core/base/background';
import inject from '../core/kord/inject';
import { getResourceUrl } from '../core/platform';
import UI from './ui';
import { getActiveTab } from '../platform/browser';
import { chrome } from '../platform/globals';
import { createUITourTarget, deleteUITourTarget } from '../core/ui-tour';

export default background({
  requiresServices: ['telemetry'],

  init() {
    // The UI's constructor receives Peercomm as the first param.
    // If pairing module is available, we pass it.
    // If not, we pass a null value.
    // So this video-downloader module could work
    // with/without 'pairing' module.
    inject.module('pairing').action('getPairingPeer')
      .catch(() => {})
      .then((peerComm) => {
        this.UI = new UI(peerComm);
        if (chrome.i18n) {
          this.UI.init();
        }
      });

    const styleUrl = getResourceUrl('video-downloader/styles/xul.css');
    chrome.cliqz.initTheme(styleUrl, 'video-downloader-stylesheet');
    createUITourTarget('video-downloader', '#pageAction-urlbar-cliqz_cliqz_com', 'pageAction-urlbar-cliqz_cliqz_com');
    createUITourTarget('downloads-button', '#downloads-button', 'downloads-button');
  },

  unload() {
    if (this.UI) this.UI.unload();
    deleteUITourTarget('video-downloader');
    deleteUITourTarget('downloads-button');
  },

  beforeBrowserShutdown() { },
  actions: {
    async getVideoLinks(originalUrl) {
      const url = originalUrl || (await getActiveTab()).url;
      return this.UI.getVideoLinks(url);
    },
    download(data) {
      this.UI.download(data);
    },
    telemetry(data) {
      this.UI.sendTelemetry(data);
    },
    sendToMobile(...args) {
      return this.UI.sendToMobile(...args);
    },
    openConnectPage() {
      this.UI.openConnectPage();
    }
  }
});
