const ghosteryBase = require('../ghostery');
const ciUrl = require('./common/urls');

module.exports = Object.assign({}, ghosteryBase, {
  settings: Object.assign({}, ghosteryBase.settings, {
    channel: '99',
  }, ciUrl),
});
