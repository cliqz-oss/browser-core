/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Subject, interval, timer, of, merge } from 'rxjs';
import { groupBy, flatMap, filter, map, delay, distinct, buffer, auditTime } from 'rxjs/operators';
import md5, { truncatedHash } from '../../core/helpers/md5';
import DefaultMap from '../../core/helpers/default-map';
import { TELEMETRY } from '../config';
import { getConfigTs } from '../time';
import inject from '../../core/kord/inject';

const DEFAULT_CONFIG = {
  // token batchs, max 720 messages/hour
  TOKEN_BATCH_INTERVAL: 50000,
  TOKEN_BATCH_SIZE: 2,
  TOKEN_MESSAGE_SIZE: 10,
  // key batches, max 450 messages/hour
  KEY_BATCH_INTERVAL: 80000,
  KEY_BATCH_SIZE: 10,
  // clean every 4 mins (activity triggered)
  CLEAN_INTERVAL: 240000,
  // batch size of incoming tokens
  TOKEN_BUFFER_TIME: 10000,
  // minium time to wait before a new token can be sent
  NEW_ENTRY_MIN_AGE: 60 * 60 * 1000,
  // criteria for not sending data
  MIN_COUNT: 1,
  LOW_COUNT_DISCARD_AGE: 1000 * 60 * 60 * 24 * 3,
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
    const entry = this.cache.get(key);
    entry.count += 1;
    return entry;
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
    const bufferInterval = () => interval(batchInterval);
    const clearDistinct = new Subject();
    const retryQueue = new Subject();
    this.input = inputObservable;
    this.pipelineSubscription = merge(
      inputObservable,
      retryQueue.pipe(delay(1))
    ).pipe(
      distinct(undefined, clearDistinct),
      buffer(bufferInterval()),
      filter(batch => batch.length > 0)
    ).subscribe(async (batch) => {
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
    const batchSize = 1000;
    // max messages will will push from this clean - next clean will be triggered by the time
    // the queue empties
    const maxSending = Math.ceil(
      (this.options.CLEAN_INTERVAL / this.options.TOKEN_BATCH_INTERVAL)
      * (this.options.TOKEN_BATCH_SIZE * this.options.TOKEN_MESSAGE_SIZE)
    );
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
    const queuedForSending = [];
    const pruneCutoff = Date.now() - this.options.LOW_COUNT_DISCARD_AGE;
    notSentToday.forEach((t) => {
      const hasData = this.hasData(t);
      const minCount = t.count > this.options.MIN_COUNT;
      if (hasData && minCount) {
        // this data should be sent
        queuedForSending.push(t[this.primaryKey]);
      } else if (!hasData || t.createdAt < pruneCutoff) {
        // data has been sent, or this is old data that has not reached the threshold
        toBeDeleted.push(t[this.primaryKey]);
      }
    });
    // push first maxSending entries to input queue
    queuedForSending.splice(maxSending);
    queuedForSending.forEach(v => this.input.next(v));
    // delete old entries
    const dbDeleted = await this.db.where(this.primaryKey).anyOf(toBeDeleted).delete();

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
    await this.saveBatchToDb(saveBatch, {
      source: this.name,
      dbSize: await this.db.count(),
      dbDelete: dbDeleted,
      cacheSize: this.cache.size,
      cacheDeleted: deleted,
      processed: queuedForSending.length,
    });
    this.logger.next({
      type: 'tokens.clean',
      signal: {
        source: this.name,
        dbSize: await this.db.count(),
        dbDelete: toBeDeleted.length,
        cacheSize: this.cache.size,
        cacheDeleted: deleted,
        processed: queuedForSending.length,
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
      count: 0,
    };
  }

  updateCache({ token, lastSent, safe, created, sites, trackers, count }) {
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
    stats.count = Math.max(stats.count, count);
  }

  serialiseEntry(key, tok) {
    const { created, safe, lastSent, sites, trackers, count } = tok;
    return {
      token: key,
      created,
      safe,
      lastSent: lastSent || '',
      sites: [...sites],
      trackers: [...trackers],
      count,
    };
  }

  createMessagePayloads(toBeSent, batchLimit) {
    const overflow = batchLimit ? toBeSent.splice(batchLimit * this.options.TOKEN_MESSAGE_SIZE)
      : [];
    // group into batchs of size TOKEN_MESSAGE_SIZE
    const nMessages = Math.ceil(toBeSent.length / this.options.TOKEN_MESSAGE_SIZE);
    const messages = [...new Array(nMessages)]
      .map((_, i) => {
        const baseIndex = i * this.options.TOKEN_MESSAGE_SIZE;
        return toBeSent.slice(baseIndex, baseIndex + this.options.TOKEN_MESSAGE_SIZE);
      })
      .map(batch => batch.map(this.createMessagePayload.bind(this)));
    return {
      messages,
      overflow,
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
    /* eslint no-param-reassign: 'off' */
    stats.count = 0;
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
      count: 0,
    };
  }

  updateCache({ hash, lastSent, key, tracker, created, sitesTokens, count }) {
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
    stats.count = Math.max(stats.count, count);
  }

  serialiseEntry(hash, stats) {
    const { created, lastSent, key, tracker, sitesTokens, count } = stats;
    return {
      hash,
      key,
      tracker,
      created,
      lastSent: lastSent || '',
      sitesTokens: sitesTokens.toObj(),
      count,
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
        stats.count = 0;
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
  constructor(telemetry, qsWhitelist, config, database, shouldCheckToken, options) {
    const opts = { ...DEFAULT_CONFIG, ...options };
    Object.keys(DEFAULT_CONFIG).forEach((confKey) => {
      this[confKey] = opts[confKey];
    });
    this.telemetry = telemetry;
    this.qsWhitelist = qsWhitelist;
    this.config = config;
    this.shouldCheckToken = shouldCheckToken;
    this.subjectTokens = new Subject();
    this.tokenSendQueue = new Subject();
    this.keySendQueue = new Subject();
    this.messageQueue = new Subject();
    this.telemetrySender = {
      next: ({ type, signal }) => {
        inject.service('telemetry', ['push']).push(signal, `metrics.antitracking.${type}`);
      },
    };
    this.tokens = new TokenPipeline(database.tokens, this.telemetrySender, opts);
    this.keys = new KeyPipeline(database.keys, this.telemetrySender, opts);
  }

  init() {
    const bufferInterval = () => interval(this.TOKEN_BUFFER_TIME);
    const filteredTokens = this.subjectTokens.pipe(
      groupBy(el => el.token, undefined, () => timer(60000)),
      flatMap(group => group.pipe(
        buffer(bufferInterval())
      )),
      filter(batch => batch.length > 0)
    );

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

          if (keyStats.lastSent !== currentDay()
              && (keyStats.sitesTokens.size > 1
              || (keyStats.count > this.MIN_COUNT && keyStats.created < entryCutoff))) {
            this.keySendQueue.next(keyKey);
          }
        });
        if (tokenStats.lastSent !== currentDay()
            && (tokenStats.sites.size > 1
            || (tokenStats.count > this.MIN_COUNT && tokenStats.created < entryCutoff))) {
          this.tokenSendQueue.next(token);
        }
      });

    // pipe tokens sending to messageQueue
    const tokenMessages = new Subject();
    const keyMessages = new Subject();
    this.messageQueue = merge(
      tokenMessages.pipe(map(payload => ({ action: 'attrack.tokensv2', payload }))),
      keyMessages.pipe(map(payload => ({ action: 'attrack.keysv2', payload }))),
    );

    this.tokens.init(this.tokenSendQueue, tokenMessages,
      this.TOKEN_BATCH_INTERVAL, this.TOKEN_BATCH_SIZE);
    this.keys.init(this.keySendQueue, keyMessages,
      this.KEY_BATCH_INTERVAL, this.KEY_BATCH_SIZE);


    // run every x minutes while there is activity
    this._onIdleSubscription = merge(
      of(''),
      filteredTokens,
      this.tokenSendQueue,
      this.keySendQueue,
      this.messageQueue,
    ).pipe(auditTime(this.CLEAN_INTERVAL))
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

    const keyTokens = state.urlParts.extractKeyValues().params;
    if (keyTokens.length > 0) {
      // const truncatedDomain = truncateDomain(state.urlParts.host, this.config.tpDomainDepth);
      // const domain = md5(truncatedDomain).substr(0, 16);
      const firstParty = truncatedHash(state.tabUrlParts.generalDomain);
      const generalDomain = truncatedHash(state.urlParts.generalDomain);
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
    if (this.config.telemetryMode === TELEMETRY.DISABLED
       || (this.config.telemetryMode === TELEMETRY.TRACKERS_ONLY && !isTracker)) {
      return;
    }

    /* eslint camelcase: 'off' */
    kv.forEach(([k, v]) => {
      if (!this.shouldCheckToken(v)) {
        return;
      }
      const token = md5(v);
      const key = md5(k);


      // put token in safe bucket if: value is short, domain is not a tracker,
      // or key or value is whitelisted
      const safe = !isTracker
                   || this.qsWhitelist.isSafeKey(thirdPartyGeneralDomain, key)
                   || this.qsWhitelist.isSafeToken(thirdPartyGeneralDomain, token);

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
