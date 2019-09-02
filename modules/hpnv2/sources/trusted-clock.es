/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { formatHoursAsYYYYMMDD } from './utils';
import logger from './logger';
import prefs from '../core/prefs';
import { setInterval, clearInterval } from '../core/timers';

// After we adjusted "config_ts" to sync with the server clock, it is
// more likely that it will trigger time-based messages in other modules.
// Because of that, be careful in the next minutes. For each message
// generated in that time, there is an increased risk that all other
// active clients will also simulataneously do the same.
const DAILY_SPIKE_COOLDOWN_IN_MIN = 5;

export default class TrustedClock {
  constructor({ maxDriftInMinutes = 3 } = {}) {
    this.minutesLocal = 0;
    this.timeDrift = 0;
    this.lastSynced = null;
    this.maxDriftInMinutes = maxDriftInMinutes;
    this._resetAntiSpikeStats();

    // Will be triggered when the clock drift exceeds the threshold.
    // Arguments: none
    this.onClockOutOfSync = () => {};
  }

  init() {
    this.unload();

    this.minutesLocal = 0;
    this.timeDrift = 0;
    this.lastSynced = null;
  }

  unload() {
    this._stopClock();
    this.lastSynced = null;
    this._resetAntiSpikeStats();
  }

  _stopClock() {
    clearInterval(this.steadyClock);
    this.steadyClock = null;
  }

  _resetAntiSpikeStats() {
    this._estimatedUptime = 0;
    this._midnightSpikeDanger = 0;
  }

  syncWithServerTimestamp(serverTs) {
    const serverTime = serverTs.getTime();
    const localTime = Date.now();
    this.timeDrift = serverTime - localTime;
    this.minutesLocal = Math.round(serverTime / (1000 * 60));

    // Remember the last time we synched with the server,
    // although it is only used for logging.
    this.lastSynced = serverTs;

    // Now we can trust system clock, so start our timer
    // to detect further changes to it...
    this._stopClock();
    this.steadyClock = setInterval(() => {
      this.minutesLocal += 1;

      // keep some stats for the anti-spike heuristics:
      this._estimatedUptime += 1;
      this._midnightSpikeDanger = Math.max(0, this._midnightSpikeDanger - 1);

      const { inSync } = this.checkTime();
      if (inSync) {
        logger.debug('Local system clock in sync with the server. Last synched at:',
          serverTime);
      } else {
        logger.warn('Local system clock out of sync with the server. Last synched at:',
          serverTime);
      }
    }, 60 * 1000);
  }

  /**
   * Total number of hours elapsed since the UNIX epoch (1 January 1970).
   *
   * It does not use the local system clock, but the internal
   * adjusted clock, which has been synched with the server.
   */
  getHoursSinceEpoch() {
    const { inSync, hoursSinceEpoch } = this.checkTime();
    if (!inSync) {
      throw new Error('Clock out of sync');
    }
    return hoursSinceEpoch;
  }

  checkTime() {
    const minutesLocal = this.minutesLocal;
    const minutesSystem = Math.round((this.timeDrift + Date.now()) / (1000 * 60));
    const hoursSystem = Math.floor(minutesSystem / 60);

    const inSync = Math.abs(minutesLocal - minutesSystem) <= this.maxDriftInMinutes;
    if (inSync) {
      const expectedConfigTs = formatHoursAsYYYYMMDD(hoursSystem);
      const actualConfigTs = prefs.get('config_ts');
      if (expectedConfigTs !== actualConfigTs) {
        // Let's try to keep config_ts in sync.
        //
        // We have to use timestamps that are close to the server time, otherwise,
        // we run the risk that messages are rejected. However, by syncing the time,
        // there is a chance that we can trigger daily messages in other modules.
        // In a perfect world, all modules will carefully smooth out the traffic,
        // but if not, we should have some protection in place to avoid spikes.
        //
        // We cannot know for sure, but messages that are sent in the next minutes
        // are potentially depending on the clock. As the clock is the same world-wide,
        // we also have to assume that other clients will behave similar to us.
        // To mitigate spikes, hpn can use randomly delays to smooth out the traffic.
        this._midnightSpikeDanger = DAILY_SPIKE_COOLDOWN_IN_MIN;
        logger.log('Syncing config_ts (expected:', expectedConfigTs,
          ', actual:', actualConfigTs, ')');
        prefs.set('config_ts', expectedConfigTs);
      }
    } else {
      // try to update the clock from the server
      logger.log('Clock is out of sync. It needs a current timestamp from the server to get in sync again.');
      this.onClockOutOfSync();
    }

    return {
      inSync,
      minutesSinceEpoch: minutesSystem,
      hoursSinceEpoch: hoursSystem,
    };
  }

  /**
   * Heuristic to get the number of minutes that hpn was active.
   * Restarting the browser, or updating the extension will reset this counter.
   *
   * Background: when hpn has to decide whether to send a message immediately,
   * or add a random delay to reduce traffics spikes, delaying always has the
   * risk that the message will be lost when the browser is closed. Persisting
   * the messages would avoid that risk, but would introduce other issues when
   * an attacker gets access to the disk.
   *
   * As a heuristic, we can assume that if a user had the browser open for
   * a long time, it is likely that it buffering a message a few minutes in
   * memory would be safe. Eventually that heuristic will fail, but at least it
   * should prevent usage patterns where a user routinely opens and closes
   * the browser.
   */
  estimateHpnUptime() {
    return this._estimatedUptime;
  }

  /**
   * Returns true when there are indicators that the messages being
   * currently sent are time-based. In that case, HPN can consider
   * using random delays to mitigate traffic spikes on the server.
   */
  midnightSpikeDanger() {
    return this._midnightSpikeDanger > 0;
  }

  isHealthy() {
    try {
      return this.checkTime().inSync;
    } catch (e) {
      logger.warn('Exception thrown while checking health', e);
      return false;
    }
  }
}
