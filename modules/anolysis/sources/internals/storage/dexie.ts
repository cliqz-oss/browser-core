/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Dexie } from '@cliqz-oss/dexie';

import logger from '../logger';
import { Signal } from '../signal';
import SafeDate from '../date';

import { groupBehaviorEntriesByType } from './utils';

import * as aggregated from './types/aggregated';
import * as behavior from './types/behavior';
import * as signals from './types/signals-queue';
import * as storage from './types/storage';

class Aggregated implements aggregated.Storage {
  constructor(private readonly db: Dexie.Table<aggregated.Entry, number>) {}

  init() {}

  async runTaskAtMostOnce(
    date: SafeDate,
    name: string,
    fn: () => Promise<void>,
    granularity: aggregated.Granularity = 'day'
  ) {
    const formatted = date.toString();
    const dates = (
      await this.db
        .where('name')
        .equals(name)
        .sortBy('date')
    ).map(({ date }) => date);

    if (dates.length !== 0) {
      // If we already aggregated this `name` today, skip.
      if (dates.includes(formatted)) {
        return;
      }

      const latestDate = SafeDate.fromBackend(dates[dates.length - 1]);

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

    // Call aggregation
    await fn();

    // Remember that aggregation was performed
    await this.db.add({ date: formatted, name });
  }

  getAggregatedDates() {
    return this.db.orderBy('date').uniqueKeys();
  }

  async deleteOlderThan(date: SafeDate) {
    await this.db
      .where('date')
      .below(date.toString())
      .delete();
  }
}

class Behavior implements behavior.Storage {
  constructor(private readonly db: Dexie.Table<behavior.Entry, number>) {}

  init() {}

  async getDatesWithData(fromDate: SafeDate): Promise<SafeDate[]> {
    return this.db
      .orderBy('date')
      .uniqueKeys()
      .then(dates =>
        dates
          // @ts-ignore
          .map(SafeDate.fromBackend)
          .filter((date: SafeDate) => date.isBeforeDay(fromDate)),
      );
  }

  async getTypesForDate(date: SafeDate) {
    return groupBehaviorEntriesByType(
      await this.db
        .where('date')
        .equals(date.toString())
        .toArray(),
    );
  }

  async add(
    date: SafeDate,
    type: string,
    behavior: behavior.Entry['behavior'],
  ) {
    const doc: behavior.Entry = {
      behavior,
      date: date.toString(),
      type,

      // Add timestamp only for metrics. This is safe as we only use this to
      // order messages and this information is never sent to backend.
      ts: Date.now(),
    };

    logger.debug('add', doc);

    await this.db.add(doc);
  }

  async deleteByDate(date: SafeDate) {
    await this.db
      .where('date')
      .equals(date.toString())
      .delete();
  }

  async deleteOlderThan(date: SafeDate) {
    await this.db
      .where('date')
      .below(date.toString())
      .delete();
  }
}

class Signals implements signals.Storage {
  constructor(
    private readonly db: Dexie.Table<Omit<signals.Entry, 'id'>, number>,
  ) {}

  init() {}

  async push(signal: Signal, attempts = 0) {
    return this.db.add({
      attempts,
      date: signal.meta.date,
      signal,
    });
  }

  remove(id: number) {
    if (typeof id !== 'number') {
      return Promise.resolve();
    }

    return this.db.delete(id);
  }

  getN(n: number) {
    return this.db.limit(n).toArray();
  }

  getAll() {
    return this.db.toArray();
  }

  getSize() {
    return this.db.count();
  }

  async deleteOlderThan(date: SafeDate) {
    await this.db
      .where('date')
      .below(date.toString())
      .delete();
  }
}

export default class Storage implements storage.Storage {
  private db: Dexie | null = null;

  public aggregated: Aggregated | null = null;
  public behavior: Behavior | null = null;
  public signals: Signals | null = null;

  constructor(private readonly DexieCls: typeof Dexie) {}

  async init() {
    if (this.db !== null) return;

    this.db = new this.DexieCls('anolysis');
    this.db.version(1).stores({
      aggregated: '[date+name],date',
      behavior: '++id,date',
      gid: 'key',
      retention: 'key',
      signals: '++id,date',
    });
    this.db.version(2).stores({
      gid: null,
      retention: null,
    });
    this.db.version(3).stores({
      aggregated: '[date+name],date,name',
    });

    await this.db.open();

    // Create views
    this.aggregated = new Aggregated(this.db.table('aggregated'));
    this.behavior = new Behavior(this.db.table('behavior'));
    this.signals = new Signals(this.db.table('signals'));

    await Promise.all([
      this.aggregated.init(),
      this.behavior.init(),
      this.signals.init(),
    ]);
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

  async healthCheck() {
    if (this.db === null) {
      throw new Error('Dexie DB was not initialized');
    }

    // Try to open `db` if it's not already open
    if (!(await this.db.isOpen())) {
      // Check if database is opened
      await this.db.open();
    }

    // Check for failure
    if (await this.db.hasFailed()) {
      throw new Error('Dexie DB has failed to open');
    }
  }

  async destroy() {
    if (this.db !== null) {
      logger.debug('destroy initialized Dexie DB');
      const db = this.db;
      this.db = null;
      await db.delete();
    } else {
      // Destroy database even when Storage is not initialized
      logger.debug('destroy un-initialized Dexie DB');
      await this.DexieCls.delete('anolysis');
    }
  }

  unload() {
    if (this.db !== null) {
      this.db.close();
      this.db = null;
    }
  }
}
