import PairingObserver from 'pairing/apps/pairing-observer';

export default class TabSharing extends PairingObserver {
  constructor(changeCallback, tabReceivedCallback) {
    super(changeCallback);
    this.tabReceivedCallback = tabReceivedCallback;
  }

  onmessage(msg, source) {
    if (this.tabReceivedCallback) {
      this.tabReceivedCallback(msg, source);
    }
  }
  sendTab(tab, target) {
    return this.comm.send(tab, target);
  }
}
