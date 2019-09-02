import SimpleDB from '../../../core/persistence/simple-db';
import OfferJob from '../../offers/jobs/job';
import ActionId from '../../offers/actions-defs';
import logger from '../../common/offers_v2_logger';
import RedirectTagger from './redirect-tagger';

class SuspendFilter extends OfferJob {
  constructor(suspendedDomains) {
    super('chipde');
    this.suspendedDomains = suspendedDomains;
  }

  process(offers, { urlData, offerIsFilteredOutCb }) {
    const domain = urlData.getGeneralDomain();
    const tsUntilSuspended = this.suspendedDomains.get(domain);
    if (tsUntilSuspended) {
      if (Date.now() > tsUntilSuspended) {
        this.suspendedDomains.delete(domain);
      } else {
        offers.forEach(offer =>
          offerIsFilteredOutCb(offer, ActionId.AID_OFFER_FILTERED_CHIPDE_SUSPEND_LIST));
        return Promise.resolve([]);
      }
    }
    return Promise.resolve(offers);
  }
}

export default class ChipdeHandler {
  constructor(db, webrequestPipeline) {
    this.db = new SimpleDB(db);
    this.onRedirectTarget = this.onRedirectTarget.bind(this);
    this.redirectTagger = new RedirectTagger(webrequestPipeline, this.onRedirectTarget);
    // We do not cleanup `suspendedDomains`: the number of sites where
    // chip.de is an affiliate is limited and not big.
    this.suspendedDomains = new Map();
  }

  async init() {
    await this.redirectTagger.init();
    this.suspendedDomains.clear();
    const domains = await this.db.get('chipde-suspend-domains');
    if (domains && domains.data) {
      try {
        const savedDomains = new Map(JSON.parse(domains.data));
        savedDomains.forEach((ts, domain) => this.suspendedDomains.set(domain, ts));
      } catch (e) {
        logger.warn('chipdeHandler: can not load suspended domains:', e);
      }
    }
    // Like a blacklist
    this.suspendedDomains.set('chip.de', Date.now() + 1000 * 24 * 60 * 60 * 1000);
  }

  async unload() {
    await this.saveSites();
    await this.redirectTagger.unload();
  }

  async saveSites() {
    const data = JSON.stringify([...this.suspendedDomains]);
    await this.db.upsert('chipde-suspend-domains', { data });
  }

  onRedirectTarget(generalDomain) {
    this.suspendedDomains.set(generalDomain, Date.now() + 24 * 60 * 60 * 1000);
    this.saveSites(); // async, but do not wait
  }

  getOffersJobFilter() {
    return new SuspendFilter(this.suspendedDomains);
  }
}
