import getDexie from '../platform/lib/dexie';
import ActionID from './offers/actions-defs';
import logger from './common/offers_v2_logger';

// Name of the table is equal to the name of the signal
const dexieSchema = {
  [ActionID.AID_OFFER_TRIGGERED]: '++id',
  [ActionID.AID_LANDING]: '++id', // click on an offer
  [ActionID.AID_SUCCESS]: '++id', // offer conversion
};

/**
 * For important offer (campaign) actions, report how the campaign
 * was matched.
 * @class PatternsStat
 */
export default class PatternsStat {
  /**
   * @constructor
   * @param {id => OfferMatchTraits} offerIdToReasonFunc
   */
  constructor(offerIdToReasonFunc) {
    this.offerIdToReason = offerIdToReasonFunc;
    this.db = null;
  }

  async init() {
    const Dexie = await getDexie();
    await Dexie
      .delete('offers-patterns-stat')
      .catch(e => logger.error(`delete offers-patterns-stat failed, ${e.message}`))
      .then(() => {
        this.db = new Dexie('offers-patterns-stat-v2');
        this.db.version(1).stores(dexieSchema);
      });

    this.threadCount = 0; // For unit tests to know that operations are done
  }

  destroy() {
    if (this.db) {
      this.db.close(); // sync operation
      this.db = null;
    }
  }

  /**
   * @method add
   * @param {string} collection
   * @param {object} data
   * @returns {Promise}
   */
  async add(collection, data = {}) {
    if (!(collection in dexieSchema) || !this.db) {
      logger.warn(`PatternsStat: unknown collection name '${collection}'`);
      return;
    }
    const db = await this.db;
    db[collection]
      .add(data)
      .catch(err => this._logError(err, collection, 'add', data));
  }

  /**
   * @method moveAll
   * @param {string} collection
   * @returns {Promise<object[]>}
   * Structure of each item:
   * <pre>
   *   {
   *     counter: number,
   *     campaignId: string,
   *     pattern: string,
   *     type: string, // signal name
   *   }
   * </pre>
   */
  async moveAll(collection) {
    if (!(collection in dexieSchema) || !this.db) {
      logger.warn(`PatternsStat: unknown collection name '${collection}'`);
      return [];
    }
    const data = this.group(collection);
    const db = await this.db;
    db[collection]
      .clear()
      .catch(err => this._logError(err, collection, 'clear'));
    return data;
  }

  async group(collection) {
    if (!this.db) { return []; }
    const map = new Map();
    const db = await this.db;
    await db[collection]
      .each(item => this.collector(collection, item, map))
      .catch(err => this._logError(err, collection, 'each'));
    return [...map.values()];
  }

  collector(collection, { campaignId, pattern, domainHash }, map) {
    const key = `${campaignId},${pattern},${domainHash}`;
    const defaultValue = {
      counter: 0,
      campaignId,
      pattern,
      domainHash,
      type: collection,
    };
    const item = map.get(key) || defaultValue;
    item.counter += 1;
    map.set(key, item);
  }

  /**
   * @method getPatternSignals
   * @returns {string[]}
   */
  getPatternSignals() {
    return Object.keys(dexieSchema);
  }

  /**
   * For important signals, store the offer/campaign pattern
   * how it was matched.
   *
   * Offer could matched against several patterns. Report them all.
   *
   * There are two pseudo-patterns to report data inconsistency:
   * - `<null>` means the matching information is not stored
   * - `<empty>` means that information is found, but emptry
   *
   * @method reinterpretCampaignSignalAsync
   * @param {string} campaignID
   * @param {string} offerID
   * @param {string} signalID
   * @returns {Promise}
   */
  reinterpretCampaignSignalAsync(campaignID, offerID, signalID) {
    if (!(signalID in dexieSchema)) {
      return Promise.resolve(true);
    }
    this.threadCount += 1;
    return Promise.resolve().then(() =>
      this.reinterpretCampaignSignalSync(campaignID, offerID, signalID));
  }

  reinterpretCampaignSignalSync(campaignId, offerID, signalID) {
    const reasonObj = this.offerIdToReason(offerID);
    if (!reasonObj) {
      this.add(signalID, { campaignId, pattern: '<null>' });
    } else {
      const reasonArr = reasonObj.getReason();
      if (!reasonArr) {
        this.add(signalID, { campaignId, pattern: '<null>' });
      } else if (!reasonArr.length) {
        this.add(signalID, { campaignId, pattern: '<empty>' });
      } else {
        reasonArr.forEach(({ pattern, domainHash }) =>
          this.add(signalID, { campaignId, pattern, domainHash }));
      }
    }
    this.threadCount -= 1;
  }

  _logError(err, collection, operation, data = {}) {
    const dataStr = JSON.stringify(data);
    logger.error(
      `PatternsStat failed: collection -> ${collection},
        operation -> ${operation}, data -> ${dataStr}, err -> ${err.message}`
    );
  }
}
