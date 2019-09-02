/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import getDexie from '../platform/lib/dexie';
import { fetch } from '../core/http';
import moment from '../platform/lib/moment';
import config from '../core/config';
import logger from './logger';

const WTM_API_ENDPOINT = config.settings.WTM_API;

function idReducer(_map, stat) {
  const map = _map;
  map[stat.id] = stat;
  return map;
}

export default class WTMApi {
  async init() {
    const Dexie = await getDexie();
    this.cache = new Dexie('wtm-api-cache');
    this.cache.version(1).stores({
      trackers: 'id, day',
    });
  }

  unload() {
    if (this.cache !== null) {
      this.cache.close();
      this.cache = null;
    }
  }

  async getTrackerInfo(trackers) {
    const results = await this.cache.trackers.where('id').anyOf(trackers).toArray();
    const stats = results.reduce(idReducer, {});
    const missing = trackers.filter(id => !stats[id]);
    if (missing.length > 0) {
      Object.assign(stats, await this.fetchTrackerInfo(missing));
    }
    this._checkShouldPruneTrackerData(stats);
    return stats;
  }

  async fetchTrackerInfo(_trackers) {
    const trackers = [...new Set(_trackers)];
    logger.debug(`Fetching trackers info from WTM: ${trackers}`);
    const day = moment().format('YYYY-MM-DD');
    const results = await Promise.all(trackers.map(async (id) => {
      const url = `${WTM_API_ENDPOINT}trackers/global/${id}.json`;
      try {
        const request = await fetch(url);
        const overview = await request.json();
        return {
          day,
          ...overview
        };
      } catch (e) {
        logger.warn(`Error fetching from WTM API for tracker ${id}`, e);
        return {
          id,
          error: true,
        };
      }
    }));
    await this.cache.trackers.bulkPut(results.filter(r => !r.error));
    return results.reduce(idReducer, {});
  }

  async _checkShouldPruneTrackerData(stats) {
    const cutOff = moment().subtract(7, 'days').format('YYYY-MM-DD');
    if (Object.values(stats).some(s => s.day < cutOff)) {
      logger.info('Running tracker data prune');
      await this.cache.trackers.where('day').below(cutOff).delete();
    }
  }
}
