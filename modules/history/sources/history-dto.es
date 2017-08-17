import utils from '../core/utils';

// https://github.com/substack/deep-freeze
/* eslint-disable */
function deepFreeze(o) {
  Object.freeze(o);

  Object.getOwnPropertyNames(o).forEach(function (prop) {
    if (o.hasOwnProperty(prop)
    && o[prop] !== null
    && (typeof o[prop] === "object" || typeof o[prop] === "function")
    && !Object.isFrozen(o[prop])) {
      deepFreeze(o[prop]);
    }
  });

  return o;
}
/* eslint-enable */

function createBaseStructure() {
  return {};
}

function mergePlaces(history, places) {
  deepFreeze(history);

  let urlCount = 0;

  const domainList = places.reduce((d, entry) => {
    const domains = d;

    if (!entry.title) {
      return domains;
    }

    urlCount += 1;

    const isCliqz = entry.url.indexOf('cliqz://') === 0;
    let host;

    if (isCliqz) {
      const details = utils.getDetailsFromUrl('https://cliqz.com');
      host = 'CLIQZ';

      domains[host] = domains[host] || {
        logo: utils.getLogoDetails(details),
        lastVisitedAt: entry.visit_date,
        baseUrl: '',
        visits: [],
      };
    } else {
      const details = utils.getDetailsFromUrl(entry.url);
      host = details.host;

      domains[host] = domains[host] || {
        logo: utils.getLogoDetails(details),
        lastVisitedAt: entry.visit_date,
        baseUrl: `${details.scheme}//${details.host}/`,
        visits: [],
      };
    }

    if (domains[host].lastVisitedAt < entry.visit_date) {
      domains[host].lastVisitedAt = entry.visit_date;
    }

    domains[host].visits.push({
      url: entry.url,
      title: entry.title,
      lastVisitedAt: entry.visit_date,
      sessionId: entry.session_id,
      visitId: entry.id,
    });

    return domains;
  }, {});

  return {
    totalUrlCount: places.length,
    urlCount,
    domains: domainList,
  };
}

function getUrls(history) {
  return Object.keys(history.domains).reduce(
    (urls, domain) => urls.concat(Object.keys(history.domains[domain].urls)),
    [],
  );
}

function mergeQueryDatabase(history, queryDatabase) {
  deepFreeze(history);

  const urls = getUrls(history);

  return queryDatabase.getQueriesForUrls(urls).then((queries) => {
    const newHistory = Object.assign({}, history);

    newHistory.domains = Object.assign({}, newHistory.domains);
    // thats messy, need to find a way to create deep clone
    Object.keys(newHistory.domains).forEach((domain) => {
      newHistory.domains[domain] = Object.assign({}, newHistory.domains[domain]);
      newHistory.domains[domain].urls =
        Object.assign({}, newHistory.domains[domain].urls);

      Object.keys(newHistory.domains[domain].urls).forEach((url) => {
        const urlIndex = urls.indexOf(url);
        const query = queries[urlIndex];

        newHistory.domains[domain].urls[url] =
          Object.assign({}, newHistory.domains[domain].urls[url]);
        newHistory.domains[domain].urls[url].query = query;
      });
    });

    return newHistory;
  });
}

function mergeMetaDatabase(h, metaDatabase) {
  return h.then((history) => {
    deepFreeze(history);

    const urls = getUrls(history);

    return Promise.all(
      urls.map(metaDatabase.getMeta.bind(metaDatabase)),
    ).then((metas) => {
      const newHistory = Object.assign({}, history);

      newHistory.domains = Object.assign({}, newHistory.domains);

      Object.keys(newHistory.domains).forEach((domain) => {
        newHistory.domains[domain] = Object.assign({}, newHistory.domains[domain]);
        newHistory.domains[domain].urls =
          Object.assign({}, newHistory.domains[domain].urls);

        Object.keys(newHistory.domains[domain].urls).forEach((url) => {
          const urlIndex = urls.indexOf(url);
          const meta = metas[urlIndex] || {};

          newHistory.domains[domain].urls[url] =
            Object.assign({}, newHistory.domains[domain].urls[url]);
          newHistory.domains[domain].urls[url].meta = meta;
        });
      });

      return newHistory;
    });
  });
}

function mergeActiveTabs(history, activeTabs) {
  deepFreeze(history);

  const newHistory = Object.assign({}, history);

  newHistory.tabs = activeTabs.reduce((t, tab) => {
    const tabs = t;
    const host = utils.getDetailsFromUrl(tab.url).host;
    tabs[host] = tabs[host] || {};
    tabs[host][tab.url] = tabs[host][tab.url] || {
      isCurrent: tab.isCurrent,
      index: tab.index,
    };
    return tabs;
  }, {});

  return newHistory;
}

// Returns a promise
function mergeMixer(h, mixer) {
  return h.then((history) => {
    deepFreeze(history);

    const newHistory = Object.assign({}, history);
    newHistory.domains = Object.assign({}, newHistory.domains);

    return Promise.all(
      Object.keys(newHistory.domains).map((domain) => {
        newHistory.domains[domain] = Object.assign({}, newHistory.domains[domain]);
        const baseUrl = newHistory.domains[domain].baseUrl;
        return mixer.getSnippet(baseUrl)
          .then((snippet) => { newHistory.domains[domain].snippet = snippet; })
          .catch(() => { newHistory.domains[domain].snippet = {}; });
      }),
    ).then(() => newHistory);
  });
}

function mergeNews(h, richHeader) {
  return h.then((history) => {
    deepFreeze(history);

    const newHistory = Object.assign({}, history);
    newHistory.domains = Object.assign({}, newHistory.domains);

    return Promise.all(
      Object.keys(newHistory.domains).map((domain) => {
        newHistory.domains[domain] = Object.assign({}, newHistory.domains[domain]);
        return richHeader.getNews(domain)
          .then((news) => { newHistory.domains[domain].news = news; })
          .catch(() => { newHistory.domains[domain].news = []; });
      }),
    ).then(() => newHistory);
  });
}

export default function ({ places, activeTabs, queryDatabase, metaDatabase, mixer, richHeader }) {
  let history = createBaseStructure();
  history = mergePlaces(history, places);
  history = mergeActiveTabs(history, activeTabs);

  if (queryDatabase) {
    history = mergeQueryDatabase(history, queryDatabase);
  }

  if (metaDatabase) {
    history = mergeMetaDatabase(history, metaDatabase);
  }

  if (mixer) {
    history = mergeMixer(history, mixer);
  }

  if (richHeader) {
    history = mergeNews(history, richHeader);
  }

  return history;
}
