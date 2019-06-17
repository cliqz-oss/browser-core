/* global Components, PlacesUtils, Services */
Components.utils.import('resource://gre/modules/PlacesUtils.jsm');

function observableFromSql(sql, columns = [], params = {}) {
  // change row into object with columns as property names
  const rowToResults = row => columns.reduce((cols, column) => ({
    [column]: row.getResultByName(column),
    ...cols,
  }), Object.create(null));

  return {
    subscribe(handleResult, handleError, handleCompletion) {
      let doNothing = false;
      let pendingStatement;

      if (typeof PlacesUtils === 'undefined') {
        // history api is not available for Android
        return {
          dispose() {},
        };
      }

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
        Object.keys(params).forEach((key) => {
          statement.params[key] = params[key];
        });

        return new Promise((resolve) => {
          pendingStatement = statement.executeAsync({
            handleResult(rowSet) {
              for (let row = rowSet.getNextRow(); row; row = rowSet.getNextRow()) {
                handleResult(rowToResults(row));
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
  query: function query(sql, columns, params) {
    const results = [];
    let resolver;
    let rejecter;

    const promise = new Promise((resolve, reject) => {
      resolver = resolve;
      rejecter = reject;
    });

    const observable = observableFromSql(sql, columns, params);

    observable.subscribe(
      row => results.push(row),
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
  const params = {};

  if (frameStartsAt) {
    conditions.push('visit_date >= :frameStartsAt');
    params.frameStartsAt = frameStartsAt;
  }

  if (frameEndsAt) {
    conditions.push('visit_date < :frameEndsAt');
    params.frameEndsAt = frameEndsAt;
  }

  if (domain) {
    conditions.push('url GLOB (\'*://\' || :domain || \'/*\')');
    params.domain = domain;
  }

  if (query) {
    params.aSearchString = query || '';
    const aURL = 'url';
    const aTitle = 'title';
    const aTags = 'NULL';
    const aVisitCount = 'visit_count';
    const aTyped = 'typed';
    const aBookmark = 'NULL';
    const aOpenPageCount = 'NULL';
    const aMatchBehavior = '0'; // MATCH_ANYWHERE
    const aSearchBehavior = '1'; // BEHAVIOR_HISTORY

    conditions.push(`AUTOCOMPLETE_MATCH(:aSearchString, ${aURL}, ${aTitle},
        ${aTags}, ${aVisitCount}, ${aTyped}, ${aBookmark}, ${aOpenPageCount},
        ${aMatchBehavior}, ${aSearchBehavior})`);
  }

  const conditionsStatement = conditions.length > 0
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  let limitStatement = '';
  if (limit) {
    limitStatement = 'LIMIT :limit';
    params.limit = limit;
  }

  const selectStatement = onlyCount ? 'COUNT(DISTINCT visit_sessions.session_id) as count' : `
      moz_historyvisits.id AS id,
      visit_sessions.session_id AS session_id,
      moz_historyvisits.visit_date AS visit_date
  `;

  const sql = `
    ${visitSessionStatement}

    SELECT ${selectStatement}
    FROM moz_historyvisits
    JOIN moz_places ON moz_historyvisits.place_id = moz_places.id
    JOIN visit_sessions ON moz_historyvisits.id = visit_sessions.visit_id
    ${conditionsStatement}
    ORDER BY visit_date DESC
    ${limitStatement}
  `;
  return { sql, params };
};

function findLastVisitId(url, since = 0) {
  const params = { url };
  if (since) {
    params.since = since;
  }
  return HistoryProvider.query(
    `
      SELECT moz_historyvisits.id AS id
      FROM moz_historyvisits
      JOIN moz_places ON moz_places.id = moz_historyvisits.place_id
      WHERE moz_places.url = :url
        ${since ? 'AND moz_historyvisits.visit_date > :since' : ''}
      ORDER BY moz_historyvisits.visit_date DESC
      LIMIT 1
    `,
    ['id'],
    params,
  ).then(([{ id } = {}] = []) => id);
}

export default class {
  static deleteVisit(visitId) {
    return HistoryProvider.query(
      `
        SELECT id, from_visit AS fromVisit
        FROM moz_historyvisits
        WHERE visit_date = :visitId
        LIMIT 1
      `,
      ['id', 'fromVisit'],
      { visitId }
    ).then(([{ id, fromVisit }]) =>
      HistoryProvider.query(
        `
          UPDATE moz_historyvisits
          SET from_visit = :fromVisit
          WHERE from_visit = :id
        `,
        [],
        { fromVisit, id }
      ).then(() => PlacesUtils.history.removeVisitsByFilter({
        beginDate: PlacesUtils.toDate(+visitId),
        endDate: PlacesUtils.toDate(+visitId + 1000)
      })));
  }

  static deleteVisits(visitIds) {
    return visitIds.reduce(
      (deletePromise, visitId) => deletePromise.then(() => this.deleteVisit(visitId)),
      Promise.resolve()
    );
  }

  static showHistoryDeletionPopup(window) {
    try {
      // Firefox < 60
      Components.classes['@mozilla.org/browser/browserglue;1']
        .getService(Components.interfaces.nsIBrowserGlue).sanitize(window);
    } catch (e) {
      // Firefox > 60
      const SanitizerWrapper = Components.utils.import('resource:///modules/Sanitizer.jsm');
      const Sanitizer = SanitizerWrapper.Sanitizer;
      Sanitizer.showUI();
    }
  }

  static addVisit({ url, title, transition, visitTime }) {
    if (!url || !visitTime) {
      return Promise.resolve();
    }

    const asyncHistory = Components.classes['@mozilla.org/browser/history;1']
      .getService(Components.interfaces.mozIAsyncHistory);
    const uri = Services.io.newURI(url, null, null);
    const visitTimestamp = visitTime * 1000;
    const place = {
      uri,
      title,
      visits: [{
        visitDate: visitTimestamp,
        transitionType: transition || Components.interfaces.nsINavHistoryService.TRANSITION_TYPED,
      }],
    };

    return new Promise((handleCompletion, handleError) => asyncHistory.updatePlaces(place, {
      handleError,
      handleResult: () => {},
      handleCompletion,
    }));
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


    const { sql, params } = searchQuery({ frameStartsAt, frameEndsAt, domain, query, limit });

    return HistoryProvider.query(
      sql,
      ['id', 'session_id', 'visit_date'],
      params,
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
    return Promise.all([
      findLastVisitId(url, oneSecondAgo),
      findLastVisitId(triggeringUrl),
    ]).then(async ([visitId, triggeringVisitId]) => {
      const meta = {
        visitId,
        triggeringVisitId,
      };

      if (!visitId || !triggeringVisitId) {
        return Promise.reject(meta);
      }

      await HistoryProvider.query(
        `
          UPDATE moz_historyvisits
          SET from_visit = :triggeringVisitId
          WHERE id = :visitId
            AND from_visit = 0
        `, [], { triggeringVisitId, visitId },
      );

      return meta;
    });
  }

  static markAsHidden(url) {
    return HistoryProvider.query(`
      UPDATE moz_places
      SET hidden = 1, visit_count = 0
      WHERE url = :url
    `, [], { url });
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

  static async cleanupEmptySearches() {
    const sql = `
      SELECT visit_date, place_id, url, moz_historyvisits.id as search_visit_id
      FROM moz_historyvisits
        JOIN moz_places ON moz_historyvisits.place_id = moz_places.id
        WHERE moz_places.url LIKE "https://cliqz.com/search?q=%"
          AND not exists(SELECT from_visit FROM moz_historyvisits WHERE from_visit = search_visit_id)
    `;
    const places = await HistoryProvider
      .query(sql, ['visit_date', 'place_id', 'url', 'search_visit_id'], {});
    return places.forEach((place) => {
      PlacesUtils.history.removeVisitsByFilter({
        beginDate: PlacesUtils.toDate(+place.visit_date),
        endDate: PlacesUtils.toDate(+place.visit_date + 1000),
      });
    });
  }

  /**
   * Minimal query interface to get the visits between two timestamps.
   */
  static async queryVisitsForTimespan({ frameStartsAt, frameEndsAt }) {
    const sql = `
      SELECT url, visit_date as ts
      FROM moz_historyvisits
      JOIN moz_places ON moz_historyvisits.place_id = moz_places.id
      WHERE moz_historyvisits.visit_date BETWEEN :frameStartsAt AND :frameEndsAt;
    `;
    const places = await HistoryProvider.query(sql, ['url', 'ts'], { frameStartsAt, frameEndsAt });
    for (let i = 0; i < places.length; i += 1) {
      places[i].ts = Math.floor(places[i].ts / 1000);
    }
    return places;
  }

  static async stats() {
    return {
      size: -1,
      days: -1
    };
  }
}
