import PairingObserver from 'pairing/apps/pairing-observer';

export default class YoutubeApp extends PairingObserver {
  constructor(changeCallback, onVideoReceived) {
    super(changeCallback);
    this.onVideoReceived = onVideoReceived;
  }

  onmessage(msg, source) {
    if (this.onVideoReceived) {
      this.onVideoReceived(msg, source);
    }
  }

  // format should be the extension (mp4, etc.)
  sendVideo({ url, title, format }, deviceID) {
    return this.comm.send({ url, title, format }, deviceID || this.comm.masterID);
  }
}
