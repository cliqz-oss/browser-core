import utils from '../core/utils';

export default class {
  constructor(settings) {
  }

  init() {
    utils.callAction('notifications', 'hasNotifications').then( (res) => {
      if (res) {
        utils.callAction('notifications', 'updateUnreadStatus');
      }
    });
  }

  unload() {

  }
}
