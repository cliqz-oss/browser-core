import { Components, XPCOMUtils } from './globals';

const history = Components.classes['@mozilla.org/browser/nav-history-service;1']
  .getService(Components.interfaces.nsINavHistoryService);

export const legacy = history;

// observers for callback function
const observers = new WeakMap();

export default {
  onVisitRemoved: {
    addListener(callback) {
      if (observers.has(callback)) {
        throw new Error('callback already registered');
      }

      const observer = {
        onBeginUpdateBatch() {
          this.batch = [];
        },
        onEndUpdateBatch() {
          callback({ removed: this.batch });
          this.batch = null;
        },
        onVisit() {},
        onTitleChanged() {},
        onBeforeDeleteURI() {},
        onDeleteURI(aURI) {
          const url = aURI.spec;
          if (!this.batch) {
            callback({ removed: [url] });
          } else {
            this.batch.push(url);
          }
        },
        onClearHistory() {
          callback({ removed: true });
        },
        onPageChanged() {},
        onDeleteVisits() {},
        QueryInterface: XPCOMUtils.generateQI([Components.interfaces.nsINavHistoryObserver]),
      };

      observers.set(callback, observer);
      history.addObserver(observer, false);
    },
    removedListener(callback) {
      if (observers.has(callback)) {
        const observer = observers.get(callback);
        history.removeObserver(observer);
        observers.delete(callback);
      } else {
        throw new Error('callback not registered');
      }
    }
  }
};
