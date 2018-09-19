import md5 from '../../core/helpers/md5';
import DefaultMap from '../../core/helpers/default-map';
import { TELEMETRY } from '../config';
import Rx from '../../platform/lib/rxjs';
import { getConfigTs } from '../time';
import telemetryService from '../../core/services/telemetry';

const DEFAULT_CONFIG = {
  // token batchs, max 720 messages/hour
  TOKEN_BATCH_INTERVAL: 50000,
  TOKEN_BATCH_SIZE: 10,
  // key batches, max 450 messages/hour
  KEY_BATCH_INTERVAL: 80000,
  KEY_BATCH_SIZE: 10,
  // clean every 4 mins (activity triggered)
  CLEAN_INTERVAL: 240000,
  // batch size of incoming tokens
  TOKEN_BUFFER_TIME: 10000,
  // minium time to wait before a new token can be sent
  NEW_ENTRY_MIN_AGE: 60 * 60 * 1000,
};

function currentDay() {
  return getConfigTs();
}

/**
 * Abstract part of token/key processing logic.
 */
class CachedEntryPipeline {
  constructor(db, primaryKey, logger, options) {
    this.db = db;
    this.cache = new DefaultMap(() => this.newEntry());
    this.primaryKey = primaryKey;
    this.logger = logger;
    this.options = options;
  }

  get(key) {
    return this.cache.get(key);
  }

  /**
   * Loads keys from the database into the map cache. Loading is done by merging with
   * existing values, as defined by #updateCache
   * @param keys
   */
  loadBatchIntoCache(keys) {
    return this.db.where(this.primaryKey).anyOf(keys).each(this.updateCache.bind(this));
  }

  /**
   * Saves the values from keys in the map cache to the database. Cached entries are serialised
   * by #serialiseEntry
   * @param keys
   */
  saveBatchToDb(keys) {
    const rows = keys.map((key) => {
      const entry = this.cache.get(key);
      entry.dirty = false;
      return this.serialiseEntry(key, entry);
    });
    return this.db.bulkPut(rows);
  }

  /**
   * Create an Rx pipeline to process a stream of tokens or keys at regular intervals
   * and pushes generated messages to the outputSubject.
   * @param inputObservable Observable input to the pipeline
   * @param outputSubject Subject for outputed messages
   * @param batchInterval how often to run batches
   * @param batchLimit maximum messages per batch
   */
  init(inputObservable, outputSubject, batchInterval, batchLimit) {
    const bufferInterval = () => Rx.Observable.interval(batchInterval);
    const clearDistinct = new Rx.Subject();
    const retryQueue = new Rx.Subject();
    this.input = inputObservable;
    this.pipelineSubscription = Rx.Observable.merge(
      inputObservable,
      retryQueue.delay(1)
    ).distinct(undefined, clearDistinct)
      .buffer(bufferInterval())
      .filter(batch => batch.length > 0)
      .subscribe(async (batch) => {
        // merge existing entries from DB
        await this.loadBatchIntoCache(batch);
        // extract message and clear
        const toBeSent = batch
          .map(token => [token, this.cache.get(token)])
          .filter(([, { lastSent }]) => lastSent !== currentDay());

        // generate the set of messages to be sent from the candiate list
        const { messages, overflow } = this.createMessagePayloads(toBeSent, batchLimit);
        // get the keys of the entries not being sent this time
        const overflowKeys = new Set(overflow.map(tup => tup[0]));

        // update lastSent for sent messages
        toBeSent.filter(tup => !overflowKeys.has(tup[0]))
          .forEach(([, _entry]) => {
            const entry = _entry;
            entry.lastSent = currentDay();
          });

        await this.saveBatchToDb(batch);
        // clear the distinct map
        clearDistinct.next(true);
        messages.forEach((msg) => {
          outputSubject.next(msg);
        });
        // push overflowed entries back into the queue
        overflowKeys.forEach(k => retryQueue.next(k));

        // send telemetry about batch process
        this.logger.next({
          type: 'tokens.batch',
          signal: {
            source: this.name,
            size: batch.length,
            toBeSentSize: toBeSent.length,
            overflow: overflow.length,
            messages: messages.length,
          },
        });
      });
  }

  unload() {
    if (this.pipelineSubscription) {
      this.pipelineSubscription.unsubscribe();
    }
  }

