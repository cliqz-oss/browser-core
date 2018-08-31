/* eslint object-curly-spacing: off */

import background from '../core/base/background';
import events from '../core/events';
import inject from '../core/kord/inject';
import { getActiveTab } from '../core/browser';

export default background({
  core: inject.module('core'),

  init() { },
  unload() { },
  beforeBrowserShutdown() { },
  actions: {
    push({target, data}) {
      const module = 'popup-notification';
      const action = 'push';
      const msg = {data, target, module, action};
      getActiveTab()
        .then(tab => this.core.action('broadcastMessage', tab.url, msg));
    },
    pop({target, data}) {
      events.pub('popup-notification:pop', {target, data});
      return {target, data};
    },
    log({target, data}) {
      events.pub('popup-notification:log', {target, data});
      return {target, data};
    },
  },
});
