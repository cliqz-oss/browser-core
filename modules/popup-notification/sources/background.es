/* eslint object-curly-spacing: off */

import background from '../core/base/background';
import { getResourceUrl } from '../core/platform';
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
      getActiveTab().then(({ id }) => this.core.action(
        'callContentAction',
        'popup-notification',
        'renderBanner',
        { windowId: id },
        {
          ...data,
          config: {
            ...data.config,
            baseUrl: getResourceUrl('popup-notification/')
          },
          target
        }
      ));
    },
    pop({target, data}) {
      events.pub('popup-notification:pop', {target, data});
      return {target, data};
    },
    log({target, data}) {
      events.pub('popup-notification:log', {target, data});
      return {target, data};
    },
    openAndClosePinnedURL(data) {
      events.pub('popup-notification:open-and-close-pinned-URL', data);
    },
  },
});