  /**
   * Periodic task to take unsent values from the database and push them to be sent,
   * as well as cleaning and persisting the map cache.
   */
  async clean() {
    const batchSize = 100;
    // get values from the database which have not yet been sent today
    const notSentToday = (await this.db
      .where('lastSent')
      .notEqual(currentDay())
      .limit(batchSize)
      .sortBy('created'))
      .filter(row => row.created < Date.now() - this.options.NEW_ENTRY_MIN_AGE);
    // check if they have data to send, or are empty objects.
    // - The former are pushed to the batch processing queue
    // - The later can be discarded, as they were just markers for previously sent data
    const toBeDeleted = [];
    notSentToday.forEach((t) => {
      if (this.hasData(t)) {
        // this data should be sent
        this.input.next(t[this.primaryKey]);
      } else {
        toBeDeleted.push(t[this.primaryKey]);
      }
    });
    // delete old entries
    await this.db.where(this.primaryKey).anyOf(toBeDeleted).delete();

    // check the cache for items to persist to the db.
    // if we already sent the data, we can remove it from the cache.
    const saveBatch = [];
    let deleted = 0;
    this.cache.forEach((value, key) => {
      if (value.dirty) {
        saveBatch.push(key);
      } else if (value.lastSent) {
        deleted += 1;
        this.cache.delete(key);
      }
    });
    await this.saveBatchToDb(saveBatch);

    this.logger.next({
      type: 'tokens.clean',
      signal: {
        source: this.name,
        dbSize: await this.db.count(),
        dbDelete: toBeDeleted.length,
        cacheSize: this.cache.size,
        cacheDeleted: deleted,
        processed: notSentToday.length,
      },
    });
  }

  createMessagePayloads(toBeSent, batchLimit) {
    const overflow = batchLimit ? toBeSent.splice(batchLimit) : [];
    return {
      messages: toBeSent.map(this.createMessagePayload.bind(this)),
      overflow,
    };
  }
}

export class TokenPipeline extends CachedEntryPipeline {
  constructor(db, logger, options) {
    super(db, 'token', logger, options);
    this.name = 'tokens';
  }

  newEntry() {
    return {
      created: Date.now(),
      sites: new Set(),
      trackers: new Set(),
      safe: true,
      dirty: true,
    };
  }

  updateCache({ token, lastSent, safe, created, sites, trackers }) {
    const stats = this.cache.get(token);
    if (stats.lastSent === undefined || lastSent > stats.lastSent) {
      stats.lastSent = lastSent;
    }
    stats.safe = safe;
    stats.created = Math.min(stats.created, created);
    sites.forEach((site) => {
      stats.sites.add(site);
    });
    trackers.forEach((tracker) => {
      stats.trackers.add(tracker);
    });
  }

  serialiseEntry(key, tok) {
    const { created, safe, lastSent, sites, trackers } = tok;
    return {
      token: key,
      created,
      safe,
      lastSent: lastSent || '',
      sites: [...sites],
      trackers: [...trackers],
    };
  }

  createMessagePayload([token, stats]) {
    const msg = {
      ts: currentDay(),
      token,
      safe: stats.safe,
      sites: stats.sites.size,
      trackers: stats.trackers.size,
    };
    // clear
    stats.sites.clear();
    stats.trackers.clear();
    return msg;
  }

  hasData(entry) {
    return entry.sites.length > 0 && entry.trackers.length > 0;
  }
}

export class KeyPipeline extends CachedEntryPipeline {
  constructor(db, logger, options) {
    super(db, 'hash', logger, options);
    this.name = 'keys';
  }

  newEntry() {
    return {
      created: Date.now(),
      dirty: true,
      sitesTokens: new DefaultMap(() => (new Map())),
    };
  }

  updateCache({ hash, lastSent, key, tracker, created, sitesTokens }) {
    const stats = this.cache.get(hash);
    if (stats.lastSent === undefined || lastSent > stats.lastSent) {
      stats.lastSent = lastSent;
    }
    stats.key = key;
    stats.tracker = tracker;
    stats.created = Math.min(stats.created, created);
    Object.keys(sitesTokens).forEach((site) => {
      const tokenMap = sitesTokens[site];
      const st = stats.sitesTokens.get(site);
      tokenMap.forEach((safe, token) => {
        st.set(token, safe);
      });
    });
  }

