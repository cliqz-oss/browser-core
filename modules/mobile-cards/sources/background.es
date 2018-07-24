import background from '../core/base/background';
import {
  openLink,
  callNumber,
  openMap,
  hideKeyboard
} from '../platform/browser-actions';


/**
  @namespace <namespace>
  @class Background
 */
export default background({

  requiresServices: ['logos', 'cliqz-config', 'utils', 'telemetry'],

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

  },

  actions: {
    getConfig(sender) {
      return {
        tabId: sender.tab.id,
      };
    },
    openLink,
    callNumber,
    openMap,
    hideKeyboard,
  },
});
