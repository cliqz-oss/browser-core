// Store messages to process them later
// Sub/unsub is minimal and fragile, only one function can subscribe

module.exports = {
  'core/events': {
    default: {
      msgs: {},
      cbs: {
      },
      sub(channel, cb) {
        this.cbs[channel] = cb;
        if (!this.msgs[channel]) {
          this.msgs[channel] = [];
        }
      },
      un_sub(channel) {
        delete this.cbs[channel];
      },
      pub(ch, ...args) {
        if (!this.msgs[ch]) {
          this.msgs[ch] = [];
        }
        this.msgs[ch].push(args[0]);
        const cb = this.cbs[ch];
        if (cb) {
          cb(...args);
        }
      },

      // helper methods
      clearAll() {
        this.msgs = {};
        this.cbs = {};
      },

      countMsgs(ch) {
        return !this.msgs[ch] ? 0 : this.msgs[ch].length;
      },

      getMessagesForChannel(ch) {
        return this.msgs[ch];
      },
    }
  },
};
