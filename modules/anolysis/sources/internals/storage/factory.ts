/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// This module offers a generic storage over an asynchronous key-value storage.
// This is useful to provide Anolysis on different platforms using different
// low-level storage implementations: AsyncStorage, localStorage, Map, etc.

import { Signal } from '../signal';
import SafeDate from '../date';

import { groupBehaviorEntriesByType } from './utils';

import * as aggregated from './types/aggregated';
import * as behavior from './types/behavior';
import * as signals from './types/signals-queue';
import * as storage from './types/storage';

interface KVStore {
  // Basic
  del: (key: string) => Promise<void>;
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<void>;

  // Batch
  multiDel: (keys: string[]) => Promise<void>;
  multiGet: (keys: string[]) => Promise<Array<[string, string]>>;
  multiSet: (items: Array<[string, string]>) => Promise<void>;

  getAllKeys: () => Promise<string[]>;
}

const ANOLYSIS_PREFIX = 'anolysis';

/**
 * Return a list of all keys (as string) from the Anolysis namespace. All eksy
 * stored in `Aggregated`, `Behavior` or `Signals` databases are prefixed with
 * `ANOLYSIS_PREFIX`. This function returns all keys having this prefix.
 */
async function getAllAnolysisKeys(
  asyncStorage: KVStore,
): Promise<string[]> {
  return (await asyncStorage.getAllKeys()).filter(key =>
    key.startsWith(ANOLYSIS_PREFIX),
  );
}

/**
 * Helper used to delete a subset of `keys` for which `predicate` returns
 * `true`. It also removes deleted keys from argument `keys`.
 */
async function deleteKeysByPredicate(
  asyncStorage: KVStore,
  keys: Set<string>,
  predicate: (key: string) => boolean,
): Promise<void> {
  const keysToRemove = Array.from(keys).filter(predicate);

  if (keysToRemove.length !== 0) {
    // Update KVStore
    await asyncStorage.multiDel(keysToRemove);

    // Update in-memory set of all existing keys
    for (const key of keysToRemove) {
      keys.delete(key);
    }
  }
}

class Aggregated implements aggregated.Storage {
  static readonly PREFIX: string = `${ANOLYSIS_PREFIX}_aggregated`;

  static key(date: SafeDate, name: string) {
    return `${Aggregated.PREFIX}_${date.toString()}_${name}`;
  }

  static dateFromKey(key: string): SafeDate {
    const start = Aggregated.PREFIX.length + 1;
    return SafeDate.fromBackend(key.slice(start, key.indexOf('_', start)));
  }

  constructor(
    private readonly asyncStorage: KVStore,
    private readonly aggregatedKeys: Set<string>,
  ) {}

  async runTaskAtMostOnce(
    date: SafeDate,
    name: string,
    fn: () => Promise<void>,
    granularity: aggregated.Granularity = 'day'
  ) {
    const newKey = Aggregated.key(date, name);

    // If we already aggregated on `date`, skip.
    if (this.aggregatedKeys.has(newKey)) {
      return;
    }

    // Identify latest date where `name` was aggregated.
    let latestDate: SafeDate | undefined;
    for (const key of this.aggregatedKeys) {
      if (key.endsWith(`_${name}`)) {
        const keyDate = Aggregated.dateFromKey(key);
        if (latestDate === undefined || latestDate.isBeforeDay(keyDate)) {
          latestDate = keyDate;
        }
      }
    }

    if (latestDate !== undefined) {
      // If last aggregation took place in same week, skip.
      if (
        granularity === 'week' &&
        latestDate.toWeekString() === date.toWeekString()
      ) {
        return;
      }

      // If last aggregation took place in same month, skip.
      if (
        granularity === 'month' &&
        latestDate.toMonthString() === date.toMonthString()
      ) {
        return;
      }
    }

    // Run aggregation and keep track of `date`.
    await fn();
    this.aggregatedKeys.add(newKey);
    await this.asyncStorage.set(newKey, '');
  }

  async deleteOlderThan(date: SafeDate) {
    deleteKeysByPredicate(this.asyncStorage, this.aggregatedKeys, key =>
      Aggregated.dateFromKey(key).isBeforeDay(date),
    );
  }

  async getAggregatedDates() {
    const keys: Set<string> = new Set();
    for (const key of this.aggregatedKeys) {
      keys.add(Aggregated.dateFromKey(key).toString());
    }
    return Array.from(keys);
  }
}

