const configBase = require('../offers');
const publish = require('../common/publish');

const id = 'andnhgfaikmhgffhojpicepiedbemnep';

module.exports = Object.assign({}, configBase, {
  publish: publish.toPrereleaseFullName('chip_sparalarm', 'offers_pre', 'chrome', 'zip'),
  settings: Object.assign({}, configBase.settings, {
    id,
    name: 'chipAppName',
    description: 'chipAppDesc',
    storeName: `sparalarm/${id}`,
    channel: 'MC10', // CHIP Sparalarm Chrome Release
    OFFERS_CHANNEL: 'chip',
    'chip-standalone.enabled': true,
    ONBOARDING_URL: 'https://sparalarm.chip.com/onboarding',
    OFFBOARDING_URL: 'https://sparalarm.chip.com/offboarding',
    SUPPORTED_LANGS: ['de'],
  }),
  versionPrefix: '14',
  specific: 'offers',
  OFFERS_PRODUCT_PREFIX: 'chip',
  OFFERS_PRODUCT_TITLE: 'CHIP Sparalarm',
});
