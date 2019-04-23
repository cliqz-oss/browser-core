/* please keep keys in this object sorted */
module.exports = (base) => ({
  ANOLYSIS_BACKEND_URL: 'https://anolysis.privacy.'+base, // anolysis/sources/backend-communication.es
  ANOLYSIS_STAGING_BACKEND_URL: 'https://anolysis-staging.privacy.'+base, // anolysis/sources/backend-communication.es
  BACKGROUND_IMAGE_URL: 'https://cdn.'+base+'/brands-database/database/', // core/sources/utils.es
  BW_URL: 'https://antiphishing.'+base+'/api/bwlist?md5=', // anti-phishing/sources/anti-phishing.es
  CDN_BASEURL: 'https://cdn.'+base,
  ADBLOCKER_BASE_URL: `https://cdn.${base}/adblocker/configs`,
  CLIQZ_SAVE_URL: 'https://'+base+'/q=', // core/sources/utils.es (Need to find a more suitable name for this.)
  CONFIG_PROVIDER: 'https://api.'+base+'/api/v1/config',
  ENDPOINT_ANONPATTERNSURL: 'https://cdn.'+base+'/human-web/patterns-anon',
  ENDPOINT_HPNV2_DIRECT: 'https://collector-hpn.'+base+'', // hpnv2/sources/endpoints.es
  ENDPOINT_HPNV2_ANONYMOUS: 'https://collector-hpn.'+base+'', // hpnv2/sources/endpoints.es
  ENDPOINT_PATTERNSURL: 'https://cdn.'+base+'/human-web/patterns',
  ENDPOINT_SAFE_QUORUM_ENDPOINT: 'https://safe-browsing-quorum.privacy.'+base+'/',
  ENDPOINT_SAFE_QUORUM_PROVIDER: 'https://safe-browsing-quorum.privacy.'+base+'/config',
  FEEDBACK: 'https://'+base+'/feedback/', // core/sources/utils.es
  HB_NEWS: 'hb-news.'+base+'', // freshtab/sources/news.es, history/sources/rich-header-proxy.es
  HOMPAGE_URL: 'https://'+base+'/', // autocomplete/sources/result-providers.es, history/sources/history-dto.es (Need to check for trailing slash)
  OFFERS_BE_BASE_URL: 'https://offers-api.'+base+'',
  PRIVACY_SCORE_URL: 'https://anti-tracking.'+base+'/api/v1/score?', // antitracking/sources/privacy-score.es
  RESULTS_PROVIDER: 'https://api.'+base+'/api/v2/results?nrh=1&q=', // core/config.es
  RESULTS_PROVIDER_LOG: 'https://api.'+base+'/api/v1/logging?q=', // core/config.es
  RICH_HEADER: 'https://api.'+base+'/api/v2/rich-header?path=/v2/map',
  ROTATED_TOP_NEWS: 'rotated-top-news.'+base+'', // freshtab/sources/news.es
  SAFE_BROWSING: 'https://safe-browsing.'+base+'', // core/sources/utils.es
  STATISTICS: 'https://stats.'+base+'', // core/sources/utils.es
  SUGGESTIONS_URL: 'https://'+base+'/search?q=', // dropdown/sources/results/suggestions.es, freshtab/sources/background.es, history/sources/background.es, history/sources/content.es
  UNINSTALL: 'https://'+base+'/home/offboarding', // core/sources/utils.es
  WTM_API: 'https://whotracks.me/data/',
});
