import Storage from '../core/storage';
import equal from './lib/deep-equal';

export default class {
  constructor() {
    this.storage = new Storage('chrome://cliqz-notifications/content/');
  }

  addWatchedDomain(domain) {
    const watchedDomainsList = this.watchedDomainNames();
    const watchedDomains = new Set(watchedDomainsList);
    const isChanged = watchedDomains.has(domain);
    if (!isChanged) {
      watchedDomains.add(domain);
      this.storage.setObject('watchedDomains', [...watchedDomains]);
    }
    return isChanged;
  }

  removeWatchedDomain(domain) {
    const watchedDomainsList = this.watchedDomainNames();
    const watchedDomains = new Set(watchedDomainsList);
    const isChanged = watchedDomains.delete(domain);
    if (isChanged) {
      this.storage.setObject('watchedDomains', [...watchedDomains]);
    }
    return isChanged;
  }

  watchedDomainNames() {
    return this.storage.getObject('watchedDomains', []);
  }

  /*
   * returns true if storage was changed
   * returns false if object in storage is the same as "data"
   */
  updateDomain(domain, data) {
    const key = `watchedDomains.${domain}`;
    const domainData = this.storage.getObject(key, {});
    const update = Object.assign(
      {},
      domainData,
      data
    );
    const isChanged = !equal(domainData, update);

    if (isChanged) {
      this.storage.setObject(key, update);
    }

    return isChanged;
  }

  getDomainData(domain) {
    const key = `watchedDomains.${domain}`;
    const data = this.storage.getObject(key, {});
    if(Object.keys(data).length === 0 && data.constructor === Object) {
      return false
    } else {
      return data;
    }
  }

  saveDomain(domain, data) {
    const key = `watchedDomains.${domain}`;
    this.storage.setObject(key, data);
  }

  deleteDomain(domain) {
    const key = `watchedDomains.${domain}`;
    this.storage.removeItem(key);
  }

  notifications(domains) {
    return domains.reduce((counts, domain) => {
      const key = `watchedDomains.${domain}`;
      const domainData = this.storage.getObject(key, {
        count: 0,
        unread: false
      });
      return Object.assign({}, counts, {
        [domain]: domainData,
      });
    }, Object.create(null));
  }

  hasUnread() {
    return this.watchedDomainNames().some(domain => {
      const key = `watchedDomains.${domain}`;
      const { unread } = this.storage.getObject(key, { unread: false });
      return unread;
    });
  }
}
