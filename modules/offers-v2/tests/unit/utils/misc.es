const jsep = require('jsep');
const pako = require('pako');

module.exports = {
  'platform/crypto': { },
  'platform/lib/zlib': pako,
  'platform/lib/jsep': {
    default: jsep,
  },
  'core/crypto/random': {
    default: function () { // random
      return Math.random();
    }
  },
  'core/services/telemetry': {
    default: {
      push: () => {},
    },
  },
  'core/platform': {
    isChromium: false,
    isWebExtension: false,
    getResourceUrl: url => `baseUrl/${url}`,
  },
  'platform/globals': {
  },
  'core/console': {
    isLoggingEnabled: () => false,
    default: {}
  },
  'platform/history/history': {
    default: {
      queryVisitsForTimespan: () => [],
    },
  },
  'platform/resource-loader-storage': {
    default: class {
      load() { return Promise.reject(new Error('Not implemented in mock: Storage.load')); }

      save() { return Promise.reject(new Error('Not implemented in mock: Storage: save')); }
    }
  },
  'core/kord/inject': {
    default: {
      service: () => {},
      module: () => ({
        action: (aname) => {
          if (aname !== 'getTime') { // hpn2
            return {};
          }
          const now = new Date();
          return {
            inSync: true,
            utcTimestamp: now,
            minutesSinceEpoch: Math.floor(now.valueOf() / 1000 / 60),
          };
        },
      }),
      app: {
        version: '1.28.1',
      },
    },
  },
};
