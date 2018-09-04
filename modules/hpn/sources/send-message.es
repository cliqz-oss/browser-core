import CliqzSecureMessage from './main';
import CryptoWorker from './crypto-worker';
import inject from '../core/kord/inject';
import console from '../core/console';

export default class MessageSender {
  constructor(args = {}) {
    this.hpnv2 = inject.module('hpnv2');
    // by default, use CryptoWorker and the global CliqzSecureMessage
    // (unless overwritten by tests)
    const CryptoWorkerImpl = args.CryptoWorker || CryptoWorker;
    this._CliqzSecureMessage = args._CliqzSecureMessage || CliqzSecureMessage;

    this.log('MessageSender: starting crypto worker');
    this.cryptoWorker = new CryptoWorkerImpl('message-sender');

    // in the beginning, there are no pending communications
    this.pendingCommunications = Promise.resolve();
  }

  stop({ quick } = { quick: false }) {
    const killWorker = () => {
      const worker = this.cryptoWorker;
      if (worker) {
        this.log('MessageSender: stopping crypto worker');
        delete this.cryptoWorker;
        worker.terminate();
      }
    };

    if (quick) {
      killWorker();
      return Promise.resolve();
    }
    return this.pendingCommunications.then(killWorker, killWorker);
  }

  /**
   * This will sequentially send all given messages.
   *
   * Returns a promise that allows to wait for the operation
   * to complete.
   */
  send(messages) {
    messages.forEach((_msg) => {
      const msg = _msg;
      if (this.hpnv2.isEnabled()) {
        this.hpnv2.action('send', msg).catch(() => {});
      } else {
        this._sendSingleMessage(msg);
      }
    });

    // There is no real error handling, so we ignore rejected
    // promises. Also avoid Promise.all, as we do not want
    // fail-fast behavior.
    return this.pendingCommunications.then(() => {}, () => {});
  }

  _sendSingleMessage(message) {
    const prevPendingSends = this.pendingCommunications;
    this.pendingCommunications = new Promise((resolve, reject) => {
      const _CliqzSecureMessage = this._CliqzSecureMessage;
      const postMessage = () => {
        if (!this.cryptoWorker) {
          this.log('Discarding message, as the web worker is already stopped.');
          reject();
          return;
        }

        // At this point, we know that the worker is idle,
        // so we can overwrite "onmessage".
        this.cryptoWorker.onmessage = (e) => {
          if (e.data.type === 'telemetry') {
            _CliqzSecureMessage.localTemporalUniq = e.data.localTemporalUniq;
            _CliqzSecureMessage.storage.saveLocalCheckTable();
          }

          resolve();
        };

        // Passes one message to the web worker, which does the actual sending.
        try {
          const hpnMsg = {
            msg: message,
            type: 'telemetry',
            sourcemap: _CliqzSecureMessage.sourceMap,
            upk: _CliqzSecureMessage.uPK,
            dspk: _CliqzSecureMessage.dsPK,
            sspk: _CliqzSecureMessage.secureLogger,
            routetable: _CliqzSecureMessage.routeTable,
            localTemporalUniq: _CliqzSecureMessage.localTemporalUniq,
          };
          this.cryptoWorker.postMessage(hpnMsg);
          _CliqzSecureMessage.callListeners(hpnMsg);
        } catch (e) {
          this.log('Failed to send message', e);
          reject(e);
        }
      };

      // Wait until all pending messages are sent. Here, it does not
      // matter if sending was successful or not. In both cases,
      // continue with sending the message to the web worker, which
      // will do the actual work (cryptography + HTTP request).
      return prevPendingSends.then(postMessage).catch(postMessage);
    });
    return this.pendingCommunications;
  }

  log(...message) {
    if (this._CliqzSecureMessage.debug) {
      console.log(...message);
    }
  }
}
