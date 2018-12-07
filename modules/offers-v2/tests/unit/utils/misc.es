module.exports = {
  'platform/crypto': { },
  'core/crypto/random': {
    random: function () {
      return Math.random();
    }
  },
  'core/utils': {
    default: {
      extensionVersion: '1.28.1'
    },
  },
  'core/platform': {
    isChromium: false,
    isWebExtension: false,
  },
  'platform/globals': {
  },
  'platform/console': {
    default: {}
  },
};
