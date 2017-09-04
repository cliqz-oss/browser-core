import utils from '../../core/utils';
import inject from '../../core/kord/inject';
import prefs from '../../core/prefs';

const DISMISSED_ALERTS = 'dismissedAlerts';
const MESSAGES = {
  'new-cliqz-tab': {
    id: 'new-cliqz-tab',
    active: false,
    type: 'notification',
    title: utils.getLocalizedString('freshtab.app.middle-box.new-cliqz-tab-hdr'),
    description: utils.getLocalizedString('freshtab.app.middle-box.new-cliqz-tab-desc'),
    icon: 'settings-icon_blue.svg',
    cta_text: utils.getLocalizedString('freshtab.app.middle-box.new-cliqz-tab-cta'),
    cta_url: 'home-action:settings',
    handler: 'MESSAGE_HANDLER_FRESHTAB_MIDDLE',
    position: 'middle'
  }
};

export default class {
  constructor() {
    this.messageCenter = inject.module('message-center');
  }

  get messages() {
    return MESSAGES;
  }

  get handlers() {
    return this.messageCenter.action('getHandlers');
  }

  init() {
    const dismissedAlerts = JSON.parse(prefs.get(DISMISSED_ALERTS, '{}'));
    this.handlers.then((handlers) => {
      const activeMessages = Object.keys(this.messages).filter(messageId =>
        this.messages[messageId].active
      );
      activeMessages.forEach((messageId) => {
        const isDismissed = dismissedAlerts[messageId] && dismissedAlerts[messageId].count >= 1;
        if (!isDismissed) {
          const message = this.messages[messageId];
          const handler = message.handler;
          if (handlers.indexOf(handler) !== -1) {
            this.messageCenter.action(
              'showMessage',
              handler,
              message
            );
          }
        }
      });
    });
  }
}
