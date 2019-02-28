const urls = require('./urls');

module.exports = Object.assign(urls('ghostery.net'), {
  SUPPORT_URL: 'https://ghostery.zendesk.com/hc/en-us', // autocomplete/sources/result-providers.es
  TRIQZ_URL: 'https://cliqz.com/tips', // control-center/sources/window.es
  PRIVACY_POLICY_URL: 'https://www.ghostery.com/about-ghostery/privacy-statements/',
  LOCATION_SHARING_URL: 'https://cliqz.com/support/local-results',
  MYOFFRZ_URL: 'https://cliqz.com/myoffrz',
  REPORT_SITE_URL: 'https://cliqz.com/report-url',
  NEW_TAB_URL: "/freshtab/home.html",


  // human-web:
  ENDPOINT_PATTERNSURL: 'https://cdn2.ghostery.com/human-web-chromium/patterns.gz',
  ENDPOINT_ANONPATTERNSURL: 'https://cdn2.ghostery.com/human-web-chromium/patterns-anon.gz',
});
