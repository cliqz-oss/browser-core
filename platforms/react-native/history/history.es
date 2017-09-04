import { NativeModules } from 'react-native';
import prefs from '../../core/prefs';
import events from '../../core/events';
import Database from '../../core/database';
import PouchHistory from './pouch-history';
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

};
