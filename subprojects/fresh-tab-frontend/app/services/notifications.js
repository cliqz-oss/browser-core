import Ember from 'ember';

export default Ember.Service.extend({
  store: Ember.inject.service(),
  cliqz: Ember.inject.service(),

  start() {
    let resolver;
    const loadingPromise = new Ember.RSVP.Promise(resolve => resolver = resolve);
    this.set("loadingPromiseResolver", resolver)
    this.set("loadingPromise", loadingPromise);
    this.getNotifications();
  },

  stop() {
  },

  waitForFirstFetch() {
    return this.get("loadingPromise");
  },

  getNotifications() {
    const cliqz = this.get('cliqz');
    const store = this.get('store');
    const speedDials = new Map(
      store.peekAll('speed-dial').map(dial => {
        return [dial.get('id'), dial]
      })
    );

    return cliqz.getNotifications([...speedDials.keys()]).then(notifications => {
      Object.keys(notifications).forEach(url => {
        const speedDial = speedDials.get(url);
        const speedDialNotification = notifications[url];
        const hadNotifications = speedDial.get('hasNewNotifications');
        const hasNotifications = Boolean(speedDialNotification.unread);
        speedDial.setProperties({
          notificationCount: speedDialNotification.count,
          hasNewNotifications: speedDialNotification.unread,
          notificationStatus: speedDialNotification.status,
          notificationError: speedDialNotification.error,
        });

        if(!hadNotifications && hasNotifications) {
          this.get('cliqz').sendTelemetry({
            type: 'home',
            action: 'notify',
            target_type: speedDial.get('type')
          });
        }
      });

    }).then(() => {
      this.get("loadingPromiseResolver")();
    });
  },

  enableNotifications(speedDial) {
    const cliqz = this.get('cliqz');
    speedDial.setProperties({
      notificationStatus: 'enabled',
      notificationError: null,
    });

    cliqz.watch(speedDial.get('url')).then(() => {
      this.getNotifications();
    });
  },

  disableNotifications(speedDial) {

    const cliqz = this.get('cliqz');
    cliqz.unwatch(speedDial.get('url'));
    speedDial.setProperties({
      notificationStatus: 'available',
      notificationError: null
    });
  },

  refreshNotifications(speedDial) {
    const cliqz = this.get('cliqz');
    cliqz.refreshNotifications(speedDial.get('url'));
  },

  activateNotification(speedDial) {
    const cliqz = this.get('cliqz');
    speedDial.setProperties({
      notificationStatus: 'available',
      notificationError: null,
    });
    cliqz.activateNotification(speedDial.get('url')).then(() => {
      return this.getNotifications();
    });
   },
   newNotification(domain, count) {
    const store = this.get('store');
    let dial = store.peekRecord('speed-dial', domain);
    dial.setProperties({
       notificationStatus: 'enabled',
       notificationCount: count,
       hasNewNotifications: true,
       notificationError: null,
    });
   },
   clearNotification(domain) {
    const store = this.get('store');
    let dial = store.peekRecord('speed-dial', domain);
    if (dial !== null) {
      dial.setProperties({
        hasNewNotifications: false
      });
    }
   },
   inaccessibleNotification(domain) {
    const store = this.get('store');
    let dial = store.peekRecord('speed-dial', domain);
    dial.setProperties({
      notificationStatus: 'inaccessible',
      notificationError: 'cannot-fetch-count'
    });
   },
   accessibleNotification(domain, count, hasUnread) {
    const store = this.get('store');
    let dial = store.peekRecord('speed-dial', domain);
    dial.setProperties({
      notificationStatus: 'enabled',
      notificationCount: count,
      hasNewNotifications: hasUnread,
      notificationError: 'null'
    });
   }
});
