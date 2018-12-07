import background from '../core/base/background';
import inject from '../core/kord/inject';
import extChannel from '../platform/ext-messaging';

const allowedExtensions = [
  'firefox@ghostery.com',
  'gdprtool@cliqz.com'
];

function onMessage(message, sender) {
  if (allowedExtensions.indexOf(sender.id) > -1) {
    const { uuid, moduleName, action, args } = message;
    const moduleWrapper = inject.module(moduleName);
    moduleWrapper.action(action, ...args).then((response) => {
      extChannel.sendMessage(sender.id, {
        uuid,
        moduleName,
        response,
      });
    }, (error) => {
      extChannel.sendMessage(sender.id, {
        uuid,
        moduleName,
        response: 'error',
        error,
      });
    });
  }
}

export default background({
  init() {
    extChannel.onMessage.addListener(onMessage);
  },

  unload() {
    extChannel.onMessage.removeListener(onMessage);
  },

  events: {},

  actions: {
    ping() {
      return 'pong';
    }
  },
});
