import console from '../core/console';
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
  // 'mail.google.com': {
  //   providerName: 'gmail',
  //   config: {},
  //   schedule: '*/1 *',
  // },
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
    const allAvailabledDomains = new Set(Object.keys(AVAILABLE_DOMAINS));
    const watchedDomains = domains.filter(
      domain => allWatchedDomains.has(domain)
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
    const { providerName, config } = AVAILABLE_DOMAINS[domain];
    const Provider = AVAILABLE_PROVIDERS[providerName];
    return new Provider(config);
  }

  activateDomain(domain) {
    const provider = this.getProvider(domain);
    provider.activate();
    return this.updateDomain(domain).then(() => {
      return this.updateUnreadStatus();
    });
  }

  updateDomain(domain) {
    const provider = this.getProvider(domain);
    console.log('Notification', `get notifications for ${domain}`);

    return provider.count().then(count => {
      console.log('Notification', `notifications for ${domain} - count ${count}`);
      const isChanged = this.storage.updateDomain(domain, {
        count,
        status: 'enabled',
        error: null,
      });

      if (isChanged) {
        // TODO: remove double update
        this.storage.updateDomain(domain, { unread: true });
        this.updateUnreadStatus();
      }
    }).catch(e => {
      this.storage.updateDomain(domain, {
        unread: false,
        status: 'inaccessible',
        error: e,
      });
      console.error(`notifications for domain "${domain}" fail`, e);
    });
  }

  createSchedule(domain) {
    const { schedule } = AVAILABLE_DOMAINS[domain];
    const task = this.cron.schedule(
      this.updateDomain.bind(this, domain),
      schedule
    );
    this.tasks.set(domain, task);
  }

  updateUnreadStatus() {
    const hasUnread = this.storage.hasUnread();
    const eventName = hasUnread ? 'new-notification' : 'notifications-cleared';
    this.publishEvent(eventName);
  }

  clearDomainUnread(domain) {
    const isWatched = this.domainList().indexOf(domain) !== -1;
    if (!isWatched) {
      return;
    }

    const isChanged = this.storage.updateDomain(domain, { unread: false });
    if (isChanged) {
      this.updateUnreadStatus();
    }
  }

  addDomain(domain) {
    this.storage.addWatchedDomain(domain);
    return this.updateDomain(domain).then(() => {
      this.createSchedule(domain);
    });
  }

  removeDomain(domain) {
    const task = this.tasks.get(domain);
    this.cron.unschedule(task);
    this.tasks.delete(task);
    this.clearDomainUnread(domain);
    this.storage.removeWatchedDomain(domain);
  }
});
