const configBase = require('../offers');
const publish = require('../common/publish');

const id = 'chip@myoffrz.com';

module.exports = Object.assign({}, configBase, {
  publish: publish.toPrereleaseFullName('chip_offers', 'offers_pre', 'firefox', 'zip'),
  settings: Object.assign({}, configBase.settings, {
    id,
    name: 'offersChipAppName',
    channel: 'MC00', // Chip Offers Firefox Release
  }),
  versionPrefix: '14',
  specific: 'offers',
  modules: configBase.modules,
  default_prefs: Object.assign({}, configBase.default_prefs, {
    developer: false,
    showConsoleLogs: false,
    'is-offers-chip-standalone': true,
  }),
  OFFERS_PRODUCT_PREFIX: 'chip',
  OFFERS_PRODUCT_TITLE: 'Chip Offers',
});
