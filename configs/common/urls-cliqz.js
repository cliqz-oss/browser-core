const urls = require('./urls');

module.exports = Object.assign(urls('cliqz.com'), {
  SUPPORT_URL: 'https://cliqz.com/support/', // autocomplete/sources/result-providers.es
  TEAM_URL: 'https://cliqz.com/team/', // autocomplete/sources/result-providers.es
  TRIQZ_URL: 'https://cliqz.com/tips', // control-center/sources/window.es
  PRIVACY_POLICY_URL: 'http://cliqz.com/privacy-browser',
  LOCATION_SHARING_URL: 'https://cliqz.com/support/local-results',
  MYOFFRZ_URL: 'https://cliqz.com/myoffrz',
  REPORT_SITE_URL: 'https://cliqz.com/report-url',
});
