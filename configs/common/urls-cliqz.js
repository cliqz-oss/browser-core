const urls = require('./urls');

module.exports = Object.assign(urls('cliqz.com'), {
  SUPPORT_URL: 'https://cliqz.com/support/', // autocomplete/sources/result-providers.es
  PRIVACY_POLICY_URL: 'http://cliqz.com/privacy-browser',
  NEW_TAB_URL: '/freshtab/home.html',

  // Available proxies are: https://proxy[1-100].(cliqz|humanweb).foxyproxy.com
  ENDPOINT_HPNV2_ANONYMOUS: 'https://proxy*.cliqz.foxyproxy.com', // hpnv2/sources/endpoints.es
});
