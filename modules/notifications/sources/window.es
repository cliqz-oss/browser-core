import utils from '../core/utils';
import FreshTab from 'freshtab/main';

export default class {
  constructor(settings) {
  }

  init() {
    if (!FreshTab.isActive()) {
      return;
    }

    utils.callAction('notifications', 'hasUnread').then((res) => {
      if (res) {
        utils.callAction('notifications', 'updateUnreadStatus');
      }
    });
  }

  unload() {

  }
}
