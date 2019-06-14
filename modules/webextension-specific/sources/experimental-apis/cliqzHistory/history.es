/* global ChromeUtils, Components */

import { cleanMozillaActions } from '../../../core/content/url';
import { URLInfo } from '../../../core/url-info';
import Defer from '../../../core/helpers/defer';

export { default } from './history-firefox';

const { PlacesUtils } = ChromeUtils.import('resource://gre/modules/PlacesUtils.jsm');

Components.utils.importGlobalProperties(['URL']);

let searchProvider;

function today() {
  return Math.floor(new Date().getTime() / 86400000);
}

async function sqlQuery(sql, columns) {
  const results = [];
  await PlacesUtils.withConnectionWrapper('CLIQZ', (conn) => {
    const connection = conn._connectionData._dbConn;
    const statement = connection.createAsyncStatement(sql);
    const deferredResult = new Defer();

    statement.executeAsync({
      handleCompletion(...args) {
        deferredResult.resolve(...args);
      },

      handleError(...args) {
        deferredResult.reject(...args);
      },

      handleResult(resultSet) {
        let row = resultSet.getNextRow();
        while (row) {
          // Read out the desired columns from the row into an object
          const result = {};
          for (let i = 0; i < (columns || []).length; i += 1) {
            const c = columns[i];
            result[c] = row.getResultByName(c);
          }

          results.push(result);

          row = resultSet.getNextRow();
        }
      }
    });

    return deferredResult.promise;
  });

  return results;
}

function topHistory() {
  return sqlQuery([
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
  ].join(' '), ['url', 'title']);
}

export function unifiedSearch(query) {
  if (!searchProvider) {
    searchProvider = Components
      .classes['@mozilla.org/autocomplete/search;1?name=unifiedcomplete']
      .getService(Components.interfaces.nsIAutoCompleteSearch);
  }

  return new Promise((resolve) => {
    searchProvider.startSearch(query, 'enable-actions prohibit-autofill', null, {
      onSearchResult(ctx, result) {
        if (result.searchResult === result.RESULT_NOMATCH_ONGOING
            || result.searchResult === result.RESULT_SUCCESS_ONGOING) {
          return;
        }

        const results = [];
        for (let i = 0; result && i < result.matchCount; i += 1) {
          const style = result.getStyleAt(i);
          const value = result.getValueAt(i);

          if (value.indexOf('https://cliqz.com/search?q=') !== 0
            && value.indexOf('moz-extension://') !== 0
            && !style.includes('heuristic')
            && !style.includes('searchengine')) {
            if (style.indexOf('switchtab') !== -1) {
              try {
                const [, cleanURL] = cleanMozillaActions(value);

                // ignore freshtab, history and cliqz search
                if (cleanURL.indexOf('chrome://cliqz') !== 0
                    && cleanURL.indexOf('resource://cliqz') !== 0
                    && cleanURL.indexOf('moz-extension://') !== 0
                    && cleanURL.indexOf('https://cliqz.com/search?q=') !== 0) {
                  results.push({
                    style,
                    value: cleanURL,
                    image: result.getImageAt(i),
                    comment: result.getCommentAt(i),
                    label: cleanURL
                  });
                }
              } catch (e) {
                // bummer
              }
            } else {
              results.push({
                style,
                value,
                image: result.getImageAt(i),
                comment: result.getCommentAt(i),
                label: result.getLabelAt(i)
              });
            }
          }
        }

        resolve({
          query,
          results,
          ready: true
        });
      }
    });
  });
}


export async function topDomains() {
  const history = await topHistory();

  return history.reduce((acc, curr) => {
    const host = URLInfo.get(curr.url).cleanHost;
    // we only want to show one url per host
    if (!Object.prototype.hasOwnProperty.call(acc.domains, host)) {
      acc.result.push(curr);
      acc.domains[host] = true;
    }
    return acc;
  }, { result: [], domains: { } }).result;
}

export async function stats() {
  const rawStats = await sqlQuery([
    'SELECT count(*) as size, MIN(v.visit_date) as first '
    + 'FROM moz_historyvisits v '
    + 'JOIN moz_places h '
    + 'ON h.id = v.place_id '
    + 'WHERE h.hidden = 0 AND h.visit_count > 0 '
  ].join(' '), ['size', 'first']);

  if (rawStats && rawStats.length === 1) {
    const history = rawStats[0];
    try {
      return {
        size: history.size,
        days: history.size ? today() - Math.floor(history.first / 86400000000) : 0
      };
    } catch (e) {
      // console.log('browser.cliqz.historyStats error:', e);
    }
  }

  return {
    size: -1,
    days: -1
  };
}
