import PairingObserver from './pairing-observer';

export default class TabSharing extends PairingObserver {
  constructor(changeCallback, tabReceivedCallback) {
    super(changeCallback);
    this.tabReceivedCallback = tabReceivedCallback;
  }

  onmessage(msg, source) {
    if (this.tabReceivedCallback) {
      const data = Array.isArray(msg) ? msg : [{ url: msg }];
      this.tabReceivedCallback(data, source);
    }
  }

  sendTab(tab, target) {
    const data = Array.isArray(tab) ? tab : [{ url: tab }];
    if (!target) {
      return Promise.resolve();
    }
    const _targets = Array.isArray(target) ? target : [target];
    const promises = [];
    _targets.forEach((id) => {
      const version = this.comm.getDeviceVersion(id);
      if (version >= 1) {
        promises.push(this.comm.send(data, target));
      } else {
        data.forEach(({ url }) => promises.push(this.comm.send(url, id)));
      }
    });
    return Promise.all(promises);
  }
}
