import background from '../core/base/background';
import { forEachWindow } from '../platform/browser';
import utils from '../core/utils';
import inject from '../core/kord/inject';

/**
  @namespace <namespace>
  @class Background
 */
export default background({

  newTabButton: inject.module('new-tab-button'),

  /**
    @method init
    @param settings
  */
  init() {

  },

  unload() {

  },

  beforeBrowserShutdown() {

  },

  events: {
    'notifications:new-notification': function onNewNotification() {
      forEachWindow(window => {
        this.newTabButton.windowAction(window, 'lightUp');
      });

      utils.telemetry({
        type: 'activity',
        action: 'notify',
        target: 'new_tab'
      });
    },
    'notifications:notifications-cleared': function onNotificationsCleared() {
      forEachWindow(window => {
        this.newTabButton.windowAction(window, 'lightDown');
      });
    },
  },

  actions: {
  },
});
