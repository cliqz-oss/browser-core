/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { NativeModules } from 'react-native';
import SqliteHistory from './sqlite-history';

let history = NativeModules.HistoryModule;
if (!history) {
  history = new SqliteHistory();
}

export const History = history;

export default class {
  static query({ limit, frameStartsAt, frameEndsAt, domain }) {
    return history.query(limit || 100, frameStartsAt || 0, frameEndsAt || 0, domain || null);
  }

  static fillFromVisit(url, triggeringUrl) {
    return history.fillFromVisit(url, triggeringUrl);
  }

  static async stats() {
    return {
      size: -1,
      days: -1
    };
  }
}
