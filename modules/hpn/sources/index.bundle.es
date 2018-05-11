/* globals window */
// FIXME: stop using this file as soon as subproject chrome-test-hw-hpn is killed
import hpn from './index';

window.CliqzSecureMessage = {
  init() {
    this.background = hpn.Background;
    this.loadingPromise = this.background.init();
    return this.loadingPromise;
  },

  telemetry(msg) {
    return this.loadingPromise.then(
      () => this.background.actions.sendTelemetry(msg)
    );
  },
  sha1(msg) {
    return this.loadingPromise.then(
    () => this.background.actions.sha1(msg)
    );
  },

  sendInstantMessage(rp, payload) {
    return this.loadingPromise.then(
      () => this.background.actions.sendInstantMessage(rp, payload)
    );
  }
};
