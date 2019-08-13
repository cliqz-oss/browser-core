import LRU from '../../../core/LRU';
import { matchHostname, matchUrl } from './offers-to-page-utils';

const MAX_PAGES = 128;
const CACHE_TIME_MINUTES = 45;
const PAGE_IMPRESSION_MONITOR_TYPE = 'page_imp';
const LANDING_MONITOR_TYPE = 'landing';
const RELEVANT_TIME_HOURS = 24;

export default class OffersToPage {
  constructor(store) {
    this.store = store || new LRU(MAX_PAGES);
  }

  statsCached(offers, catMatches, url) {
    const [cachedResult, timestamp] = this.store.get(url) || [];
    const isCacheValid = cachedResult !== undefined && this._cacheStillValid(timestamp);
    if (isCacheValid) { return cachedResult; }
    const stats = this.stats(offers, catMatches, url);
    this.store.set(url, [stats, Date.now()]);
    return stats;
  }

  stats(offers, catMatches, url) {
    const stats = { touched: [], related: [] };
    offers.forEach((offerContainer) => {
      const offerId = (offerContainer.offer || {}).offer_id;
      if (this._touchPredicate(offerContainer)) { stats.touched.push(offerId); }
      if (this._relatedPredicate(offerContainer.offer, catMatches, url)) {
        stats.related.push(offerId);
      }
    });
    return stats;
  }

  invalidateCache(store) {
    this.store = store || new LRU(MAX_PAGES);
  }

  _cacheStillValid(timestamp, cacheTime = CACHE_TIME_MINUTES * 60 * 1000) {
    return (Date.now() - timestamp) < cacheTime;
  }

  _relatedPredicate(offer, catMatches, url) {
    return this._clientsSitePredicate(offer, url)
      || this._commonCatMatchesPredicate(offer, catMatches);
  }

  _commonCatMatchesPredicate(offer, catMatches) {
    return catMatches.haveCommonWith(offer.categories);
  }

  _clientsSitePredicate(offer, url) {
    const landingMonitor = (offer.monitorData || [])
      .find(m => m.signalID === LANDING_MONITOR_TYPE) || {};
    if (matchUrl(landingMonitor.patterns, url)) { return false; }

    const pageImpressionMonitor = (offer.monitorData || [])
      .find(m => m.signalID === PAGE_IMPRESSION_MONITOR_TYPE) || {};
    return matchHostname(pageImpressionMonitor.patterns, url);
  }

  _touchPredicate(offerContainer, relevantTime = RELEVANT_TIME_HOURS * 60 * 60 * 1000) {
    const lastUpdated = offerContainer.last_update || 0;
    if (Date.now() - lastUpdated > relevantTime) { return true; }
    const {
      code_copied: { l_u_ts: codeCopied = 0 } = {},
      offer_closed: { l_u_ts: closed = 0 } = {},
      offer_ca_action: { l_u_ts: caAction = 0 } = {},
      offer_read: { l_u_ts: read = 0 } = {},
    } = offerContainer.offer_actions || {};
    return [codeCopied, closed, caAction, read].some(ts => Date.now() - ts < relevantTime);
  }
}
