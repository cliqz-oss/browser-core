import History from '../platform/history/history';
import moment from '../platform/lib/moment';

import EventEmitter from '../core/event-emitter';
import persistentMapFactory from '../core/persistence/map';
import pacemaker from '../core/services/pacemaker';
import PatternMatching from '../platform/lib/adblocker';

import tokenize, { HOUR } from './utils';
import logger from './logger';

// 90 days of 24 hours
const MAX_HOUR_BUCKETS = 24 * 90;


function fetchHistoryForDate(timestamp) {
  // timestamp is always the end of the hourly bucket
  return History.queryVisitsForTimespan({
    frameStartsAt: (timestamp - HOUR) * 1000,
    frameEndsAt: timestamp * 1000,
  });
}


function isValidTimestamp(timestamp) {
  return (
    typeof timestamp === 'number'
    && !isNaN(timestamp)
    && timestamp > 0
    && timestamp < Date.now()
  );
}

/**
 * Async processing of the existing history, day by day.
 * This simulates the API of a worker, so it would be easy to migrate if needed.
 */
export default class HistoryProcessor extends EventEmitter {
  constructor() {
    super(['processedVisits']);

    this.processedHours = null;
    this.processInterval = null;
  }

  async init() {
    const PersistentMap = await persistentMapFactory();
    this.processedHours = new PersistentMap('history-analyzer-processor');

    await this.processedHours.init();

    // Make sure we only keep keys which are valid timestamps
    const timestamps = (await this.processedHours.values()).filter(isValidTimestamp);

    // If we already processed the maximum number of hours we do nothing.
    if (timestamps.length >= MAX_HOUR_BUCKETS) {
      return;
    }

    // Sort timestamps (oldest timestamp should be in first position)
    timestamps.sort();

    // Get oldest timestamp, or `now` if we did not process anything before.
    const oldestTs = timestamps.length === 0 ? Date.now() : timestamps[0];
    const numberOfBucketsToProcess = MAX_HOUR_BUCKETS - timestamps.length;

    // List hours to process (each timestamp is the end of a hourly bucket)
    const hoursToProcess = [];
    for (let i = 0; i < numberOfBucketsToProcess; i += 1) {
      hoursToProcess.push(oldestTs - (i * HOUR));
    }
    // Result should be of the form.
    // [ t0, t1, t2, ..., tN]
    //   ^   ^   ^
    //   |   |   | two hours before t0
    //   |   | one hour before t0
    //   | oldest date processed so far (or Date.now())
    //
    // Which means that history will be processed in the following way:
    // 1. hour [t0 - 1h, t0]
    // 2. hour [t1 - 1h, t1]
    // 3. etc.
    // From most recent to oldest.

    logger.log(
      'History processor start. Following hours will be processed',
      hoursToProcess.map(ts => moment(ts).format('YYYY-MM-DD h:mm:ss a')),
    );

    // Start processing one bucket at a time.
    this.processInterval = pacemaker.everyFewSeconds(
      async () => {
        if (hoursToProcess.length <= 0) {
          // Stop history-analyzer if there is nothing more to process
          this.unload();
        } else {
          try {
            await this.processDate(hoursToProcess.shift());
          } catch (ex) {
            logger.error('while processing date', ex);
          }
        }
      },
    );
  }

  unload() {
    pacemaker.clearTimeout(this.processInterval);
    this.processInterval = null;
    this.processedHours.unload();
  }

  destroy() {
    return this.processedHours.destroy();
  }

  async processDate(timestamp) {
    // Fetch URLs from history using Firefox' API.
    let t0 = Date.now();
    const places = await fetchHistoryForDate(timestamp);
    const fetchingTime = Date.now() - t0;

    // Tokenize each URL.
    t0 = Date.now();
    const processedUrls = places.map(({ ts, url }) => ({
      ts,
      url,
      tokens: PatternMatching.compactTokens(tokenize(url)),
    }));
    const processingTime = Date.now() - t0;

    // Emit processed URLs, which will cause them to be persisted by Dexie.
    t0 = Date.now();
    await this.emit('processedVisits', processedUrls);
    const persistingTime = Date.now() - t0;

    logger.debug('Processing time', {
      ts: timestamp,
      urls: places.length,
      fetchingTime,
      processingTime,
      persistingTime,
      time: (
        fetchingTime
        + processingTime
        + persistingTime
      ),
    });

    await this.processedHours.set(timestamp, timestamp);
  }
}
