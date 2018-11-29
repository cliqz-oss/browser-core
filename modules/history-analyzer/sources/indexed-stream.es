import DefaultMap from '../core/helpers/default-map';
import EventStream from '../core/persistence/event-store';
import assert from '../core/assert';
import PatternMatching from '../platform/lib/adblocker';

import BucketStore from './bucket-store';

import logger from './logger';
import { HOUR } from './utils';


function tsToBucket(ts) {
  return Math.floor(ts / HOUR) * HOUR;
}


export default class IndexedStream {
  constructor(name) {
    this.eventStream = new EventStream(name);
    this.tokenIndex = new BucketStore(`${name}-buckets`);
  }

  init() {
    return Promise.all([
      this.eventStream.init(),
      this.tokenIndex.init(),
    ]);
  }

  unload() {
    this.eventStream.unload();
    this.tokenIndex.unload();
  }

  destroy() {
    return Promise.all([
      this.eventStream.destroy(),
      this.tokenIndex.destroy(),
    ]);
  }

  deleteDataOlderThan(ts) {
    return Promise.all([
      this.eventStream.deleteDataOlderThan(ts),
      this.tokenIndex.deleteDataOlderThan(ts),
    ]);
  }

  info() {
    let total = 0;
    let tokenSetSize = 0;
    const histogram = new DefaultMap(() => 0);
    this.tokenIndex.forEach((value) => {
      total += 1;
      tokenSetSize += value.length;
      histogram.update(value.length, c => c + 1);
    });

    return this.eventStream.info().then(info => ({
      events: info,
      buckets: {
        numberOfBuckets: total,
        numberOfTokens: tokenSetSize,
        tokensHistorygram: histogram,
      },
    }));
  }

  push(event) {
    return this.pushMany([event]);
  }

  pushMany(events) {
    if (events.length === 0) {
      return Promise.resolve();
    }

    // Group event by timestamp (`ts`)
    const index = new DefaultMap(() => []);
    for (let i = 0; i < events.length; i += 1) {
      const { ts, tokens } = events[i];
      assert(tokens.buffer !== undefined, 'tokens in pushMany must be compacted');
      index.update(tsToBucket(ts), (arr) => { arr.push(tokens); });
    }

    return Promise.all([
      // Push all events in the event store
      this.eventStream.pushMany(events),
      // Update the in-memory index with the new events. Each key of the index
      // contains events for some timespan (e.g.: one hour), and the value is a
      // compact set. When updating, we need to merge existing compact sets with
      // the compact sets of newly inserted events.
      ...[...index.entries()].map(([bucket, arrays]) =>
        this.tokenIndex.update(bucket, existingTokens =>
          PatternMatching.compactTokens(
            PatternMatching.mergeCompactSets(existingTokens || new Uint32Array(), ...arrays)
          ))),
    ]);
  }

  all() {
    return this.eventStream.query();
  }

  async* query({ after, before, tokens } = { tokens: new Uint32Array() }) {
    assert(tokens.buffer !== undefined, 'query only accept compact tokens');

    const lowerTs = after || -1;
    const upperTs = before || Date.now();

    const t0 = Date.now();
    const buckets = [];

    // Collect buckets with a matching token + time constraints
    this.tokenIndex.forEach((bucketTokens, bucketTs) => {
      const bucketTsEnd = bucketTs + HOUR;
      if (
        bucketTs > lowerTs
        && bucketTsEnd < upperTs
        && !PatternMatching.hasEmptyIntersection(bucketTokens, tokens)
      ) {
        buckets.push({
          after: bucketTs - 1,
          before: bucketTsEnd + 1,
        });
      }
    });

    logger.debug('IndexedStream find buckets', {
      time: Date.now() - t0,
      buckets,
    });

    for (let i = 0; i < buckets.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const events = await this.eventStream.query(buckets[i]);
      logger.debug('Dexie query took', {
        time: Date.now() - t0,
        events,
      });

      for (let j = 0; j < events.length; j += 1) {
        const event = events[j];
        if (
          event.ts > lowerTs
          && event.ts < upperTs
          && !PatternMatching.hasEmptyIntersection(event.tokens, tokens)
        ) {
          yield event;
        }
      }
    }
  }
}
