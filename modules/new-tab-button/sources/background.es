import background from '../core/base/background';
import { forEachWindow } from '../platform/browser';
import utils from '../core/utils';

/**
  @namespace <namespace>
  @class Background
 */
export default background({

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
        utils.callWindowAction(window, 'new-tab-button', 'lightUp');
      });

      utils.telemetry({
        type: 'activity',
        action: 'notify',
        target: 'new_tab'
      });
    },
    'notifications:notifications-cleared': function onNotificationsCleared() {
      forEachWindow(window => {
        utils.callWindowAction(window, 'new-tab-button', 'lightDown');
      });
    },
  },

  actions: {
  },
});
