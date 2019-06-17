import loggerManager from '../core/logger';
import config from '../core/config';

function stringify(obj) {
  return (typeof obj === 'string') ? obj : JSON.stringify(obj);
}

export default {
  requiresServices: [
    'test-helpers'
  ],

  init() {
    // Send logger messages to TAP, which will forward them to `fern.js`
    if (config.EXTENSION_LOG) {
      this.logChannel = new BroadcastChannel('extlog');
      loggerManager.addObserver((level, ...args) => {
        const stringArgs = args.map(stringify);
        const msg = stringArgs.join(',,, ');
        this.logChannel.postMessage({ level, msg });
      });
    }
  },

  unload() {
    if (this.logChannel) {
      this.logChannel.close();
    }
  }
};
