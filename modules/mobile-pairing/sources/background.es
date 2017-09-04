/* global osAPI, window */

import PeerMaster from '../pairing/peer-master';
import YoutubeApp from '../pairing/apps/youtube';
import TabsharingApp from '../pairing/apps/tabsharing';
import PingPongApp from '../pairing/apps/pingpong';
import PairingObserver from '../pairing/apps/pairing-observer';
import CliqzUtils from '../core/utils';
import background from '../core/base/background';
import UserAgent from 'useragent.js';

export default background({
  init() {
    const info = UserAgent.analyze(window.navigator.userAgent);
    const deviceInfo = info.device.full || 'CLIQZ Mobile Browser';
    const osInfo = info.os.full ? ` (${info.os.full})` : '';
    const masterName = `${deviceInfo}${osInfo}`;
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
    };
    observer.ondeviceadded = (data) => {
      osAPI.notifyPairingSuccess(data);
    };
    CliqzMasterComm.addObserver('__MOBILEUI', observer);

    this.arnChecker = CliqzUtils.setInterval(() => {
      if (CliqzMasterComm.isInit) {
        osAPI.deviceARN('setDeviceARN');
      }
    }, 1000 * 300);

    return CliqzMasterComm.init(window.localStorage, window)
    .then(() => {
      try {
        osAPI.deviceARN('setDeviceARN');
      } catch (e) {
        CliqzUtils.log('Error setting device arn', e);
      }
    });
  },
  unload() {
    CliqzUtils.clearInterval(this.arnChecker);
    this.peerMaster.unload();
  },
});
