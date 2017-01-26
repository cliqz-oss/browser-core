import Ember from 'ember';

export default Ember.Service.extend({
  store: Ember.inject.service(),
  cliqz: Ember.inject.service(),

  start() {
    Ember.run.later(this, 'getNotifications', 0);
  },

  stop() {
    Ember.run.cancel(this.get('nextCheck'));
  },

  getNotifications() {
    // clear next scheduled check
    Ember.run.cancel(this.get('nextCheck'));

    const cliqz = this.get('cliqz');
    const store = this.get('store');
    const speedDials = new Map(
      store.peekAll('speed-dial').map(dial => [dial.get('url'), dial])
    );

    cliqz.getNotifications([...speedDials.keys()]).then(notifications => {
      Object.keys(notifications).forEach(url => {
        const speedDial = speedDials.get(url);
        const speedDialNotification = notifications[url];
        speedDial.setProperties({
          notificationCount: speedDialNotification.count,
          hasNewNotifications: speedDialNotification.unread,
          notificationStatus: speedDialNotification.status,
          notificationError: speedDialNotification.error,
        });
      });

      this.set('nextCheck', Ember.run.later(this, 'getNotifications', 5000));
    });
  },

  enableNotifications(speedDial) {
    const cliqz = this.get('cliqz');
    cliqz.watch(speedDial.get('url')).then(() => {
      this.getNotifications();
    });
  },

  disableNotifications(speedDial) {
    const cliqz = this.get('cliqz');
    cliqz.unwatch(speedDial.get('url'));
    speedDial.setProperties({
      notificationStatus: 'available'
    });
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
});
