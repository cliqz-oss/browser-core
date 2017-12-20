import inject from '../core/kord/inject';
import UI from './ui';
import config from '../core/config';

export default class Win {
  constructor(_config) {
    this.window = _config.window;
    this.settings = _config.settings;
    this.background = _config.background;
  }

  init() {
    // The UI's constructor receives Peercomm as the first param.
    // If pairing module is available, we pass it.
    // If not, we pass a null value.
    // So this video-downloader module could work
    // with/without 'pairing' module.
    if (config.platform === 'firefox') {
      inject.module('pairing').action('getPairingPeer')
        .catch(() => {})
        .then((peerComm) => {
          this.UI = new UI(peerComm, this.window, this.settings, this.background);
          this.UI.init();
        });
    }
  }

  unload() {
    if (this.UI) {
      this.UI.unload();
    }
  }
}
