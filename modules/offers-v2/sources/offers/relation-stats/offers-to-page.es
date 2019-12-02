import LRU from '../../../core/LRU';
import { matchHostname, matchUrl } from './offers-to-page-utils';
import Offer from '../offer';
import { LANDING_MONITOR_TYPE } from '../../common/constant';

const MAX_PAGES = 128;
const CACHE_TIME_MINUTES = 45;
const PAGE_IMPRESSION_MONITOR_TYPE = 'page_imp';
const RELEVANT_TIME_HOURS = 24;

export default class OffersToPage {
  constructor(store) {
    this.store = store || new LRU(MAX_PAGES);
  }

  statsCached(offers, catMatches, urlData) {
    const url = urlData.getRawUrl();
    const [cachedResult, timestamp] = this.store.get(url) || [];
    const isCacheValid = cachedResult !== undefined && this._cacheStillValid(timestamp);
    if (isCacheValid) { return cachedResult; }
    const stats = this.stats(offers, catMatches, urlData);
    this.store.set(url, [stats, Date.now()]);
    return stats;
  }

  stats(offers, catMatches, urlData) {
    const stats = { touched: [], related: [], tooltip: [], owned: [] };
    const url = urlData.getRawUrl();
    offers.forEach((offerContainer) => {
      const offerId = (offerContainer.offer || {}).offer_id;
      const offer = offerContainer.offer;
      if (this._touchPredicate(offerContainer)) { stats.touched.push(offerId); }
      if (this._tooltipPredicate(offerContainer)) { stats.tooltip.push(offerId); }
      if (this._clientsPredicate(offer, url)) { stats.owned.push(offerId); }
      if (this._commonCatMatchesPredicate(offer, catMatches, urlData)) {
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


  _commonCatMatchesPredicate(offer, catMatches, urlData) {
    const model = new Offer(offer);
    const blacklist = model.hasBlacklistPatterns()
      && model.blackListPatterns.match(urlData.getPatternRequest());
    return !blacklist && catMatches.haveCommonWith(offer.categories);
  }

  _clientsPredicate(offer, url) {
    const landingMonitor = (offer.monitorData || [])
      .find(m => m.signalID === LANDING_MONITOR_TYPE) || {};
    if (matchUrl(landingMonitor.patterns, url)) { return false; }

    const pageImpressionMonitor = (offer.monitorData || [])
      .find(m => m.signalID === PAGE_IMPRESSION_MONITOR_TYPE) || {};
    return matchHostname(pageImpressionMonitor.patterns, url);
  }

  _tooltipPredicate(offerContainer, relevantTime = RELEVANT_TIME_HOURS * 60 * 60 * 1000) {
    const lastUpdated = offerContainer.last_update || 0;
    if (Date.now() - lastUpdated > relevantTime) { return true; }
    const {
      tooltip_shown: { l_u_ts: shown } = {},
    } = offerContainer.offer_actions || {};
    return Date.now() - shown < relevantTime;
  }

  _touchPredicate(offerContainer, relevantTime = RELEVANT_TIME_HOURS * 60 * 60 * 1000) {
    const lastUpdated = offerContainer.last_update || 0;
    if (Date.now() - lastUpdated > relevantTime) { return true; }
    const {
      code_copied: { l_u_ts: codeCopied = 0 } = {},
      offer_closed: { l_u_ts: closed = 0 } = {},
      offer_ca_action: { l_u_ts: caAction = 0 } = {},
      offer_read: { l_u_ts: read = 0 } = {},
      tooltip_clicked: { l_u_ts: tooltipClicked } = {},
      tooltip_closed: { l_u_ts: tooltipClosed } = {},
    } = offerContainer.offer_actions || {};
    return [codeCopied, closed, caAction, read, tooltipClicked, tooltipClosed]
      .some(ts => Date.now() - ts < relevantTime);
  }
}