  serialiseEntry(hash, stats) {
    const { created, lastSent, key, tracker, sitesTokens } = stats;
    return {
      hash,
      key,
      tracker,
      created,
      lastSent: lastSent || '',
      sitesTokens: sitesTokens.toObj(),
    };
  }

  createMessagePayloads(toBeSent, batchLimit) {
    // grouping of key messages per site, up to batchLimit
    const groupedMessages = new DefaultMap(() => []);
    const overflow = [];
    toBeSent.forEach((tuple) => {
      const [, stats] = tuple;
      if (groupedMessages.size >= batchLimit) {
        overflow.push(tuple);
      } else {
        stats.sitesTokens.forEach((tokens, site) => {
          // if there are unsafe tokens in the group, make sure this entry is not grouped
          const unsafe = [...tokens.values()].some(t => t === false);
          const extraKey = unsafe ? `${stats.tracker}:${stats.key}` : '';
          groupedMessages.get(`${site}${extraKey}`).push({
            ts: currentDay(),
            tracker: stats.tracker,
            key: stats.key,
            site,
            tokens: [...tokens],
          });
        });
        stats.sitesTokens.clear();
      }
    });
    return {
      messages: [...groupedMessages.values()],
      overflow,
    };
  }

  hasData(entry) {
    return Object.keys(entry.sitesTokens).length > 0;
  }
}

/**
 * Token telemetry: Takes a stream of (tracker, key, value) tuples and generates telemetry in
 * the form:
 *  - (value, n_sites, n_trackers, safe?), with each value sent max once per calendar day
 *  - (key, tracker, site, [values]), with each (key, tracker) tuple sent max once per calendar day
 *
 * The pipeline is constructed as follows:
 *  1. Data comes in from the webrequest-pipeline to #extractKeyTokens
 *  2. Tuples are emitted to #subjectTokens.
 *  3. #_tokenSubscription subscribes to #subjectTokens, groups and batches it, and stores data
 * for each `value` and (tracker, key) tuple in Maps.
 *  4. If entries in the Map caches reach a threshold (not sent today and cross site, or older
 * than NEW_ENTRY_MIN_AGE), they are pushed to the respective send pipelines for tokens or keys.
 *  5. The send pipelines (implemented by CachedEntryPipeline), take a stream of keys from their
 * map cache, and check the conditions for sending, given value this entry may have in the
 * database. Values which pass this check are pushed to the message sending queue.
 *
 * The send pipeline also check their cache and database states periodically to trigger data
 * persistence, or load old data.
 */
export default class TokenTelemetry {
  constructor(telemetry, qsWhitelist, config, database, options = DEFAULT_CONFIG) {
    Object.keys(options).forEach((confKey) => {
      this[confKey] = options[confKey];
    });
    this.telemetry = telemetry;
    this.qsWhitelist = qsWhitelist;
    this.config = config;
    this.subjectTokens = new Rx.Subject();
    this.tokenSendQueue = new Rx.Subject();
    this.keySendQueue = new Rx.Subject();
    this.messageQueue = new Rx.Subject();
    this.telemetrySender = {
      next: ({ type, signal }) => {
        telemetryService.push(signal, `metrics.antitracking.${type}`);
      },
    };
    this.tokens = new TokenPipeline(database.tokens, this.telemetrySender, options);
    this.keys = new KeyPipeline(database.keys, this.telemetrySender, options);
  }

