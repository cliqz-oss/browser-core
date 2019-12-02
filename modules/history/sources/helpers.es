import { URLInfo } from '../core/url-info';

const SHORTENERS = new Set([
  'adf.ly',
  'amp.gs',
  'bc.vc',
  'bit.do',
  'bit.ly',
  'bitly.com',
  'cutt.us',
  'db.tt',
  'filoops.info',
  'goo.gl',
  'hive.am',
  'is.gd',
  'ity.im',
  'j.mp',
  'joturl.com',
  'link.zip.net',
  'lnkd.in',
  'lnnk.in',
  'ow.ly',
  'po.st',
  'q.gs',
  'qr.ae',
  'qr.net',
  'shrt.li',
  'shorter.is',
  'shorturl.is',
  'shtn.me',
  't2mio.com',
  't.co',
  'tinyurl.com',
  'tr.im',
  'u.to',
  'urlways.com',
  'ux9.de',
  'v.gd',
  'vzturl.com',
  'x.co',
  'youtu.be',
  'yourls.org',
  'zii.bz',
]);

const isURLShortener = url => url !== null && SHORTENERS.has(url.hostname);

export const worthShowing = (visit) => {
  if (!visit
    || typeof visit.title !== 'string'
    || typeof visit.url !== 'string'
    || typeof visit.baseUrl !== 'string'
    || typeof visit.host !== 'string') {
    return false;
  }

  return visit.title.trim() !== ''
    && (!isURLShortener(URLInfo.get(visit.url))
    || `${visit.baseUrl}` === `${visit.host}/`);
};

export const createClusterSessions = (cluster) => {
  if (!Array.isArray(cluster) || !cluster.length) {
    return cluster;
  }

  return cluster.reduce((accumulator, list) => {
    if (!accumulator.length) {
      accumulator.push(list);

      return accumulator;
    }

    let accumList = accumulator[accumulator.length - 1];
    let lastAccumItem = accumList[accumList.length - 1];
    let l = list.length;

    while (l) {
      if (lastAccumItem && list[0] && lastAccumItem.sessionId === list[0].sessionId) {
        accumList.push(list.shift());
      } else {
        lastAccumItem = list.shift();
        accumList = [lastAccumItem];
        accumulator.push(accumList);
      }

      l -= 1;
    }

    return accumulator;
  }, []);
};

/* A user opens a url which redirects to another one which in turn does the same
 * and then again and again.
 * Until a final page has a host different from what we have in SHORTENERS Set
 * (please see helpers.es file in the PR).
 * So that is how a cluster is created.
 * Also it is important to note that if a user tries to open those SHORTENERS directly
 * (loading just a domain) then that item should be visible in history page too
 * (self sufficient cluster I would say).
 * Every item in every single cluster which is not displayed in the history page
 * should NOT be marked as 'isVisible'.
 *
 * @param history Array of history items to be clusterized.
 * @return historyCluster Array of history items grouped into cluster.
 * */
export const createHistoryCluster = (history) => {
  if (!Array.isArray(history)) {
    return history;
  }

  // Here we need to sort history items in reverse order
  // since the 'higher' sessionId should be displayed first
  // as visible the most recently.
  history.sort((v1, v2) => (v2.sessionId - v1.sessionId));

  return history.reduce((accumulator, visit) => {
    const list = accumulator[accumulator.length - 1];

    if (worthShowing(visit)) {
      // eslint-disable-next-line no-param-reassign
      visit.isVisible = true;
    }

    if (Array.isArray(list)) {
      const lastItem = list[list.length - 1];

      if (lastItem && worthShowing(lastItem)) {
        accumulator.push([visit]);
      } else {
        list.push(visit);
      }
    } else {
      accumulator.push([visit]);
    }

    return accumulator;
  }, []);
};

export const getParamFromUrl = (url = '', param = '') => {
  if (!url) {
    return '';
  }

  let tokens = url.split('?')[1];
  if (!tokens) {
    return '';
  }

  tokens = tokens.split('&').filter(pair =>
    pair.split('=')[0] === param);

  if (tokens.length > 0) {
    try {
      return decodeURIComponent(tokens[0].split('=')[1] || '');
    } catch (e) {
      return '';
    }
  }

  return '';
};

export const getFirstVisitedTime = (history) => {
  if (!history.length) {
    return 0;
  }

  let firstVisitedAt = history[0].lastVisitedAt;
  for (let i = 1, l = history.length; i < l; i += 1) {
    if (history[i].lastVisitedAt < firstVisitedAt) {
      firstVisitedAt = history[i].lastVisitedAt;
    }
  }

  return firstVisitedAt;
};

export const sortClusterSessionsFromRecentToOld = (sessions) => {
  sessions.sort((s1, s2) => {
    // Take the last item in each list;
    const s1Last = s1[s1.length - 1];
    const s2Last = s2[s2.length - 1];

    return s2Last.lastVisitedAt - s1Last.lastVisitedAt;
  });
  return sessions;
};
