import { NativeModules } from 'react-native';
import prefs from '../../core/prefs';
import events from '../../core/events';
import Database from '../../core/database';
import PouchHistory from './pouch-history';

let history = NativeModules.HistoryModule;
if (false) {
  history = new PouchHistory();
}

const cliqzVisit = {
  title: 'CLIQZ',
  url: 'https://cliqz.com/',
  visit_date: Date.now(),
};

export default class {

  static query({limit, frameStartsAt, frameEndsAt, domain, query}) {
    return history.query(limit || 100, frameStartsAt || 0, frameEndsAt || 0, domain || null);
  }

  static fillFromVisit(url, triggeringUrl) {
    return history.fillFromVisit(url, triggeringUrl);
  }

};
