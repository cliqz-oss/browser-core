const mobileCardsConfig = require('./mobile-cards');
const publish = require('./common/publish');
const urls = require('./common/urls-ghostery')

module.exports = Object.assign({}, mobileCardsConfig, {
  publish: publish.toEdge('cliqz', 'ghostery-android', 'zip'),
  settings: Object.assign({}, mobileCardsConfig.settings, urls),
});
