import inject from '../../core/kord/inject';
import Feature from './feature';
import moment from '../../platform/lib/moment';
import tokenizeUrl from '../common/pattern-utils';
import DefaultMap from '../../core/helpers/default-map';

const MOD_NAME = 'history-analyzer';

/**
 * Interface for a feature
 */
export default class HistoryFeature extends Feature {
  constructor() {
    super('history');
    this.mod = null;
    this.ongoingQueries = new Map();
  }

  // to be implemented by the inherited classes
  init() {
    this.mod = inject.module(MOD_NAME);
    return true;
  }

  unload() {
    return true;
  }

  isAvailable() {
    return this.mod.isEnabled();
  }


  // ///////////////////////////////////////////////////////////////////////////
  //                        INTERFACE
  //

  performQuery(q) {
    const index = q.index;
    const after = q.start_ms - 1;
    const before = q.end_ms + 1;

    return this.mod.action('query', {
      after,
      before,
      urls: index.tokens,
    }).then(({ urls }) => {
      // Group matched urls per day
      const days = new DefaultMap(() => 0);
      for (let i = 0; i < urls.length; i += 1) {
        const { ts, url } = urls[i];
        if (index.match(tokenizeUrl(url))) {
          const day = moment(ts).format('YYYYMMDD');
          days.update(day, v => v + 1);
        }
      }

      // eslint-disable-next-line camelcase
      const per_day = {};
      const total = {
        num_days: 0,
        m: 0,
        c: 0,
        last_checked_url_ts: before,
      };

      days.forEach((count, day) => {
        total.num_days += 1;
        total.m += count;
        total.c += count;

        per_day[day] = {
          m: count,
          c: count,
        };
      });

      return {
        pid: q.pid,
        d: {
          info: {}, // Not used anymore
          match_data: {
            total,
            per_day,
          },
        },
      };
    });
  }
}
