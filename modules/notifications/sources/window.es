import inject from '../core/kord/inject';
import FreshTab from '../freshtab/main';

export default class {
  constructor() {
    this.notifications = inject.module('notifications');
  }

  init() {
    if (!FreshTab.isActive()) {
      return Promise.resolve();
    }

    return this.notifications.action('hasUnread').then((res) => {
      if (!res) {
        return Promise.resolve();
      }
      return this.notifications.action('updateUnreadStatus');
    });
  }

  unload() {

  }
}
