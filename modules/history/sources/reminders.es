// TODO: Remove AsyncStorage import - this should be in platform
// import { AsyncStorage } from 'react-native';
/* global AsyncStorage */
import events from '../core/events';
import { URLInfo } from '../core/url-info';

export default class Reminders {
  constructor(store, updateState) {
    this.store = store;
    this.updateState = updateState;
    this.cache = {};
  }

  start() {
    this.listener = events.subscribe('browser:read-later', this.addReminder.bind(this));
    return AsyncStorage.getItem('reminders').then((cache) => {
      this.cache = JSON.parse(cache || '{}');
    }).then(() => this.updateReminders());
  }

  stop() {
    this.listener.unsubscribe();
  }

  updateReminders() {
    this.updateState((_s) => {
      const state = _s;
      const domains = Object.keys(state.store.history.domains);
      domains.forEach((domain) => {
        state.store.history.domains[domain].notifications = this.cache[domain] || [];
      });

      state.store.notifications = Object.keys(this.cache).reduce((list, domain) => {
        this.cache[domain].forEach(r => list.push(r));
        return list;
      }, []);
      state.store.notifications.sort(this.reminderComparator);
      return state;
    });
  }

  addReminder(data) {
    const { title, url, timestamp } = data;
    const urlParts = URLInfo.get(url);
    const domain = urlParts.hostname;
    if (!this.cache[domain]) {
      this.cache[domain] = [];
    }
    const domainReminders = this.cache[domain];

    const reminder = {
      title,
      url,
      at: timestamp,
    };
    domainReminders.push(reminder);
    domainReminders.sort(this.reminderComparator);

    AsyncStorage.setItem('reminders', JSON.stringify(this.cache));
    this.updateState((state) => {
      const domainDetails = state.store.history.domains[domain];
      if (domainDetails) {
        domainDetails.notifications = domainReminders;
      }
      state.store.notifications.push(reminder);
      state.store.notifications.sort(this.reminderComparator);
      return state;
    });
  }

  reminderComparator(a, b) {
    return a.at - b.at;
  }
}
