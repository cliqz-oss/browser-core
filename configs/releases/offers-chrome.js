const configBase = require('../offers');
const publish = require('../common/publish');

const id = 'eoofgbeobdepdoihpmogabekjddpcbei';

module.exports = Object.assign({}, configBase, {
  publish: publish.toPrereleaseFullName('myoffrz', 'offers_pre', 'chrome', 'zip'),
  settings: Object.assign({}, configBase.settings, {
    id,
    name: 'offersAppName',
    storeName: `myoffrz/${id}`,
    channel: 'MO10', // MyOffrz Chrome Release
  }),
});
