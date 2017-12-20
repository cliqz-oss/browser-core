import inject from '../core/kord/inject';

export default class Win {
  constructor() {
    this.notifications = inject.module('notifications');
    this.freshtab = inject.module('freshtab');
  }

  init() {
    return this.freshtab.isReady().then(() =>
      this.notifications.action('hasUnread').then((res) => {
        if (!res) {
          return Promise.resolve();
        }
        return this.notifications.action('updateUnreadStatus');
      })
    );
  }

  unload() {

  }
}
