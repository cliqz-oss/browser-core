/* eslint-disable no-param-reassign */

/*
 * This module provides misc functions related to the FF history database.
 */

import utils from '../core/utils';
import Defer from '../core/helpers/defer';
import { Components } from './globals';
import PlacesUtils from './places-utils';
import console from '../core/console';

const { classes: Cc, interfaces: Ci } = Components;

const bookmarkService = Cc['@mozilla.org/browser/nav-bookmarks-service;1'].getService(Ci.nsINavBookmarksService);

function getUrlVariations(url) {
  let protocols = ['http:', 'https:'];
  const u = new URL(url);

  if (!protocols.includes(u.protocol)) {
    protocols = [u.protocol];
  }

  return Array.from(
    protocols.reduce((urls, protocol) => {
      const path = u.pathname.replace(/\/+$/, '');
      u.protocol = protocol;
      u.pathname = path;
      urls.add(u.toString());
      u.pathname = `${path}/`;
      urls.add(u.toString());
      return urls;
    }, new Set())
  );
}

const CliqzHistoryManager = {
  init() {
  },
  unload() {
  },
  getStats(callback) {
    let historysize = 0;
    const today = utils.getDay();
    let history = today;

    this.PlacesInterestsStorage
      ._execute(
        'SELECT count(*) cnt, MIN(v.visit_date) first ' +
        'FROM moz_historyvisits v ' +
        'JOIN moz_places h ' +
        'ON h.id = v.place_id ' +
        'WHERE h.hidden = 0 AND h.visit_count > 0 ',
        ['cnt', 'first'],
        (result) => {
          try {
            history = Math.floor(result.first / 86400000000);
            historysize = result.cnt;
          } catch (ex) {
            // empty
          }
        }
      )
      .then(() => {
        if (utils) {
          callback({
            size: historysize,
            days: utils.getDay() - history
          });
        }
      });
  },
  // moz_inputhistory records queries-to-URL mappings to adapt history
  // results to a user's query behavior; moz_inputhistory would be automatically
  // updated by Firefox's Places system if the dropdown was not overidden--
  // thus, we have to update moz_inputhistory manually whenever the user
  // selects a page from history or autocomplete
  updateInputHistory(input, url) {
    if (url.indexOf('://') === -1) {
      url = `http://${url}`;
    }

    // copied from http://mxr.mozilla.org/mozilla-central/source/toolkit/components/places/nsNavHistory.cpp#4525
    const sql =
        'INSERT OR REPLACE INTO moz_inputhistory ' +
        'SELECT h.id, IFNULL(i.input, :input_text), IFNULL(i.use_count, 0) * .9 + 1 ' +
        'FROM moz_places h ' +
        'LEFT JOIN moz_inputhistory i ON i.place_id = h.id AND i.input = :input_text ' +
        'WHERE url = :page_url ';
    setTimeout(() => {
      CliqzHistoryManager.PlacesInterestsStorage
        ._execute(
          sql,
          // no results for INSERT
          [],
          () => { },
          {
            input_text: input,
            page_url: url
          }
        )
        .then(() => {
          // console.log('updated moz_inputhistory', 'CLIQZ.HISTORY_MANAGER');
        });
    },
    // wait a bit before updating moz_inputhistory; otherwise, the URL might
    // not exist in moz_places yet and above SQL statement would not insert anything
    5000);
  },
  // Update the title of a page in the FF history database
  updatePageTitle(url, title) {
    if (url.indexOf('://') === -1) {
      url = `http://${url}`;
    }

    const sql =
      'UPDATE moz_places ' +
      'SET title = :title ' +
      'WHERE url = :page_url ';

    CliqzHistoryManager.PlacesInterestsStorage
      ._execute(
        sql,
        // no results for UPDATE
        [],
        () => { },
        {
          title,
          page_url: url
        }
      )
      .then(() => {
      });
  },
  getPageTitle(url) {
    const hs = CliqzHistoryManager.getHistoryService();
    const uri = CliqzHistoryManager.makeURI(url);
    if (hs && uri) {
      return hs.getPageTitle(uri);
    }
    return undefined;
  },
  historyService: null,
  ioService: null,
  getHistoryService() {
    if (!CliqzHistoryManager.historyService) {
      try {
        CliqzHistoryManager.historyService = Components
          .classes['@mozilla.org/browser/nav-history-service;1']
          .getService(Ci.nsINavHistoryService);
      } catch (e) {
        console.log(`unable to get history service: ${e}`);
      }
    }
    return CliqzHistoryManager.historyService;
  },
  getIoService() {
    if (!CliqzHistoryManager.ioService) {
      try {
        CliqzHistoryManager.ioService =
          Components.classes['@mozilla.org/network/io-service;1']
            .getService(Ci.nsIIOService);
      } catch (e) {
        console.log(`unable to get IO service: ${e}`);
      }
    }
    return CliqzHistoryManager.ioService;
  },
  makeURI(url) {
    const ios = CliqzHistoryManager.getIoService();
    if (ios) {
      return ios.newURI(url, null, null);
    }
    return false;
  },
  PlacesInterestsStorage: {
    _execute: async function pisExecute(sql, columns, onRow, parameters) {
      const conn = await new Promise(resolve => PlacesUtils.withConnectionWrapper('CLIQZ', resolve));
      const connection = conn._connectionData._dbConn;
      const statement = connection.createAsyncStatement(sql);
      const deferredResult = new Defer();
      if (parameters) {
        Object.keys(parameters).forEach((key) => {
          statement.params[key] = parameters[key];
        });
      }
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
            let result;
            if (columns !== null) {
              // For just a single column, make the result that column
              if (columns.length === 1) {
                result = row.getResultByName(columns[0]);
              } else {
                // For multiple columns, put as values on an object
                result = {};
                for (let i = 0; i < columns.length; i += 1) {
                  const column = columns[i];
                  result[column] = row.getResultByName(column);
                }
              }
            }
            // pass the result to the onRow handler
            onRow(result);
            row = resultSet.getNextRow();
          }
        }
      });
      return deferredResult.promise;
    }
  },
  removeFromHistory(url, { strict } = { strict: true }) {
    try {
      const urls = strict ? [url] : getUrlVariations(url);
      return PlacesUtils.history.remove(urls);
    } catch (e) {
      console.log(e.message, 'Error removing entry from history');
    }
    return Promise.resolve();
  },
  removeFromBookmarks(url) {
    // PlacesUtils.getBookmarksForURI is obsolete since Firefox 60
    if (!PlacesUtils.getBookmarksForURI) {
      return PlacesUtils.bookmarks.search({ url })
        .then(bookmark => PlacesUtils.bookmarks.remove(bookmark))
        .catch(e => utils.log(e.message, 'Error removing entry from bookmarks'));
    }

    // but PlacesUtils.bookmarks are not available in FF52 yet,
    // have to do this the old way.
    try {
      const uri = CliqzHistoryManager.makeURI(url);
      const [itemId] = PlacesUtils.getBookmarksForURI(uri);
      if (itemId) {
        bookmarkService.removeItem(itemId);
      }
    } catch (e) {
      console.log(e.message, 'Error removing entry from bookmarks');
    }
    return Promise.resolve();
  },
  isBookmarked(url) {
    const uri = CliqzHistoryManager.makeURI(url);
    if (bookmarkService.isBookmarked) {
      return Promise.resolve(bookmarkService.isBookmarked(uri));
    }
    // isBookmarked is obsolete since Firefox 57
    return PlacesUtils.bookmarks.fetch({ url })
      .then(res => res !== null);
  }
};

export default CliqzHistoryManager;
