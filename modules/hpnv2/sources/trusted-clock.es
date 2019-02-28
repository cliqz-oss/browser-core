import { formatDate } from './utils';
import logger from './logger';
import prefs from '../core/prefs';

export default class TrustedClock {
  constructor({ maxDriftInMinutes = 3 } = {}) {
    this.minutesLocal = 0;
    this.timeDrift = 0;
    this.lastSynced = null;
    this.maxDriftInMinutes = maxDriftInMinutes;

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
  }

  _stopClock() {
    clearInterval(this.steadyClock);
    this.steadyClock = null;
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
      const expectedConfigTs = formatDate(hoursSystem).slice(0, 8);
      const actualConfigTs = prefs.get('config_ts');
      if (expectedConfigTs !== actualConfigTs) {
        // Let's try to keep config_ts in sync.
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

  isHealthy() {
    try {
      return this.checkTime().inSync;
    } catch (e) {
      logger.warn('Exception thrown while checking health', e);
      return false;
    }
  }
}
