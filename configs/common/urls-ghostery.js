const urls = require('./urls');

module.exports = Object.assign(urls('ghostery.net'), {
  SUPPORT_URL: 'https://ghostery.zendesk.com/hc/en-us', // autocomplete/sources/result-providers.es
  TEAM_URL: 'https://cliqz.com/team/', // autocomplete/sources/result-providers.es
  TRIQZ_URL: 'https://cliqz.com/tips', // control-center/sources/window.es
  PRIVACY_POLICY_URL: 'https://www.ghostery.com/about-ghostery/privacy-statements/',
  LOCATION_SHARING_URL: 'https://cliqz.com/support/local-results',
  MYOFFRZ_URL: 'https://cliqz.com/myoffrz',
  REPORT_SITE_URL: 'https://cliqz.com/report-url',

  // human-web:
  ENDPOINT_PATTERNSURL: 'https://cdn2.ghostery.com/human-web-chromium/patterns.gz',
  ENDPOINT_ANONPATTERNSURL: 'https://cdn2.ghostery.com/human-web-chromium/patterns-anon.gz',
  ENDPOINT_BLIND_SIGNER: 'https://ghostery-sign.ghostery.com/sign',
  ENDPOINT_USER_REG: 'https://ghostery-sign.ghostery.com/register',
  ENDPOINT_KEYS_PROVIDER: 'https://ghostery-collector.ghostery.com/signerKey',
  ENDPOINT_LOOKUP_TABLE_PROVIDER: 'https://ghostery-collector.ghostery.com/v2/lookuptable',
  ENDPOINT_SAFE_QUORUM_ENDPOINT: 'https://safe-browsing-quorum.ghostery.com/',
  ENDPOINT_SAFE_QUORUM_PROVIDER: 'https://safe-browsing-quorum.ghostery.com/config',
  ENDPOINT_SOURCE_MAP_PROVIDER: 'https://ghostery-collector.ghostery.com/sourcemapjson',
});
