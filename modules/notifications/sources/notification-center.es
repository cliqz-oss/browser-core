import console from '../core/console';
import utils from '../core/utils';
import { Cron } from '../core/anacron';
import GmailProvider from './providers/gmail';
import PinTabProvider from './providers/pin-tab';
import Storage from './storage';
import Evented from '../core/mixins/evented';

// TODO: find a way to handle aliases, example: gmail.com === mail.google.com


const AVAILABLE_DOMAINS = {
  //'gmail.com': {
    //providerName: 'gmail',
    //config: {},
    //schedule: '*/1 *',
  //},
  'mail.google.com': {
    providerName: 'gmail',
    config: {},
    schedule: utils.getPref('gmailNotificationsInterval', '*/30 *'),
  },
  //'twitter.com': {
    //providerName: 'pin-tab',
    //config: {
      //domain: 'twitter.com',
      //selector: '.with-count .count-inner',
      //attribute: 'innerText',
    //},
    //schedule: '*/1 *',
  //},
  //'www.facebook.com': {
    //providerName: 'pin-tab',
    //config: {
      //domain: 'www.facebook.com',
      //selector: '[data-tooltip-content="Messages"] span span',
      //attribute: 'innerText',
    //},
    //schedule: '*/1 *',
  //},
};

const AVAILABLE_PROVIDERS = {
  'gmail': GmailProvider,
  'pin-tab': PinTabProvider,
};

export default Evented(class {

  constructor() {
    this.storage = new Storage();
    this.cron = new Cron();
    this.tasks = new Map();
    this.domainList()
      .filter(domain => domain in AVAILABLE_DOMAINS)
      .forEach(this.createSchedule.bind(this));
  }

  availableProviders() {
    return AVAILABLE_PROVIDERS;
  }

  availableDomains() {
    return AVAILABLE_DOMAINS;
  }

  availableDomain(domain) {
    return AVAILABLE_DOMAINS[domain];
  }

  availableProvider(name) {
    return AVAILABLE_PROVIDERS[name];
  }

  start() {
    this.cron.run(new Date(), { force: true });
    this.cron.start();
  }

  stop() {
    this.cron.stop();
    this.tasks.clear();
  }

  domainList() {
    return this.storage.watchedDomainNames();
  }

  notifications(domains = []) {
    const allWatchedDomains = new Set(this.domainList());
    const allAvailabledDomains = new Set(Object.keys(this.availableDomains()));
    var self = this;
    const watchedDomains = domains.filter(
      domain => allWatchedDomains.has(domain) && (domain in self.availableDomains())
    );

    const availableDomains = domains.filter(
      domain => allAvailabledDomains.has(domain) &&
        !allWatchedDomains.has(domain)
    );

    const notifications = this.storage.notifications(watchedDomains);
    const availableNotifications = availableDomains.reduce((hash, domain) => {
      return Object.assign({}, hash, {
        [domain]: {
          status: 'available',
        },
      });
    }, Object.create(null));
    return Object.assign({}, notifications, availableNotifications);
  }

  getProvider(domain) {
    const { providerName, config } = this.availableDomain(domain);
    const Provider = this.availableProvider(providerName);
    return new Provider(config);
  }

  activateDomain(domain) {
    const provider = this.getProvider(domain);
    provider.activate();
    return this.updateDomain(domain).then(() => {
      return this.updateUnreadStatus();
    });
  }

  getProviderCount(domain) {
    const provider = this.getProvider(domain);
    console.log('Notification', `get notifications for ${domain}`);

    return new Promise((resolve, reject) => {
      provider.count().then((count) => {
        console.log('Notification', `get notifications for ${domain}`);
        return resolve(count)
      }).catch(e => {
        this.storage.updateDomain(domain, {
          unread: false,
          status: 'inaccessible',
          error: e
        });
        console.error(`!!notifications for domain "${domain}" fail`, e);
        return reject(e)
      });
    });
  }

  updateDomain(domain, newCount, oldData) {
    const oldCount = (oldData && oldData.count) ? oldData.count : 0;
    if(!oldData) {
      this.storage.saveDomain(domain, {
        count: oldCount,
        status: 'enabled',
        error: null,
      });
    }
    if (newCount !== oldCount || oldData && oldData.status !== 'enabled') {
      this.storage.updateDomain(domain, {
         count: newCount,
         status: 'enabled',
         error: null,
         unread: newCount > oldCount
       });
      this.updateUnreadStatus(domain, newCount);
    }

    if(oldData && oldData.status === 'inaccessible') {
      //broadcast user has logged in again
      this.publishEvent('notifications-accessible', domain, newCount, newCount > oldCount);
    }
  }

  createSchedule(domain) {
    const { schedule } = AVAILABLE_DOMAINS[domain];
    const task = this.cron.schedule(
      () => {
        const oldCount = this.storage.getDomainData(domain);
        return this.getProviderCount(domain).then( newCount => {
          this.updateDomain(domain, newCount, oldCount);
        }).catch( e => {
          //broadcast user is loggeout out
          this.publishEvent('notifications-inaccessible', domain);
        });
      },
      schedule
    );
    this.tasks.set(domain, task);
  }

  refresh(domain) {
    const oldCount = this.storage.getDomainData(domain);
    return this.getProviderCount(domain).then( newCount => {
      this.updateDomain(domain, newCount, oldCount);
    }).catch( e => {
      //broadcast user is loggeout out
      this.publishEvent('notifications-inaccessible', domain);
    });
  }

  updateUnreadStatus(domain, count) {
    const hasUnread = this.storage.hasUnread();
    const eventName = hasUnread ? 'new-notification' : 'notifications-cleared';
    this.publishEvent(eventName, domain, count);
  }

  updateUnreadCount(domain, count) {
    this.publishEvent('update-mail-count', domain, count);
  }

  clearDomainUnread(domain) {
    const isWatched = this.domainList().indexOf(domain) !== -1;
    if (!isWatched) {
      return;
    }

    const isChanged = this.storage.updateDomain(domain, { unread: false });
    if (isChanged) {
      this.updateUnreadStatus(domain);
    }
  }

  addDomain(domain) {
    this.storage.addWatchedDomain(domain);
    return new Promise((resolve, reject) => {
      this.getProviderCount(domain).then((count) => {
        this.updateDomain(domain, count);
        this.createSchedule(domain);
        return resolve();
      }).catch(e => {
        console.log("promt user to login", e)
        return resolve(e);
      });
    });
  }

  removeDomain(domain) {
    const task = this.tasks.get(domain);
    this.cron.unschedule(task);
    this.tasks.delete(domain);
    this.clearDomainUnread(domain);
    this.storage.removeWatchedDomain(domain);
    this.storage.deleteDomain(domain);
  }
});
