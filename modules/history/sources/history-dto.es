import logos from '../core/services/logos';
import config from '../core/config';
import deepFreeze from '../core/helpers/deep-freeze';
import { getDetailsFromUrl } from '../core/url';
import { URLInfo } from '../core/url-info';

function createBaseStructure() {
  return {};
}

function mergePlaces(history, places) {
  deepFreeze(history);

  let urlCount = 0;

  const domainList = places.reduce((d, entry) => {
    const domains = d;

    urlCount += 1;

    const isCliqz = entry.url.indexOf('cliqz://') === 0;
    let host;

    if (isCliqz) {
      host = 'CLIQZ';

      domains[host] = domains[host] || {
        logo: logos.getLogoDetails(config.settings.HOMEPAGE_URL),
        lastVisitedAt: entry.visit_date,
        baseUrl: '',
        visits: [],
      };
    } else {
      const details = URLInfo.get(entry.url);
      host = details.hostname;

      domains[host] = domains[host] || {
        logo: logos.getLogoDetails(entry.url),
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
      title: entry.title || '',
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
      newHistory.domains[domain].urls = Object.assign({}, newHistory.domains[domain].urls);

      Object.keys(newHistory.domains[domain].urls).forEach((url) => {
        const urlIndex = urls.indexOf(url);
        const query = queries[urlIndex];

        newHistory.domains[domain].urls[url] = Object.assign(
          {},
          newHistory.domains[domain].urls[url]
        );
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
        newHistory.domains[domain].urls = Object.assign({}, newHistory.domains[domain].urls);

        Object.keys(newHistory.domains[domain].urls).forEach((url) => {
          const urlIndex = urls.indexOf(url);
          const meta = metas[urlIndex] || {};

          newHistory.domains[domain].urls[url] = Object.assign(
            {},
            newHistory.domains[domain].urls[url]
          );
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
    const host = getDetailsFromUrl(tab.url).host;
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
          .then(({ snippet, links }) => {
            newHistory.domains[domain].snippet = snippet;
            newHistory.domains[domain].links = links;
          })
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

  if (activeTabs) {
    history = mergeActiveTabs(history, activeTabs);
  }

  if (queryDatabase) {
    history = mergeQueryDatabase(history, queryDatabase);
  }

  if (metaDatabase) {
    history = mergeMetaDatabase(history, metaDatabase);
  }

  if (mixer) {
    history = mergeMixer(Promise.resolve(history), mixer);
  }

  if (richHeader) {
    history = mergeNews(history, richHeader);
  }

  // return history;
  return Promise.resolve(history);
}