class Behavior implements behavior.Storage {
  private readonly cache: Map<string, behavior.Entry[]> = new Map();

  static readonly PREFIX = `${ANOLYSIS_PREFIX}_behavior`;

  static key(date: SafeDate, type: string) {
    return `${Behavior.PREFIX}_${date.toString()}_${type}`;
  }

  static dateFromKey(key: string): SafeDate {
    const start = Behavior.PREFIX.length + 1;
    return SafeDate.fromBackend(key.slice(start, key.indexOf('_', start)));
  }

  constructor(
    private readonly asyncStorage: KVStore,
    private readonly behaviorKeys: Set<string>,
  ) {}

  async getDatesWithData(fromDate: SafeDate): Promise<SafeDate[]> {
    const keys: Set<SafeDate> = new Set();
    for (const key of this.behaviorKeys) {
      keys.add(Behavior.dateFromKey(key));
    }
    return Array.from(keys).filter(date => date.isBeforeDay(fromDate));
  }

  async getTypesForDate(date: SafeDate) {
    const keysForDate = Array.from(this.behaviorKeys).filter(key =>
      Behavior.dateFromKey(key).isSameDay(date),
    );

    const metrics: behavior.Entry[] = [];
    if (keysForDate.length !== 0) {
      for (const result of await this.asyncStorage.multiGet(keysForDate)) {
        metrics.push(...JSON.parse(result[1]));
      }
    }

    return groupBehaviorEntriesByType(metrics);
  }

  async add(
    date: SafeDate,
    type: string,
    behavior: behavior.Entry['behavior'],
  ) {
    const key = Behavior.key(date, type);

    const doc = {
      behavior,
      date: date.toString(),
      type,

      // Add timestamp only for metrics. This is safe as we only use this to
      // order messages and this information is never sent to backend.
      ts: Date.now(),
    };

    // We use `this.cache` as a lock on top of KVStore. Because multiple
    // concurrent calls can "compete" to write to the same keys, we need a way
    // to make sure no data is lost. To this effect, we keep an in-memory list
    // of signals for each `key`. The first time we try to write to `key`, we
    // create an entry in `this.cache`. If another call is made to write to the
    // same key then the value will be pushed to the in-memory array instead of
    // KVStore. In the meanwhile, the first async call will resolve and
    // synchronize all data from memory to KVStore and delete the
    // in-memory entry.
    const entries = this.cache.get(key);
    if (entries !== undefined) {
      entries.push(doc);
    } else {
      const docs: behavior.Entry[] = [doc];
      this.cache.set(key, docs);
      const storedSignals = JSON.parse(
        (await this.asyncStorage.get(key)) || '[]',
      );

      this.behaviorKeys.add(key);
      this.cache.delete(key);
      await this.asyncStorage.set(
        key,
        JSON.stringify([...docs, ...storedSignals]),
      );
    }
  }

  async deleteByDate(date: SafeDate) {
    deleteKeysByPredicate(this.asyncStorage, this.behaviorKeys, key =>
      Behavior.dateFromKey(key).isSameDay(date),
    );
  }

  async deleteOlderThan(date: SafeDate) {
    deleteKeysByPredicate(this.asyncStorage, this.behaviorKeys, key =>
      Behavior.dateFromKey(key).isBeforeDay(date),
    );
  }
}

class Signals implements signals.Storage {
  private id: signals.Id = 1;

  private readonly signals: Map<string, Map<number, signals.Entry>> = new Map();

  static readonly PREFIX = `${ANOLYSIS_PREFIX}_signals`;

  static key(date: SafeDate) {
    return `${Signals.PREFIX}_${date.toString()}`;
  }

  static dateFromKey(key: string): SafeDate {
    return SafeDate.fromBackend(key.slice(Signals.PREFIX.length + 1));
  }

  constructor(
    private readonly asyncStorage: KVStore,
    private readonly signalsKeys: Set<string>,
  ) {}

