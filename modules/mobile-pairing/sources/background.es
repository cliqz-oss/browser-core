import CliqzMasterComm from './cliqz-master-comm';
import YoutubeApp from '../pairing/apps/youtube';
import TabsharingApp from '../pairing/apps/tabsharing';
import PingPongApp from '../pairing/apps/pingpong';
import PairingObserver from '../pairing/apps/pairing-observer';
import CliqzUtils from '../core/utils';

export default {
  init() {
    const pingpong = new PingPongApp(
      () => {},
      (source) => CliqzUtils.log(`Received PING from ${source}`),
      (source) => CliqzUtils.log(`Received PONG from ${source}`)
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
    CliqzMasterComm.addObserver('__MOBILEUI', observer);

    this.arnChecker = CliqzUtils.setInterval(() => {
      if (CliqzMasterComm.isInit) {
        osAPI.deviceARN('setDeviceARN');
      }
    }, 1000 * 300);

    return CliqzMasterComm.init(window.localStorage)
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
    CliqzMasterComm.unload();
  },
};
