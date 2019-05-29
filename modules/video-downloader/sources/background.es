import background from '../core/base/background';
import inject from '../core/kord/inject';
import UI from './ui';
import { getActiveTab } from '../platform/browser';
import { chrome } from '../platform/globals';

export default background({
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
        if (chrome) {
          this.UI.init();
        }
      });
  },

  unload() {
    if (this.UI) this.UI.unload();
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
      // TODO
    }
  }
});
