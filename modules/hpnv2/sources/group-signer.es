import config from '../core/config';
import console from '../core/console';

// TODO: check spanan https://github.com/chrmod/spanan/
export default class GroupSigner {
  constructor() {
    const _ = (fn) => {
      this[fn] = (...args) => {
        const id = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
        return new Promise((resolve, reject) => {
          // TODO: transfer ownership of arraybuffers
          this.promises[id] = { resolve, reject };
          this.worker.postMessage({
            id,
            fn,
            args
          });
        });
      };
    };

    _('init');
    _('seed');
    _('setGroupPubKey');
    _('setUserPrivKey');
    _('getUserPrivKey');
    _('startJoin');
    _('finishJoin');
    _('sign');
    _('startJoinStatic');
    _('finishJoinStatic');

    this.worker = new Worker(`${config.baseURL}hpnv2/worker.bundle.js`);
    this.promises = {};
    this.worker.onmessage = (args) => {
      if (args.data.logMessage) {
        const msg = args.data.logMessage;
        console[msg.type](...msg.args);
        return;
      }

      const { data: { id, data, error } } = args;
      const p = this.promises[id];
      delete this.promises[id];
      if (error) {
        p.reject(new Error(error));
      } else {
        p.resolve(data);
      }
    };
  }

  unload() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
