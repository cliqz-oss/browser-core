import HistoryProvider from '../../core/history-provider';


function findLastVisitId(url, since) {
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
  ).then(([{ id }]) => id);
}

export default class {
  static query({ limit, frameStartsAt, frameEndsAt, domain, query }) {
    const conditions = [];

    if (frameStartsAt) {
      conditions.push(`visit_date >= ${frameStartsAt}`);
    } if (frameEndsAt) {
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

    const visitSessionStatement = `
      WITH RECURSIVE
        visit_sessions(visit_id, session_id) AS (
          select id, id from moz_historyvisits where from_visit IN (0, id)
          union
          select id, session_id from moz_historyvisits, visit_sessions
          where moz_historyvisits.from_visit=visit_sessions.visit_id
        )
    `;

    const searchQuery = `
      ${visitSessionStatement}

      SELECT
        moz_historyvisits.id AS id,
        visit_sessions.session_id AS session_id,
        moz_historyvisits.visit_date AS visit_date
      FROM moz_historyvisits
      JOIN moz_places ON moz_historyvisits.place_id = moz_places.id
      JOIN visit_sessions ON moz_historyvisits.id = visit_sessions.visit_id
      ${conditionsStatement}
      ORDER BY visit_date DESC
      ${limitStatement}
    `;

    const sessionsQuery = sessionIds => `
      ${visitSessionStatement}

      SELECT moz_historyvisits.id AS id, url, visit_date, title, session_id
      FROM moz_historyvisits
      JOIN moz_places ON moz_historyvisits.place_id = moz_places.id
      JOIN visit_sessions ON moz_historyvisits.id = visit_sessions.visit_id
      WHERE visit_sessions.session_id IN (${sessionIds.join(', ')})
    `;

    return HistoryProvider.query(
      searchQuery,
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
    return Promise.all([
      findLastVisitId(url, oneSecondAgo),
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

}
