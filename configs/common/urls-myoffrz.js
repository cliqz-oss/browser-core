const urls = require('./urls');

module.exports = Object.assign(urls('myoffrz.net', 'cdn2'), {
  NEW_TAB_URL: '/freshtab/home.html',

  // Available proxies are: https://proxy[1-100].(cliqz|humanweb).foxyproxy.com
  ENDPOINT_HPNV2_ANONYMOUS: 'https://proxy*.humanweb.foxyproxy.com', // hpnv2/sources/endpoints.es
});