  async init() {
    // Load all signals in the queue (most of the time it should be empty or
    // very small), and keep track of the highest `id` which was assigned to a
    // signal. We need this information to keep increasing it for new signals
    // added in the queue later.
    let maxId = 0;
    if (this.signalsKeys.size !== 0) {
      for (const [key, value] of await this.asyncStorage.multiGet(
        Array.from(this.signalsKeys),
      )) {
        const signals: signals.Entry[] = JSON.parse(value);
        maxId = Math.max(maxId, ...signals.map(({ id }) => id));

        const signalsPerId: Map<number, signals.Entry> = new Map();
        for (const signal of signals) {
          signalsPerId.set(signal.id, signal);
        }
        this.signals.set(key, signalsPerId);
      }
    }

    // Start again from highest `id` found in existing signals
    this.id = (maxId + 1) % Number.MAX_SAFE_INTEGER;
  }

  async push(signal: Signal, attempts = 0) {
    const {
      meta: { date },
    } = signal;
    const key = Signals.key(SafeDate.fromBackend(date));
    const id = this.id++;

    const entry: signals.Entry = {
      attempts,
      date,
      id,
      signal,
    };

    // Update in-memory storage of signals
    this.signalsKeys.add(key);
    let entries: undefined | Map<number, signals.Entry> = this.signals.get(key);
    if (entries === undefined) {
      entries = new Map();
      this.signals.set(key, entries);
    }
    entries.set(id, entry);

    // Update async storage
    await this.asyncStorage.set(
      key,
      JSON.stringify(Array.from(entries.values())),
    );

    return id;
  }

  async remove(id: signals.Id) {
    // Remove signals
    for (const [key, signalsPerId] of this.signals) {
      if (signalsPerId.has(id)) {
        // Delete signal from in-memory data structure.
        signalsPerId.delete(id);

        // Update KVStore. Either this `key` does not contain any signal
        // anymore (i.e.: `id` was the last one) in which case we delete the
        // key, or there are more and we need to update value at `key` after
        // removing the signal.
        if (signalsPerId.size === 0) {
          this.signalsKeys.delete(key);
          await this.asyncStorage.del(key);
        } else {
          await this.asyncStorage.set(
            key,
            JSON.stringify(Array.from(signalsPerId.values())),
          );
        }

        break;
      }
    }
  }

  async getAll() {
    const signals: signals.Entry[] = [];
    for (const signalsPerId of this.signals.values()) {
      signals.push(...signalsPerId.values());
    }
    return signals;
  }

  async getN(n: number) {
    return (await this.getAll()).slice(0, n);
  }

  async getSize() {
    return (await this.getAll()).length;
  }

  async deleteOlderThan(date: SafeDate) {
    deleteKeysByPredicate(this.asyncStorage, this.signalsKeys, key =>
      Signals.dateFromKey(key).isBeforeDay(date),
    );

    // Remove keys from `this.signals` if they have been deleted.
    for (const key of this.signals.keys()) {
      if (this.signalsKeys.has(key) === false) {
        this.signals.delete(key);
      }
    }
  }
}

export default class Storage implements storage.Storage {
  public aggregated: Aggregated | null = null;
  public behavior: Behavior | null = null;
  public signals: Signals | null = null;

  constructor(private readonly asyncStorage: KVStore) {}

  async init() {
    const allAnolysisKeys = await getAllAnolysisKeys(this.asyncStorage);

    this.aggregated = new Aggregated(
      this.asyncStorage,
      new Set(allAnolysisKeys.filter(key => key.startsWith(Aggregated.PREFIX))),
    );

    this.behavior = new Behavior(
      this.asyncStorage,
      new Set(allAnolysisKeys.filter(key => key.startsWith(Behavior.PREFIX))),
    );

    this.signals = new Signals(
      this.asyncStorage,
      new Set(allAnolysisKeys.filter(key => key.startsWith(Signals.PREFIX))),
    );

    await this.signals.init();
  }

  async deleteOlderThan(date: SafeDate): Promise<void> {
    const promises: Array<Promise<void>> = [];

    if (this.aggregated !== null) {
      promises.push(this.aggregated.deleteOlderThan(date));
    }

    if (this.signals !== null) {
      promises.push(this.signals.deleteOlderThan(date));
    }

    if (this.behavior !== null) {
      promises.push(this.behavior.deleteOlderThan(date));
    }

    await Promise.all(promises);
  }

  async healthCheck() {}

  async destroy() {
    await this.asyncStorage.multiDel(
      await getAllAnolysisKeys(this.asyncStorage),
    );
  }

  unload() {
    this.aggregated = null;
    this.behavior = null;
    this.signals = null;
  }
}
