import getDexie from '../platform/lib/dexie';
import prefs from '../core/prefs';
import logger from './common/offers_v2_logger';
import moment from '../platform/lib/moment';


export default class Behavior {
  constructor() {
    this.db = null;
  }

  async init() {
    const Dexie = await getDexie();
    this.db = new Dexie('myoffrz-behavior');
    this.db.version(1).stores({
      purchase: '++id,date,domain',
      signals: '++id,date'
    });
    await this.db.open();
  }

  unload() {
    if (this.db) {
      this.db.close();
    }
  }

  async onPurchase(payload) {
    logger.log(payload, 'onPurchase');
    await prefs.init();
    const date = prefs.get('config_ts');
    if (!date) { return; }
    const { domain, categories, price/* , itemCount */ } = payload;
    const doc = {
      date,
      domain, // hashed
      price,
      categories,
      // TODO: add itemCount
    };
    await this.db.purchase.add(doc);
    await this.generatePurchaseSignals({ domain, price, categories/* , itemCount */ }, date);
  }

  async generatePurchaseSignals({ domain, price, categories/* , itemCount */ }, date) {
    // Current event
    const pastOnDomain = await this.db.purchase.where('domain').equals(domain).count();
    const pastAll = await this.db.purchase.count();
    this.db.signals.add({
      payload: {
        type: 'purchase',
        domain,
        pastOnDomain: !!pastOnDomain, // first or not
        pastAll: !!pastAll,
        date,
        // TODO: add itemCount
      }
    });

    if (price) {
      this.db.signals.add({
        payload: {
          type: 'purchasePrice',
          price: this.getPriceBucket(price),
          date,
        }
      });
    }

    if (categories && categories.length > 0) {
      this.db.signals.add({
        payload: {
          type: 'purchaseCategories',
          categories,
          date,
        }
      });
    }

    await new Promise((resolve) => {
      this.db.purchase.orderBy('domain').uniqueKeys((domains) => {
        const count = domains.length;
        if (count > 0) {
          this.db.signals.add({
            payload: {
              type: 'purchaseCount',
              purchaseCount: pastAll + 1,
              shopCount: count,
              date,
            }
          });
        }
      });
      resolve();
    });
  }

  getPriceBucket(price) {
    const cuts = [10, 50, 100, 500]; // TODO: make this configurable
    for (let i = 0; i < cuts.length; i += 1) {
      if (price < cuts[i]) {
        if (i === 0) { return `< ${cuts[i]}`; }
        return `${cuts[i - 1]} - ${cuts[i]}`;
      }
    }
    return `>=${cuts[cuts.length - 1]}`;
  }

  getSignals() {
    // TODO: put a limit on size
    return this.db.signals.toArray();
  }

  clearSignals() {
    return this.db.signals.clear();
  }

  clearPurchases() {
    return this.db.purchase.clear();
  }

  clearOldBehavior() {
    let date = prefs.get('config_ts');
    if (date) {
      date = moment(date, 'YYYYMMDD').subtract(30, 'day').format('YYYYMMDD');
      return this.db.purchase.where('date').below(date).delete();
    }
    return Promise.resolve();
  }

  async clear() {
    await this.clearSignals();
    await this.clearPurchases();
  }
}
