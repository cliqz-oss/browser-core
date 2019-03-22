const punycode = require('punycode');

module.exports = {
  'platform/crypto': { },
  'core/crypto/random': {
    default: function () { // random
      return Math.random();
    }
  },
  'core/utils': {
    default: {
      extensionVersion: '1.28.1',
      telemetry: () => {},
    },
  },
  'core/platform': {
    isChromium: false,
    isWebExtension: false,
    getResourceUrl: url => `baseUrl/${url}`,
  },
  'platform/globals': {
  },
  'platform/console': {
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
        action: () => {},
      }),
    },
  },
  'platform/lib/punycode': {
    default: punycode,
  },
};
