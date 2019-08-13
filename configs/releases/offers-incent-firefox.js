const configBase = require('../offers');
const publish = require('../common/publish');

const id = 'incent@myoffrz.com';

module.exports = Object.assign({}, configBase, {
  publish: publish.toPrereleaseFullName('incent_offers', 'offers_pre', 'firefox', 'zip'),
  settings: Object.assign({}, configBase.settings, {
    id,
    name: 'incentAppName',
    storeName: 'incent_offers', // TODO
    channel: 'MN00', // Incent Offers Firefox Release
    'incent-standalone.enabled': true,
  }),
  versionPrefix: '16',
  specific: 'offers',
  OFFERS_PRODUCT_PREFIX: 'incent',
  OFFERS_PRODUCT_TITLE: 'Incent Offers',
});
