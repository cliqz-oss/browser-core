
const urls = require('./common/urls-cliqz');
const base = require('./common/system');

module.exports = {
  "platform": "web",
  "brocfile": "Brocfile.serp.js",
  "baseURL": "./",
  "pack": "echo ok",
  "publish": "aws s3 sync build s3://cdncliqz/update/edge/serp/$BRANCH_NAME/$VERSION/ --acl public-read && aws s3 sync s3://cdncliqz/update/edge/serp/$BRANCH_NAME/$VERSION/ s3://cdncliqz/update/edge/serp/$BRANCH_NAME/latest/ --acl public-read",
  "settings": Object.assign({}, urls, {
    RESULTS_PROVIDER: 'https://api.cliqz.com/api/v2/results?serp_search=1&q=',
    'search.config.operators.limit.limits.cliqz': 20,
    'search.config.providers.cliqz.count': 30,
    'search.config.providers.cliqz.jsonp': true,
    'search.config.providers.instant.isEnabled': false,
    'search.config.operators.streams.waitForAllProviders': true,
  }),
  'default_prefs' : {
    'modules.dropdown.enabled': false,
  },
  'modules': [
    'core',
    'search',
    'dropdown',
    'serp',
  ],
  'bundles': [
    'serp/serp.bundle.js',
    'dropdown/dropdown.bundle.js',
  ],
  system: Object.assign({}, base.systemConfig, {}),
  builderDefault: base.builderConfig,
}
