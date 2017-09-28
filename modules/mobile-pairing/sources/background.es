import PeerMaster from '../pairing/peer-master';
import YoutubeApp from '../pairing/apps/youtube';
import TabsharingApp from '../pairing/apps/tabsharing';
import PingPongApp from '../pairing/apps/pingpong';
import PairingObserver from '../pairing/apps/pairing-observer';
import CliqzUtils from '../core/utils';
import LocalStorage from '../platform/storage';
import osAPI from '../platform/os-api';
import background from '../core/base/background';
import { getDeviceName } from '../platform/device-info';

export default background({
  init() {
    const masterName = getDeviceName();
    this.peerMaster = new PeerMaster({ masterName });
    const CliqzMasterComm = this.peerMaster;

    const pingpong = new PingPongApp(
      () => {},
      source => CliqzUtils.log(`Received PING from ${source}`),
      source => CliqzUtils.log(`Received PONG from ${source}`)
    );
    CliqzMasterComm.addObserver('PINGPONG', pingpong);

    const youtube = new YoutubeApp(
      () => {},
      ({ url, title, format }) => {
        osAPI.downloadVideo({ url, filename: `${title || 'YouTube video'}.${format}` });
      }
    );
    CliqzMasterComm.addObserver('YTDOWNLOADER', youtube);

    const tabsharing = new TabsharingApp(
      () => {},
      (tabs, source) => {
        CliqzUtils.log(`Received tabs ${tabs} from ${source}`);
        osAPI.openTab(tabs);
      }
    );
    CliqzMasterComm.addObserver('TABSHARING', tabsharing);

    const observer = new PairingObserver(() => {
      osAPI.pushPairingData(CliqzMasterComm.pairingData);
    });
    observer.onpairingerror = (error) => {
      osAPI.notifyPairingError({ error });
      osAPI.pushPairingData(CliqzMasterComm.pairingData);
    };
    observer.ondeviceadded = (data) => {
      osAPI.notifyPairingSuccess(data);
      osAPI.pushPairingData(CliqzMasterComm.pairingData);
    };
    CliqzMasterComm.addObserver('__MOBILEUI', observer);

    const storage = new LocalStorage('__MOBILE_PAIRING');
    const storagePromise = typeof storage.load === 'function' ? storage.load() : Promise.resolve();

    return storagePromise
    .then(() => CliqzMasterComm.init(storage));
    // .then(() => {
      // TODO: reimplement this
      // try {
      //   osAPI.deviceARN('setDeviceARN');
      // } catch (e) {
      //   CliqzUtils.log('Error setting device arn', e);
      // }
    // });
  },
  unload() {
    this.peerMaster.unload();
  },

  actions: {
    checkConnections() {
      this.peerMaster.checkConnections();
    },
    receiveQRValue(data) {
      this.peerMaster.qrCodeValue(data);
    },
    requestPairingData() {
      osAPI.pushPairingData(this.peerMaster.pairingData);
      this.actions.checkConnections();
    },
    unpairDevice(deviceID) {
      this.peerMaster.unpair(deviceID);
    },
    renameDevice(peerId, newName) {
      this.peerMaster.changeDeviceName(peerId, newName);
    },
    sendTabs(peerID, tabs) {
      const name = (this.peerMaster.slaves.find(x => x.peerID === peerID) || {}).name;
      this.peerMaster.getObserver('TABSHARING').sendTab(tabs, peerID)
        .then(() => {
          osAPI.notifyTabSuccess({ peerID, name, msg: tabs });
        })
        .catch(() => {
          osAPI.notifyTabError({ peerID, name, msg: tabs });
        });
    },
  }
});
