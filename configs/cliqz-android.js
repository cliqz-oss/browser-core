const mobileCardsConfig = require('./mobile-cards');
const publish = require('./common/publish');
const urls = require('./common/urls-cliqz')

module.exports = Object.assign({}, mobileCardsConfig, {
  publish: publish.toEdge('cliqz', 'cliqz-android', 'zip'),
  settings: Object.assign({}, mobileCardsConfig.settings, urls),
});
