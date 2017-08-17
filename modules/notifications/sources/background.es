import inject from '../core/kord/inject';
import utils from '../core/utils';
import events from '../core/events';
import background from '../core/base/background';
import NotificationCenter from './notification-center';

export default background({
  core: inject.module('core'),

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

    this.onNotificationsInaccessible = events.proxyEvent(
      'notifications:notifications-inaccessible',
      this.notificationCenter,
      'notifications-inaccessible'
    );

    this.onNotificationsAccessible = events.proxyEvent(
      'notifications:notifications-accessible',
      this.notificationCenter,
      'notifications-accessible'
    );

    this.notificationCenter.start();
  },

  unload() {
    this.onNewNotification.unsubscribe();
    this.onNotificationsCleared.unsubscribe();
    this.onNotificationsInaccessible.unsubscribe();
    this.onNotificationsAccessible.unsubscribe();

    this.notificationCenter.stop();
    delete this.notificationCenter;
  },

  beforeBrowserShutdown() {

  },

  broadcastMessage(action, message) {
    this.core.action(
      'broadcastMessage',
      utils.CLIQZ_NEW_TAB_RESOURCE_URL,
      {
        action: action,
        message
      }
    );
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

    hasUnread() {
      return this.notificationCenter.storage.hasUnread();
    },

    updateUnreadStatus() {
      return this.notificationCenter.updateUnreadStatus();
    },

    hasActiveNotifications() {
      let gmailNotifications = this.actions.getNotifications(['mail.google.com']);
      return (gmailNotifications['mail.google.com'].status === 'enabled') || (gmailNotifications['mail.google.com'].status === 'inaccessible');
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
    },

    clearUnread(url) {
      const domainDetails = utils.getDetailsFromUrl(url);
      this.notificationCenter.clearDomainUnread(domainDetails.host);
    },

    refresh(url) {
      const domainDetails = utils.getDetailsFromUrl(url);
      this.notificationCenter.refresh(domainDetails.host);
    }
  },

  events: {
    /*
     * Clears unread status for domain at currently open tab
     */
    'core.location_change': function onLocationChange(url, isPrivate) {
      if (!isPrivate) {
        this.actions.clearUnread(url);
      }
    },
    'notifications:new-notification': function onNewNotification(domain, count) {
      this.broadcastMessage('newNotification', {
        domain,
        count
      });
    },
    'notifications:notifications-cleared': function onNotificationsCleared(domain, count) {
      this.broadcastMessage('clearNotification', {
        domain,
        count
      });
    },
    'notifications:notifications-inaccessible': function onNotificationsInaccessible(domain) {
      this.broadcastMessage('inaccessibleNotification', {
        domain
      });
    },
    'notifications:notifications-accessible': function onNotificationsAccessible(domain, count, hasUnread) {
      this.broadcastMessage('accessibleNotification', {
        domain,
        count,
        hasUnread
      });
    }
  },
});
