import inject from '../../core/kord/inject';
import Feature from './feature';
import moment from '../../platform/lib/moment';
import DefaultMap from '../../core/helpers/default-map';
import UrlData from '../common/url_data';

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

  async performQuery(q) {
    const index = q.index;
    const after = q.start_ms - 1;
    const before = q.end_ms + 1;

    // Group matched urls per day
    const days = new DefaultMap(() => 0);
    const results = await this.mod.action('query', {
      after,
      before,
      urls: index.tokens,
    });
    // eslint-disable-next-line semi
    for await (const { ts, url } of results) {
      const urlData = new UrlData(url);
      if (index.match(urlData.getPatternRequest())) {
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
  }
}