  init() {
    const bufferInterval = () => Rx.Observable.interval(this.TOKEN_BUFFER_TIME);
    const filteredTokens = this.subjectTokens
      .groupBy(el => el.token, undefined, () => Rx.Observable.timer(60000))
      .flatMap(group => group
        .buffer(bufferInterval())
      )
      .filter(batch => batch.length > 0);

    // token subscription pipeline takes batches of tokens (grouped by value)
    // caches their state, and pushes values for sending once they reach a sending
    // threshold.
    this._tokenSubscription = filteredTokens
      .subscribe((batch) => {
        // process a batch of entries for a specific token
        const token = batch[0].token;

        const tokenStats = this.tokens.get(token);
        const entryCutoff = Date.now() - this.NEW_ENTRY_MIN_AGE;
        tokenStats.dirty = true;

        batch.forEach((entry) => {
          tokenStats.sites.add(entry.fp);
          tokenStats.trackers.add(entry.tp);
          tokenStats.safe = tokenStats.safe && entry.safe;

          const keyKey = `${entry.tp}:${entry.key}`;
          const keyStats = this.keys.get(keyKey);
          keyStats.key = entry.key;
          keyStats.tracker = entry.tp;
          keyStats.dirty = true;
          const siteTokens = keyStats.sitesTokens.get(entry.fp);
          siteTokens.set(entry.token, entry.safe);

          if (keyStats.lastSent !== currentDay() &&
            (keyStats.sitesTokens.size > 1 || keyStats.created < entryCutoff)) {
            this.keySendQueue.next(keyKey);
          }
        });
        if (tokenStats.lastSent !== currentDay() &&
          (tokenStats.sites.size > 1 || tokenStats.created < entryCutoff)) {
          this.tokenSendQueue.next(token);
        }
      });

    // pipe tokens sending to messageQueue
    const tokenMessages = new Rx.Subject();
    const keyMessages = new Rx.Subject();
    this.messageQueue = Rx.Observable.merge(
      tokenMessages.map(payload => ({ action: 'attrack.tokensv2', payload })),
      keyMessages.map(payload => ({ action: 'attrack.keysv2', payload })),
    );

    this.tokens.init(this.tokenSendQueue, tokenMessages,
      this.TOKEN_BATCH_INTERVAL, this.TOKEN_BATCH_SIZE);
    this.keys.init(this.keySendQueue, keyMessages,
      this.KEY_BATCH_INTERVAL, this.KEY_BATCH_SIZE);


    // run every x minutes while there is activity
    this._onIdleSubscription = Rx.Observable.merge(
      filteredTokens,
      this.tokenSendQueue,
      this.keySendQueue,
      this.messageQueue,
    ).auditTime(this.CLEAN_INTERVAL)
      .subscribe(async () => {
        await this.tokens.clean();
        await this.keys.clean();
      });

    // batch and throttle message sending to 10/30s
    this._messageSubsription = this.messageQueue
      .subscribe((message) => {
        this.telemetry({
          message,
        });
      });
  }

  unload() {
    this._tokenSubscription.unsubscribe();
    this._messageSubsription.unsubscribe();
    this.tokens.unload();
    this.keys.unload();
    this._onIdleSubscription.unsubscribe();
  }

  extractKeyTokens(state) {
    // ignore private requests
    if (state.isPrivate) return true;

    const keyTokens = state.urlParts.getKeyValuesMD5();
    if (keyTokens.length > 0) {
      // const truncatedDomain = truncateDomain(state.urlParts.host, this.config.tpDomainDepth);
      // const domain = md5(truncatedDomain).substr(0, 16);
      const firstParty = md5(state.sourceUrlParts.generalDomain).substr(0, 16);
      const generalDomain = md5(state.urlParts.generalDomain).substr(0, 16);
      this._saveKeyTokens({
        // thirdParty: truncatedDomain,
        kv: keyTokens,
        firstParty,
        thirdPartyGeneralDomain: generalDomain,
      });
    }
    return true;
  }

  _saveKeyTokens({ kv, firstParty, thirdPartyGeneralDomain }) {
    // anything here should already be hash
    const isTracker = this.qsWhitelist.isTrackerDomain(thirdPartyGeneralDomain);

    // telemetryMode 0: collect nothing, telemetryMode 1: collect only for tracker domains
    if (this.config.telemetryMode === TELEMETRY.DISABLED ||
       (this.config.telemetryMode === TELEMETRY.TRACKERS_ONLY && !isTracker)) {
      return;
    }

    /* eslint camelcase: 'off' */
    kv.forEach(({ k, v, v_len }) => {
      const token = v;
      const key = k;

      if (v_len < 6) {
        return;
      }
      // put token in safe bucket if: value is short, domain is not a tracker,
      // or key or value is whitelisted
      const safe = !isTracker ||
                   this.qsWhitelist.isSafeKey(thirdPartyGeneralDomain, key) ||
                   this.qsWhitelist.isSafeToken(thirdPartyGeneralDomain, token);

      this.subjectTokens.next({
        day: currentDay(),
        key,
        token,
        tp: thirdPartyGeneralDomain,
        fp: firstParty,
        safe,
        isTracker,
      });
    });
  }
}
