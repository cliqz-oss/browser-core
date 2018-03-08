/* global PlacesUtils */

import { Components } from '../globals';
import * as urlUtils from '../../core/url';

Components.utils.import('resource://gre/modules/PlacesUtils.jsm');

function observableFromSql(sql, columns) {
  // change row into object with columns as property names
  const rowToResults = row => columns.reduce((cols, column) => ({
    [column]: row.getResultByName(column),
    ...cols,
  }), Object.create(null));

  return {
    subscribe(handleResult, handleError, handleCompletion) {
      let doNothing = false;
      let pendingStatement;

      // use promiseDBConnection to avoid connection duplicates
      //   PlacesUtils.promiseDBConnection().then((conn) => {
      // IMPORTANT withConnectionWrapper is used instead as
      // promiseDBConnection is read-only.
      // TODO: separate read and write into separte methods
      PlacesUtils.withConnectionWrapper('CLIQZ', (conn) => {
        // cancel already disposed subscribtion
        if (doNothing) {
          return Promise.resolve();
        }
        // access raw connection to create statements that can be canceled
        const connection = conn._connectionData._dbConn;
        const statement = connection.createAsyncStatement(sql);

        return new Promise((resolve) => {
          pendingStatement = statement.executeAsync({
            handleResult(rowSet) {
              for (let row = rowSet.getNextRow(); row; row = rowSet.getNextRow()) {
                const result = rowToResults(row);
                handleResult(result);
              }
            },
            handleCompletion(...args) {
              handleCompletion(...args);
              resolve();
            },
            handleError,
          });
        });
      });

      return {
        dispose() {
          if (pendingStatement) {
            try {
              pendingStatement.cancel();
            } catch (e) {
              // error is thrown on cancel called multiple times
            }
          }

          doNothing = true;
        },
      };
    }
  };
}

const HistoryProvider = {
  query: function query(sql, columns = []) {
    const results = [];
    let resolver;
    let rejecter;

    const promise = new Promise((resolve, reject) => {
      resolver = resolve;
      rejecter = reject;
    });

    const observable = observableFromSql(sql, columns);

    observable.subscribe(
      Array.prototype.push.bind(results),
      rejecter,
      () => resolver(results)
    );

    return promise;
  }
};

const visitSessionStatement = `
  WITH RECURSIVE
    visit_sessions(visit_id, session_id) AS (
      select id, id from moz_historyvisits where from_visit IN (0, id)
      union
      select id, session_id from moz_historyvisits, visit_sessions
      where moz_historyvisits.from_visit=visit_sessions.visit_id
    )
`;

const searchQuery = ({ limit, frameStartsAt, frameEndsAt, domain, query },
  { onlyCount } = { onlyCount: false }) => {
  const conditions = [];

  if (frameStartsAt) {
    conditions.push(`visit_date >= ${frameStartsAt}`);
  }

  if (frameEndsAt) {
    conditions.push(`visit_date < ${frameEndsAt}`);
  }

  if (domain) {
    conditions.push(`url GLOB '*://${domain}/*'`);
  }

  if (query) {
    const aSearchString = query ? `'${query}'` : '';
    const aURL = 'url';
    const aTitle = 'title';
    const aTags = 'NULL';
    const aVisitCount = 'visit_count';
    const aTyped = 'typed';
    const aBookmark = 'NULL';
    const aOpenPageCount = 'NULL';
    const aMatchBehavior = '0'; // MATCH_ANYWHERE
    const aSearchBehavior = '1'; // BEHAVIOR_HISTORY

    conditions.push(`AUTOCOMPLETE_MATCH(${aSearchString}, ${aURL}, ${aTitle},
        ${aTags}, ${aVisitCount}, ${aTyped}, ${aBookmark}, ${aOpenPageCount},
        ${aMatchBehavior}, ${aSearchBehavior})`);
  }

  const conditionsStatement = conditions.length > 0 ?
    `WHERE ${conditions.join(' AND ')}` : '';

  const limitStatement = limit ? `LIMIT ${limit}` : '';

  const selectStatement = onlyCount ? 'COUNT(DISTINCT visit_sessions.session_id) as count' : `
      moz_historyvisits.id AS id,
      visit_sessions.session_id AS session_id,
      moz_historyvisits.visit_date AS visit_date
  `;

  return `
    ${visitSessionStatement}

    SELECT ${selectStatement}
    FROM moz_historyvisits
    JOIN moz_places ON moz_historyvisits.place_id = moz_places.id
    JOIN visit_sessions ON moz_historyvisits.id = visit_sessions.visit_id
    ${conditionsStatement}
    ORDER BY visit_date DESC
    ${limitStatement}
  `;
};

