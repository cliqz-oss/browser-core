/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import SQLite from 'react-native-sqlite-2';
import events from '../../core/events';

const CREATE_VISIT_TABLE = 'CREATE TABLE IF NOT EXISTS visits(url TEXT PRIMARY KEY NOT NULL, title TEXT, last_visit INT NOT NULL, visit_count INT NOT NULL DEFAULT 0)';

export default class {
  constructor() {
    this.db = SQLite.openDatabase('visits.db', '1.0', '', 1);
    this.db.transaction((txn) => {
      txn.executeSql(CREATE_VISIT_TABLE, []);
      txn.executeSql('PRAGMA case_sensitive_like=OFF;');
    });
    events.sub('history:add', (entry) => {
      this.addHistoryEntry(entry);
    });
  }

  query(limit, frameStartsAt, frameEndsAt, domain, query) {
    return new Promise((resolve) => {
      this.db.transaction((txn) => {
        let sql = 'SELECT url, title, last_visit AS visit_date FROM visits WHERE ';
        const filters = [`last_visit >= ${frameStartsAt || 0}`,
          `last_visit < ${frameEndsAt || Number.MAX_SAFE_INTEGER}`];
        if (domain) {
          filters.push(`domain LIKE '://${domain}`);
        }
        if (query) {
          filters.push(`(url LIKE '%${query}%' OR title LIKE '%${query}%')`);
        }
        sql += filters.join(' AND ');
        sql += ' ORDER BY last_visit DESC';
        sql += ` LIMIT ${limit}`;
        txn.executeSql(sql, [], (tx, res) => {
          const places = [];
          for (let i = 0; i < res.rows.length; i += 1) {
            places.push(res.rows.item(i));
          }
          resolve({
            places,
            from: frameStartsAt,
            to: frameEndsAt,
          });
        });
      });
    });
  }

  static fillFromVisit() {
  }

  addHistoryEntry(entry) {
    const { title, url, lastVisitDate } = entry;
    this.db.transaction((txn) => {
      txn.executeSql('INSERT OR IGNORE INTO visits (url, title, last_visit) VALUES (?, ?, ?); ',
        [url, title, lastVisitDate]);
      txn.executeSql('UPDATE visits SET visit_count = visit_count + 1, last_visit = ? WHERE url = ?;',
        [lastVisitDate, url]);
    });
  }
}
