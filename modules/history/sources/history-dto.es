import { utils } from "core/cliqz";

function getTabIndex(activeTabs, url) {
  const activeTab = activeTabs.find( tab => tab.url === url );
  if (activeTab) {
    return activeTab.index;
  } else {
    return null;
  }
}

function isUrlInCurrentTab(activeTabs, url) {
  return activeTabs.some( tab => tab.isCurrent && (tab.url === url) );
}

// https://github.com/substack/deep-freeze
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

function createBaseStructure() {
  return {};
}

function mergePlaces(history, places) {
  deepFreeze(history);

  let urlCount = 0,
    frameStartsAt, frameEndsAt;

  if (places.length > 0) {
    frameStartsAt = places[places.length-1]["last_visit_date"];
  }

  const domains = places.reduce( (domains, entry) => {
    if (!entry.title) {
      return domains;
    }

    urlCount++;

    if (!frameEndsAt) {
      frameEndsAt = entry["last_visit_date"];
    }

    const details = utils.getDetailsFromUrl(entry.url),
      host = details.host;

    domains[host] = domains[host] || {
      logo: utils.getLogoDetails(details),
      lastVisitedAt: entry["last_visit_date"],
      baseUrl: `${details.scheme}//${details.host}/`,
      urls: { }
    };

    if (domains[host].lastVisitedAt < entry["last_visit_date"]) {
      domains[host].lastVisitedAt = entry["last_visit_date"];
    }

    domains[host].urls[entry.url] = {
      title: entry.title,
      lastVisitedAt: entry["last_visit_date"],
    };

    return domains;
  }, {});


  return {
    urlCount,
    frameStartsAt,
    frameEndsAt,
    domains
  };
}

function getUrls(history) {
  return Object.keys(history.domains).reduce(
    (urls, domain) => urls.concat(Object.keys(history.domains[domain].urls)),
    []
  );
}

function mergeQueryDatabase(history, queryDatabase) {
  deepFreeze(history);

  const urls = getUrls(history);

  return queryDatabase.getQueriesForUrls(urls).then( queries => {
    const newHistory = Object.assign({}, history);

    newHistory.domains = Object.assign({}, newHistory.domains);
    // thats messy, need to find a way to create deep clone
    Object.keys(newHistory.domains).forEach( domain => {
      newHistory.domains[domain] = Object.assign({}, newHistory.domains[domain]);
      newHistory.domains[domain].urls =
        Object.assign({}, newHistory.domains[domain].urls);

      Object.keys(newHistory.domains[domain].urls).forEach( url => {
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

function mergeMetaDatabase(history, metaDatabase) {
  return history.then( history => {
    deepFreeze(history);

    const urls = getUrls(history);

    return Promise.all(
      urls.map(metaDatabase.getMeta.bind(metaDatabase))
    ).then( metas => {
      const newHistory = Object.assign({}, history);

      newHistory.domains = Object.assign({}, newHistory.domains);

      Object.keys(newHistory.domains).forEach( domain => {
        newHistory.domains[domain] = Object.assign({}, newHistory.domains[domain]);
        newHistory.domains[domain].urls =
          Object.assign({}, newHistory.domains[domain].urls);

        Object.keys(newHistory.domains[domain].urls).forEach( url => {
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

  newHistory.tabs = activeTabs.reduce( (tabs, tab) => {
    const host = utils.getDetailsFromUrl(tab.url).host;
    tabs[host] = tabs[host] || {};
    tabs[host][tab.url] = tabs[host][tab.url] || {
      isCurrent: tab.isCurrent,
      index: tab.index
    };
    return tabs;
  }, {});

  return newHistory;
}

// Returns a promise
function mergeMixer(history, mixer) {
  return history.then( history => {
    deepFreeze(history);

    const newHistory = Object.assign({}, history);
    newHistory.domains = Object.assign({}, newHistory.domains);

    return Promise.all(
      Object.keys(newHistory.domains).map( domain => {
        newHistory.domains[domain] = Object.assign({}, newHistory.domains[domain]);
        const baseUrl = newHistory.domains[domain].baseUrl;
        return mixer.getSnippet(baseUrl)
          .then( snippet => newHistory.domains[domain].snippet = snippet )
          .catch( () => newHistory.domains[domain].snippet = {} );
      })
    ).then( () => newHistory );
  });
}

function mergeNews(history, richHeader) {
  return history.then( history => {
    deepFreeze(history);


    const newHistory = Object.assign({}, history);
    newHistory.domains = Object.assign({}, newHistory.domains);

    return Promise.all(
      Object.keys(newHistory.domains).map( domain => {
        newHistory.domains[domain] = Object.assign({}, newHistory.domains[domain]);
        return richHeader.getNews(domain)
          .then( news => newHistory.domains[domain].news = news )
          .catch( () => newHistory.domains[domain].news = [] );
      })
    ).then( () => newHistory );
  });
}

export default function ({ places, queryDatabase, activeTabs, mixer, richHeader, metaDatabase }) {
  let history = createBaseStructure();
  history = mergePlaces(history, places);
  history = mergeActiveTabs(history, activeTabs)
  history = mergeQueryDatabase(history, queryDatabase);
  history = mergeMetaDatabase(history, metaDatabase);
  history = mergeMixer(history, mixer);
  history = mergeNews(history, richHeader);
  return history;
}
