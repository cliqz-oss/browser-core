import PairingObserver from 'pairing/apps/pairing-observer';

export default class PingPong extends PairingObserver {
  constructor(changeCallback, pingCallback, pongCallback) {
    super(changeCallback);
    this.pingCallback = pingCallback;
    this.pongCallback = pongCallback;
  }
  onmessage(msg, source) {
    if (msg === 'PING!') {
      if (this.pingCallback) {
        this.pingCallback(source);
      }
      this.comm.send('PONG!', source);
    } else if (msg === 'PONG!') {
      if (this.pongCallback) {
        this.pongCallback(source);
      }
    }
  }
  ping(who) {
    this.comm.send('PING!', who);
  }
}
