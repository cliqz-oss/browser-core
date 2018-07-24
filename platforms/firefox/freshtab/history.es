import HistoryManager from '../../core/history-manager';
import { getDetailsFromUrl } from '../../core/url';
import PlacesUtils from '../places-utils';

const CliqzFreshTabHistory = {
  /**
   * Returns the array of top visited URLs with their titles and number of visits
   * @returns {Array} Array of objects { url, title, total_count }
   */
  getTopUrls() {
    const result = [];
    const domains = {};
    return new Promise((resolve) => {
      HistoryManager.PlacesInterestsStorage._execute(
        [
          'select distinct rev_host as rev_host, title as title, url as url, max(total_count)  as total_count from (',
          'select mzh.url as url, mzh.title as title, sum(mzh.days_count) as total_count, mzh.rev_host as rev_host',
          'from (',
          'select moz_places.url, moz_places.title, moz_places.rev_host, moz_places.visit_count,',
          'moz_places.last_visit_date, moz_historyvisits.*,',
          "(moz_historyvisits.visit_date /(86400* 1000000) - (strftime('%s', date('now', '-6 months'))/86400) ) as days_count",
          'from moz_historyvisits, moz_places',
          'where moz_places.typed == 1',
          'and moz_places.hidden == 0',
          "and moz_historyvisits.visit_date > (strftime('%s', date('now', '-6 months'))*1000000)",
          'and moz_historyvisits.place_id == moz_places.id',
          'and moz_places.visit_count > 1',
          'and (moz_historyvisits.visit_type < 4 or moz_historyvisits.visit_type == 6)',
          ') as mzh',
          'group by mzh.place_id',
          'order by total_count desc, mzh.visit_count desc, mzh.last_visit_date desc',
          ') group by rev_host order by total_count desc limit 15'
        ].join(' '),
        ['rev_host', 'url', 'title', 'total_count'],
        (row) => {
          const key = getDetailsFromUrl(row.url).cleanHost;
          if (!(key in domains)) {
            result.push(row);
            domains[key] = row;
          }
        }
      ).then(() => {
        resolve(result);
      });
    });
  },
};

export default CliqzFreshTabHistory;

export function isURLVisited(url) {
  const URI = Services.io.newURI(url, '', null);

  return new Promise((resolve, reject) => {
    try {
      PlacesUtils.asyncHistory.isURIVisited(URI, (aURI, isVisited) => {
        resolve(isVisited);
      });
    } catch (e) {
      reject(e);
    }
  });
}

export function getDomains() {
  const ONE_MINUTE = 60 * 1000;
  const ONE_DAY = 24 * 60 * ONE_MINUTE;
  const ONE_MONTH = 30 * ONE_DAY;
  const sqlStatement = 'SELECT * FROM moz_places WHERE last_visit_date>:date';
  const sqlOutputParameters = ['url', 'last_visit_date', 'visit_count'];
  const sqlInputParameters = { date: (Date.now() - ONE_MONTH) * 1000 };
  const records = [];

  return HistoryManager.PlacesInterestsStorage._execute(
    sqlStatement,
    sqlOutputParameters,
    records.push.bind(records),
    sqlInputParameters
  ).then(() => records);
}
