import background from '../core/base/background';
import { getBackgroundWindow, destroyBackgroundWindow } from '../platform/p2p/window-utils';
import CliqzPeer from './cliqz-peer';

export default background({
  init() {
    this.peers = [];
    return getBackgroundWindow()
      .then(w => (this.window = w));
  },
  unload() {
    this.peers.forEach((peer) => {
      try {
        peer.destroy();
      } catch (e) {
        // Nothing
      }
    });
    this.peers = [];
    this.window = null;
    destroyBackgroundWindow();
  },
  actions: {
    createPeer(...args) {
      const peer = new CliqzPeer(this.window, ...args);
      this.peers.push(peer);
      return peer;
    },
  }
});
