const configBase = require('../offers');
const publish = require('../common/publish');

const id = 'myoffrz@cliqz.com';

module.exports = Object.assign({}, configBase, {
  publish: publish.toPrereleaseFullName('myoffrz', 'offers_pre', 'firefox', 'zip'),
  settings: Object.assign({}, configBase.settings, {
    id,
    name: 'offersAppName',
    storeName: 'myoffrz',
    channel: 'MO00', // MyOffrz Firefox Release
  }),
});
