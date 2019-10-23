/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global Components */
import { URLInfo } from '../../../core/url-info';
import { getCleanHost } from '../../../core/url';
import { queryHistory } from './history-firefox';

export { default } from './history-firefox';

let searchProvider;

function cleanMozillaActions(url = '') {
  let href = url;
  if (url.startsWith('moz-action:')) {
    const parts = url.match(/^moz-action:[^,]+,(.*)$/);
    href = parts[1];
    try {
      // handle cases like: moz-action:visiturl,{"url": "..."}
      const mozActionUrl = JSON.parse(href).url;
      if (mozActionUrl) {
        href = decodeURIComponent(mozActionUrl);
      }
    } catch (e) {
      // empty
    }
  }
  return href;
}

let adultDomainsBF = null;
function isAdultDomain(domain) {
  if (adultDomainsBF === null) {
    try {
      adultDomainsBF = Components.classes['@cliqz.com/browser/auto_forget_tabs_service;1']
        .getService(Components.interfaces.nsISupports).wrappedJSObject
        ._adultDomainsBF;
    } catch (e) {
      adultDomainsBF = {
        test: () => false,
      };
    }
  }

  return adultDomainsBF.test(domain);
}

function today() {
  return Math.floor(new Date().getTime() / 86400000);
}

function topHistory({
  limit = 15,
  exclude = [],
} = {}) {
  const excludeURLs = Array(exclude.length).fill('?').join(',');
  return queryHistory(`
    select distinct rev_host as rev_host, title as title, url as url, max(total_count)  as total_count from ( 
    select mzh.url as url, mzh.title as title, sum(mzh.days_count) as total_count, mzh.rev_host as rev_host 
    from ( 
    select moz_places.url, moz_places.title, moz_places.rev_host, moz_places.visit_count, 
    moz_places.last_visit_date, moz_historyvisits.*, 
    (moz_historyvisits.visit_date / (86400* 1000000) - (strftime('%s', date('now', '-6 months'))/86400) ) as days_count 
    from moz_historyvisits, moz_places 
    where moz_places.typed == 1 
    and moz_places.hidden == 0 
    and moz_historyvisits.visit_date > (strftime('%s', date('now', '-6 months'))*1000000) 
    and moz_historyvisits.place_id == moz_places.id 
    and moz_places.visit_count > 1 
    and (moz_historyvisits.visit_type < 4 or moz_historyvisits.visit_type == 6) 
    and lower(moz_places.url) not like 'moz-extension:%'
    and moz_places.url not in (${excludeURLs})
    ) as mzh 
    group by mzh.place_id 
    order by total_count desc, mzh.visit_count desc, mzh.last_visit_date desc 
    ) group by rev_host order by total_count desc limit ${limit} 
  `, ['url', 'title'], exclude);
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
          const value = cleanMozillaActions(result.getValueAt(i));
          const label = style.indexOf('switchtab') !== -1 ? value : result.getLabelAt(i);

          if (value.indexOf('https://cliqz.com/search?q=') !== 0
            && value.indexOf('moz-extension://') !== 0
            && value.indexOf('resource://cliqz') !== 0
            && value.indexOf('chrome://cliqz') !== 0
            && !style.includes('heuristic')
            && !style.includes('searchengine')
          ) {
            results.push({
              style,
              value,
              image: result.getImageAt(i),
              comment: result.getCommentAt(i),
              label,
            });
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

export async function topDomains({ limit, exclude, includeAdult } = {}) {
  const history = await topHistory({ limit, exclude });

  return history.reduce((acc, curr) => {
    const host = getCleanHost(URLInfo.get(curr.url));
    // we only want to show one url per host
    if (!Object.prototype.hasOwnProperty.call(acc.domains, host)) {
      const isAdult = isAdultDomain(host);
      if (!isAdult || includeAdult) {
        acc.result.push({
          ...curr,
          isAdult,
        });
        acc.domains[host] = true;
      }
    }
    return acc;
  }, { result: [], domains: { } }).result;
}

export async function stats() {
  const rawStats = await queryHistory([
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
