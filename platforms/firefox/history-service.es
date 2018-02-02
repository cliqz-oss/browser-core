import { Components, XPCOMUtils } from './globals';

const history = Components.classes['@mozilla.org/browser/nav-history-service;1']
  .getService(Components.interfaces.nsINavHistoryService);

export const legacy = history;

class FirefoxLegacyHistory {
  constructor() {
    this.HISTORY_EVENTS = [
      'onBeginUpdateBatch',
      'onEndUpdateBatch',
      'onVisit',
      'onTitleChanged',
      'onBeforeDeleteURI',
      'onDeleteURI',
      'onClearHistory',
      'onPageChanged',
      'onDeleteVisits',
    ];
    this._historyObserver = null;
  }

  addListener(eventName, callback) {
    if (!this.HISTORY_EVENTS.includes(eventName)) {
      throw new Error(`Unrecognized history event "${eventName}"`);
    }
    if (this._historyObserver &&
        this._historyObserver.hasHandler(eventName, callback)) {
      throw new Error('Callback already registered');
    }

    // create observer on demand
    if (!this._historyObserver) {
      this._historyObserver = this._createHistoryObserver();
      history.addObserver(this._historyObserver, false);
    }

    this._historyObserver.addHandler(eventName, callback);
  }

  removeListener(eventName, callback) {
    if (!this._historyObserver) {
      throw new Error('Callback not registered');
    }

    this._historyObserver.removeHandler(eventName, callback);
    if (!this._historyObserver.hasHanders) {
      history.removeObserver(this._historyObserver);
      this._historyObserver = null;
    }
  }

  _createHistoryObserver() {
    const historyObserver = this.HISTORY_EVENTS.reduce((obs, eventName) => {
      /* eslint-disable no-param-reassign */
      obs[eventName] = (...args) => {
        obs._handlers[eventName].forEach(handler => handler(...args));
      };

      obs._handlers[eventName] = new Set();
      /* eslint-enable no-param-reassign */
      return obs;
    }, {
      _handlers: {},
      addHandler(eventName, callback) {
        this._handlers[eventName].add(callback);
      },
      removeHandler(eventName, callback) {
        if (!this.hasHandler(eventName, callback)) {
          throw new Error('Callback not registered');
        }
        this._handlers[eventName].delete(callback);
      },
      hasHandler(eventName, callback) {
        return this._handlers[eventName].has(callback);
      },
      get hasHanders() {
        return Object.entries(this._handlers)
          .reduce((total, [, handlersList]) => total + handlersList.size, 0);
      },
      QueryInterface: XPCOMUtils.generateQI([Components.interfaces.nsINavHistoryObserver]),
    });

    return historyObserver;
  }
}

const legacyHistory = new FirefoxLegacyHistory();

function eventWrapper({ add, remove }) {
  return {
    _callbacks: new Map(),

    addListener(callback) {
      if (this.hasListener(callback)) {
        throw new Error('Callback already registered');
      }
      const e = add(callback);
      this._callbacks.set(callback, e);
    },

    removeListener(callback) {
      if (!this.hasListener(callback)) {
        throw new Error('Callback not registered');
      }
      const e = this._callbacks.get(callback);
      this._callbacks.delete(callback);
      remove(e);
    },

    hasListener(callback) {
      return this._callbacks.has(callback);
    }
  };
}

export default {
  onVisited: eventWrapper({
    add(callback) {
      function c(aURI, id, aTime) {
        return callback({
          id,
          url: aURI.spec,
          lastVisitTime: aTime / 1000,
          // Avoid using next fields as they are
          // not supported in nsINavHistoryService:
          title: aURI.spec,
          visitCount: 1,
          typedCount: 0
        });
      }
      legacyHistory.addListener('onVisit', c);
      return c;
    },

    remove(c) {
      legacyHistory.removeListener('onVisit', c);
    }
  }),

  onVisitRemoved: eventWrapper({
    add(callback) {
      const evts = {
        onBeginUpdateBatch() {
          evts.batch = [];
        },
        onEndUpdateBatch() {
          callback({
            urls: evts.batch,
            allHistory: false
          });
          evts.batch = null;
        },
        onDeleteURI(aURI) {
          const url = aURI.spec;
          if (!evts.batch) {
            callback({
              urls: [url],
              allHistory: false
            });
          } else {
            evts.batch.push(url);
          }
        },
        onClearHistory() {
          callback({
            urls: [],
            allHistory: true
          });
        },
      };

      legacyHistory.addListener('onBeginUpdateBatch', evts.onBeginUpdateBatch);
      legacyHistory.addListener('onEndUpdateBatch', evts.onEndUpdateBatch);
      legacyHistory.addListener('onDeleteURI', evts.onDeleteURI);
      legacyHistory.addListener('onClearHistory', evts.onClearHistory);
      return evts;
    },

    remove(evts) {
      legacyHistory.removeListener('onBeginUpdateBatch', evts.onBeginUpdateBatch);
      legacyHistory.removeListener('onEndUpdateBatch', evts.onEndUpdateBatch);
      legacyHistory.removeListener('onDeleteURI', evts.onDeleteURI);
      legacyHistory.removeListener('onClearHistory', evts.onClearHistory);
    }
  }),
};
