const adblocker = require('@cliqz/adblocker');
const tldts = require('tldts-experimental');

module.exports = {
  'platform/lib/adblocker': {
    default: adblocker,
  },
  'platform/lib/tldts': tldts,
};
