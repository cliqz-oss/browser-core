import events from '../core/events';
import console from './console';

const osAPI = {
  deviceARN(...args) {
    console.log('[not implemented] deviceARN', ...args);
  },
  notifyPairingSuccess(x) {
    events.pub('mobile-pairing:notifyPairingSuccess', x);
  },
  notifyPairingError(x) {
    events.pub('mobile-pairing:notifyPairingError', x);
  },
  pushPairingData(x) {
    events.pub('mobile-pairing:pushPairingData', x);
  },
  openTab(x) {
    events.pub('mobile-pairing:openTab', x);
  },
  downloadVideo(x) {
    events.pub('mobile-pairing:downloadVideo', x);
  },
  notifyTabError(x) {
    events.pub('mobile-pairing:notifyTabError', x);
  },
  notifyTabSuccess(x) {
    events.pub('mobile-pairing:notifyTabSuccess', x);
  },
};

export default osAPI;