function findLastVisitId(url, since = 0) {
  return HistoryProvider.query(
    `
      SELECT moz_historyvisits.id AS id
      FROM moz_historyvisits
      JOIN moz_places ON moz_places.id = moz_historyvisits.place_id
      WHERE moz_places.url = '${url}'
        ${since ? `AND moz_historyvisits.visit_date > ${since}` : ''}
      ORDER BY moz_historyvisits.visit_date DESC
      LIMIT 1
    `,
    ['id'],
  ).then(([{ id } = {}] = []) => id);
}

// second * minute * hour * day * year
const YEAR_IN_MS = 1000 * 60 * 60 * 24 * 365;

export default class {
  static sessionCountObservable(query) {
    const sql = searchQuery({
      query,
      frameStartsAt: (Date.now() - (YEAR_IN_MS / 2)) * 1000,
      frameEndsAt: Date.now() * 1000,
    }, { onlyCount: true });

    return observableFromSql(sql, ['count']);
  }

  static deleteVisit(visitId) {
    return HistoryProvider.query(
      `
        SELECT id, from_visit AS fromVisit
        FROM moz_historyvisits
        WHERE visit_date = '${visitId}'
        LIMIT 1
      `,
      ['id', 'fromVisit'],
    ).then(([{ id, fromVisit }]) =>
      HistoryProvider.query(
        `
          UPDATE moz_historyvisits
          SET from_visit = '${fromVisit}'
          WHERE from_visit = ${id}
        `
      ).then(() => PlacesUtils.history.removePagesByTimeframe(visitId, visitId))
    );
  }

  static deleteVisits(visitIds) {
    visitIds.forEach((visitId) => {
      PlacesUtils.history.removePagesByTimeframe(visitId, visitId);
    });
  }

  static showHistoryDeletionPopup(window) {
    Components.classes['@mozilla.org/browser/browserglue;1']
      .getService(Components.interfaces.nsIBrowserGlue).sanitize(window);
  }

  // TODO: introduce command method to separate read from write
  static query({ limit, frameStartsAt, frameEndsAt, domain, query }) {
    const sessionsQuery = sessionIds => `
      ${visitSessionStatement}

      SELECT moz_historyvisits.id AS id, url, visit_date, title, session_id
      FROM moz_historyvisits
      JOIN moz_places ON moz_historyvisits.place_id = moz_places.id
      JOIN visit_sessions ON moz_historyvisits.id = visit_sessions.visit_id
      WHERE visit_sessions.session_id IN (${sessionIds.join(', ')})
    `;


    const sql = searchQuery({ frameStartsAt, frameEndsAt, domain, query, limit });

    return HistoryProvider.query(
      sql,
      ['id', 'session_id', 'visit_date'],
    ).then((places) => {
      if (places.length === 0) {
        return {
          places: [],
        };
      }

      const sessionIds = new Set();
      let firstVisit = places[0].visit_date;
      let lastVisit = places[0].visit_date;

      places.forEach((visit) => {
        sessionIds.add(visit.session_id);

        if (visit.visit_date > lastVisit) {
          lastVisit = visit.visit_date;
        }

        if (visit.visit_date < firstVisit) {
          firstVisit = visit.visit_date;
        }
      });

      return HistoryProvider.query(
        sessionsQuery([...sessionIds]),
        ['id', 'url', 'visit_date', 'title', 'session_id'],
      ).then(visits => ({
        from: firstVisit,
        to: lastVisit,
        places: visits,
      }));
    });
  }

  static fillFromVisit(url, triggeringUrl) {
    const oneSecondAgo = (Date.now() - (60 * 1000)) * 1000;
    const { action, scheme, path, originalUrl } = urlUtils.getDetailsFromUrl(url);
    let cleanUrl = originalUrl;
    if (action && action !== 'visiturl') {
      return Promise.resolve();
    }

    // normalize url
    if (!scheme) {
      cleanUrl = `http://${originalUrl}`;
    }
    if (!path) {
      cleanUrl += '/';
    }

    return Promise.all([
      findLastVisitId(cleanUrl, oneSecondAgo),
      findLastVisitId(triggeringUrl),
    ]).then(([visitId, triggeringVisitId]) => {
      if (!visitId || !triggeringVisitId) {
        return Promise.resolve();
      }

      return HistoryProvider.query(
        `
          UPDATE moz_historyvisits
          SET from_visit = ${triggeringVisitId}
          WHERE id = ${visitId}
            AND from_visit = 0
        `,
      );
    });
  }

  static markAsHidden(url) {
    return HistoryProvider.query(`
      UPDATE moz_places
      SET hidden = 1, visit_count = 0
      WHERE url = '${url}'
    `);
  }

  static migrate(version) {
    if (version === 0) {
      return HistoryProvider.query(`
        UPDATE moz_places
        SET hidden = 1, visit_count = 0
        WHERE url LIKE "https://cliqz.com/search?q=%" AND visit_count > 0
      `);
    }
    return Promise.resolve();
  }
}
