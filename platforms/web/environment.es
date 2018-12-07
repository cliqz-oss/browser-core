/* eslint no-param-reassign: 'off' */
/* global window */
/* global CLIQZ */
/* global Search */

import console from '../core/console';
import prefs from '../core/prefs';
import Storage from '../core/storage';

// TODO: get rid of me!
const storage = new Storage();

const CLIQZEnvironment = {
  RESULTS_TIMEOUT: 60000, // 1 minute
  _resultsHandler(r) {
    if (CLIQZEnvironment.lastSearch !== r._searchString) {
      console.log(`u='${CLIQZEnvironment.lastSearch}' s='${r._searchString}', returning`, 'urlbar!=search');
      return;
    }

    r._results.splice(3);

    window.CLIQZ.UI.renderResults(r);
  },
  search(e) {
    if (!e || e === '') {
      CLIQZEnvironment.lastSearch = '';
      CLIQZ.UI.stopProgressBar();
      CLIQZ.UI.lastResults = null;
      return;
    }

    e = decodeURIComponent(e);

    CLIQZEnvironment.setCurrentQuery(e);

    CLIQZEnvironment.lastSearch = e;

    window.CLIQZ.UI.startProgressBar();


    // start XHR call ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // console.log(e,'XHR');
    if (!CLIQZEnvironment.SEARCH) { CLIQZEnvironment.SEARCH = new Search(); }

    CLIQZEnvironment.SEARCH.search(e, CLIQZEnvironment._resultsHandler);
  },
  Promise,
  isPrivate() { return false; },
  isOnPrivateTab() { return false; },
  getWindow() { return window; },
  // TODO - SHOUD BE MOVED TO A LOGIC MODULE
  openLink(window, url) {
    if (url !== '#') {
      if (url.indexOf('http') === -1) {
        url = `http://${url}`;
      }
      window.location.href = url;
    }

    return false;
  },
};

CLIQZEnvironment.setCurrentQuery = (query) => {
  if (prefs.get('incognito', false) || query.match(/http[s]{0,1}:/)) {
    return;
  }

  let recentItems = storage.getObject('recentQueries', []);

  if (!recentItems[0]) {
    recentItems = [{ id: 1, query, timestamp: Date.now() }];
    storage.setObject('recentQueries', recentItems);
  } else if (
    recentItems[0].query === query && Date.now() - recentItems[0].timestamp < 10 * 1000 * 60
  ) {
    // DO NOTHING
    // temporary work around repetitive queries coming from iOS
  } else if (recentItems[0].query.indexOf(query) + query.indexOf(recentItems[0].query) > -2
    && Date.now() - recentItems[0].timestamp < 5 * 1000) {
    recentItems[0] = { id: recentItems[0].id, query, timestamp: Date.now() };
    storage.setObject('recentQueries', recentItems);
  } else {
    recentItems.unshift({ id: recentItems[0].id + 1, query, timestamp: Date.now() });
    recentItems = recentItems.slice(0, 60);
    storage.setObject('recentQueries', recentItems);
  }
};

export default CLIQZEnvironment;
