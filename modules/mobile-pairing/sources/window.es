import MobilePairing from './background';

export default class Win {
  constructor(settings) {
    this.window = settings.window;
  }

  init() {
    const PeerMaster = MobilePairing.peerMaster;
    const window = this.window;
    window.peerBridge = {
      checkConnections() {
        PeerMaster.checkConnections();
      },
      receiveQRValue(data) {
        PeerMaster.qrCodeValue(data);
      },
      requestPairingData() {
        window.osAPI.pushPairingData(PeerMaster.pairingData);
        window.peerBridge.checkConnections();
      },
      unpairDevice(deviceID) {
        PeerMaster.unpair(deviceID);
      },
      renameDevice(peerId, newName) {
        PeerMaster.changeDeviceName(peerId, newName);
      },
      sendTabs(peerID, tabs) {
        const name = (PeerMaster.slaves.find(x => x.peerID === peerID) || {}).name;
        PeerMaster.getObserver('TABSHARING').sendTab(tabs, peerID)
          .then(() => {
            window.osAPI.notifyTabSuccess({ peerID, name, msg: tabs });
          })
          .catch(() => {
            window.osAPI.notifyTabError({ peerID, name, msg: tabs });
          });
      },
    };

    window.setDeviceARN = (arn) => {
      if (arn) {
        const s = arn.split('/');
        const shortARN = s[s.length - 1];
        PeerMaster.setDeviceARN(shortARN);
      }
    };
  }

  unload() {}
}
