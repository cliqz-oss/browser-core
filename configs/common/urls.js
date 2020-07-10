/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* please keep keys in this object sorted */
module.exports = (base, cdn = 'cdn') => ({
  ANOLYSIS_BACKEND_URL: `https://anolysis.privacy.${base}`, // anolysis/sources/backend-communication.es
  ANOLYSIS_STAGING_BACKEND_URL: `https://anolysis-staging.privacy.${base}`, // anolysis/sources/backend-communication.es
  BACKGROUND_IMAGE_URL: `https://${cdn}.${base}/brands-database/database/`, // core/sources/utils.es
  BW_URL: `https://antiphishing.${base}/api/v1/`, // anti-phishing/sources/anti-phishing.es
  CDN_BASEURL: `https://${cdn}.${base}`,
  ADBLOCKER_BASE_URL: `https://${cdn}.${base}/adblocker/configs`,
  ANTITRACKING_BASE_URL: `https://${cdn}.${base}/anti-tracking`,
  CONFIG_PROVIDER: `https://api.${base}/api/v1/config`,
  ENDPOINT_ANONPATTERNSURL: `https://${cdn}.${base}/human-web/patterns-anon`,
  ENDPOINT_HPNV2_DIRECT: `https://collector-hpn.${base}`, // hpnv2/sources/endpoints.es
  ENDPOINT_HPNV2_ANONYMOUS: `https://collector-hpn.${base}`, // hpnv2/sources/endpoints.es
  ENDPOINT_HUMAN_WEB_PATTERNS: `https://${cdn}.${base}/human-web/hw-patterns.gz`,
  ENDPOINT_PATTERNSURL: `https://${cdn}.${base}/human-web/patterns`,
  ENDPOINT_SAFE_QUORUM_ENDPOINT: `https://safe-browsing-quorum.privacy.${base}/`,
  ENDPOINT_SAFE_QUORUM_PROVIDER: `https://safe-browsing-quorum.privacy.${base}/config`,
  FEEDBACK: `https://${base}/feedback/`, // core/sources/utils.es
  // not used as URL, but as key to signal to ambassor to fetch news
  HB_NEWS: `hb-news.${base}`, // freshtab/sources/news.es, history/sources/rich-header-proxy.es
  OFFERS_BE_BASE_URL: `https://offers-api.${base}`,
  // expected to be unbranded as this is only use for testing purpouses
  OFFERS_STAGING_BASE_URL: 'https://offers-api-staging-myo.myoffrz.ninja',
  PRIVACY_SCORE_URL: `https://anti-tracking.${base}/api/v1/score?`, // antitracking/sources/privacy-score.es
  TRACKER_SCORE_URL: `https://${cdn}.${base}/privacy-score/privacy_score.json`, // whotracksme/source/background.es
  RESULTS_PROVIDER: `https://api.${base}/api/v2/results?nrh=1&q=`, // core/config.es
  RESULTS_PROVIDER_LOG: `https://api.${base}/api/v1/logging?q=`, // core/config.es
  RICH_HEADER: `https://api.${base}/api/v2/rich-header?path=/v2/map`,
  // not used as URL, but as key to signal to ambassor to fetch news
  ROTATED_TOP_NEWS: `rotated-top-news.${base}`, // freshtab/sources/news.es
  SAFE_BROWSING: `https://safe-browsing.${base}`, // core/sources/utils.es
  STATISTICS: `https://stats.${base}`, // core/sources/utils.es
  SUGGESTIONS_URL: `https://${base}/search?q=`, // dropdown/sources/results/suggestions.es, freshtab/sources/background.es, history/sources/background.es, history/sources/content.es
  UNINSTALL: `https://${base}/home/offboarding`, // core/sources/utils.es
  WTM_API: 'https://whotracks.me/data/',
  ANTIPHISHING_BLOOMFILTER: `https://${cdn}.${base}/anti-phishing/bloom_filter.json.gz`
});
