import utils from '../core/utils';
import events from '../core/events';
import background from '../core/base/background';
import NotificationCenter from './notification-center';

export default background({

  init() {
    this.notificationCenter = new NotificationCenter();

    this.onNewNotification = events.proxyEvent(
      'notifications:new-notification',
      this.notificationCenter,
      'new-notification'
    );

    this.onNotificationsCleared = events.proxyEvent(
      'notifications:notifications-cleared',
      this.notificationCenter,
      'notifications-cleared'
    );

    this.notificationCenter.start();
  },

  unload() {
    this.onNewNotification.unsubscribe();
    this.onNotificationsCleared.unsubscribe();

    this.notificationCenter.stop();
    delete this.notificationCenter;
  },

  beforeBrowserShutdown() {

  },

  actions: {
    /**
    * get configuration with notification sources
    **/
    getConfig() {
      return {
        sources: this.notificationCenter.domainList(),
      };
    },

    /**
    * query store for notifications for specified sources
    */
    getNotifications(urls = []) {
      const domainsForUrls = urls.reduce((hash, url) => {
        const domainDetails = utils.getDetailsFromUrl(url);
        hash[url] = domainDetails.host;
        return hash;
      }, Object.create(null));
      // Set guarantees uniquenes
      const domains = new Set(urls.map(url => domainsForUrls[url]));
      const notifications = this.notificationCenter.notifications([...domains]);

      return urls.reduce((hash, url) => {
        const domain = domainsForUrls[url];
        hash[url] = notifications[domain];
        return hash;
      }, Object.create(null));
    },

    /**
    * Add a new source to configuration
    **/
    watch(url) {
      const domainDetails = utils.getDetailsFromUrl(url);
      return this.notificationCenter.addDomain(domainDetails.host);
    },

    /**
    * Remove a url from notification sources
    **/
    unwatch(url) {
      const domainDetails = utils.getDetailsFromUrl(url);
      return this.notificationCenter.removeDomain(domainDetails.host);
    },

    activate(url) {
      const domainDetails = utils.getDetailsFromUrl(url);
      return this.notificationCenter.activateDomain(domainDetails.host);
    }
  },

  events: {
    /*
     * Clears unread status for domain at currently open tab
     */
    'core.location_change': function onLocationChange(url) {
      const domainDetails = utils.getDetailsFromUrl(url);
      this.notificationCenter.clearDomainUnread(domainDetails.host);
    },
  },
});
