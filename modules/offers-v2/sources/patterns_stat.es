import getDexie from '../platform/lib/dexie';
import ActionID from './offers/actions-defs';
import logger from './common/offers_v2_logger';

// Name of the table is equal to the name of the signal
const dexieSchemaV2 = {
  [ActionID.AID_OFFER_TRIGGERED]: '++id',
  [ActionID.AID_LANDING]: '++id',
  [ActionID.AID_SUCCESS]: '++id',
};
const dexieSchemaLast = {
  ...dexieSchemaV2,
  [ActionID.AID_OFFER_CALL_TO_ACTION]: '++id',
  [ActionID.AID_OFFER_CLOSED]: '++id',
};

/**
 * For important offer (campaign) actions, report how the campaign
 * was matched.
 * @class PatternsStat
 */
class PatternsStat {
  /**
   * @constructor
   * @param {id => OfferMatchTraits} offerIdToReasonFunc
   */
  constructor(offerIdToReasonFunc, signalReEmitter) {
    this.offerIdToReason = offerIdToReasonFunc;
    this.db = null;
    this.signalReEmitter = signalReEmitter;
    this.reinterpretCampaignSignalAsync = this.reinterpretCampaignSignalAsync.bind(this);
  }

  async init() {
    const Dexie = await getDexie();
    // We used Dexie wrongly in old versions. Now, if an user upgrades
    // the extension, the best option is to delete the old database and
    // use the new one.
    await Dexie
      .delete('offers-patterns-stat')
      .catch(e => logger.error(`delete offers-patterns-stat failed, ${e.message}`))
      .then(() => {
        this.db = new Dexie('offers-patterns-stat-v2');
        this.db.version(1).stores(dexieSchemaV2); // Version 1 for historical reason
        this.db.version(3).stores(dexieSchemaLast); // Version 3 to match name `dexieSchemaV3`
      });
    this.signalReEmitter.on('signal', this.reinterpretCampaignSignalAsync);

    this.threadCount = 0; // For unit tests to know that operations are done
  }

  destroy() {
    this.signalReEmitter.unsubscribe('signal', this.reinterpretCampaignSignalAsync);
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
    if (!(collection in dexieSchemaLast) || !this.db) {
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
    if (!(collection in dexieSchemaLast) || !this.db) {
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
    return Object.keys(dexieSchemaLast);
  }

  /**
   * For important signals, store the offer/campaign pattern
   * how it was matched.
   *
   * Offer could matched against several patterns. Report them all.
   *
   * There is a pseudo-patterns to report data inconsistency:
   * `<null>` means the matching information is not stored.
   *
   * @method reinterpretCampaignSignalAsync
   * @param {string} campaignID
   * @param {string} offerID
   * @param {string} signalID
   * @returns {Promise}
   */
  reinterpretCampaignSignalAsync(signalID, campaignID, offerID) {
    if (!(signalID in dexieSchemaLast)) {
      return Promise.resolve(true);
    }
    this.threadCount += 1;
    return Promise.resolve().then(() =>
      this.reinterpretCampaignSignalSync(signalID, campaignID, offerID));
  }

  reinterpretCampaignSignalSync(signalID, campaignId, offerID) {
    const reasonObj = this.offerIdToReason(offerID);
    if (!reasonObj) {
      this.add(signalID, { campaignId, pattern: '<null>' });
    } else {
      const reasonArr = reasonObj.getReason();
      if (!reasonArr) {
        this.add(signalID, { campaignId, pattern: '<null>' });
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

export { PatternsStat, dexieSchemaV2, dexieSchemaLast };
