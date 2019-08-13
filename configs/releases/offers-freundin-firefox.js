const configBase = require('../offers');
const publish = require('../common/publish');

const id = 'freundin@myoffrz.com';

module.exports = Object.assign({}, configBase, {
  publish: publish.toPrereleaseFullName('freundin_offers', 'offers_pre', 'firefox', 'zip'),
  settings: Object.assign({}, configBase.settings, {
    id,
    name: 'freundinAppName',
    storeName: 'freundin_offers', // TODO
    channel: 'MF00', // Freundin Offers Firefox Release
    OFFERS_CHANNEL: 'freundin',
    'freundin-standalone.enabled': true,
  }),
  versionPrefix: '15',
  specific: 'offers',
  OFFERS_PRODUCT_PREFIX: 'freundin',
  OFFERS_PRODUCT_TITLE: 'Freundin Offers',
});
