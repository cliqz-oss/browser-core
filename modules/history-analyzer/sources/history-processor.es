import History from '../platform/history/history';
import moment from '../platform/lib/moment';

import EventEmitter from '../core/event-emitter';
import PersistentMap from '../core/persistence/map';
import { compactTokens } from '../core/pattern-matching';
import { utils } from '../core/cliqz';

import tokenize from './utils';
import {
  getDayRange,
  formatMoment,
  parseMoment
} from './moment-utils';
import logger from './logger';

function fetchHistoryForDate(formattedDate) {
  const { start, end } = getDayRange(parseMoment(formattedDate).valueOf());
  return History.queryVisitsForTimespan({
    frameStartsAt: start * 1000,
    frameEndsAt: end * 1000,
  });
}

/**
 * Async processing of the existing history, day by day.
 * This simulates the API of a worker, so it would be easy to migrate if needed.
 */
export default class HistoryProcessor extends EventEmitter {
  constructor() {
    super(['processedVisits']);

    this.processedDates = new PersistentMap('history-analyzer-processor');
    this.processInterval = null;
  }

  init() {
    return this.processedDates.init()
      .then(() => this.processedDates.keys())
      .then((days) => {
        const processedDays = new Set(days);
        const today = moment();
        let currentDate = moment().subtract(90, 'days');

        // List days to process
        const datesToProcess = [];
        while (!currentDate.isSame(today, 'day')) {
          const formattedDate = formatMoment(currentDate);
          if (!processedDays.has(formattedDate)) {
            datesToProcess.push(formattedDate);
          }

          currentDate = currentDate.add(1, 'days');
        }

        logger.log(
          'History processor start. Following dates will be processed',
          datesToProcess,
        );

        if (datesToProcess.length > 0) {
          let processing = false;
          this.processInterval = utils.setInterval(
            () => {
              if (!processing && datesToProcess.length > 0) {
                processing = true;

                this.processDate(datesToProcess.shift())
                  .then(() => { processing = false; })
                  .catch(() => { processing = false; });
              }
            },
            5 * 1000, // One day every 5 seconds
          );
        }
      });
  }

  unload() {
    utils.clearInterval(this.processInterval);
    this.processedDates.unload();
  }

  destroy() {
    return this.processedDates.destroy();
  }

  processDate(formattedDate) {
    return fetchHistoryForDate(formattedDate).then((places) => {
      const t0 = Date.now();
      const processedUrls = places.map(({ ts, url }) => ({
        ts,
        url,
        tokens: compactTokens(tokenize(url)),
      }));
      const total = Date.now() - t0;

      logger.debug('Processing time', {
        date: formattedDate,
        urls: places.length,
        time: total,
      });

      this.emit('processedVisits', processedUrls);
      return this.processedDates.set(formattedDate, {});
    });
  }
}
