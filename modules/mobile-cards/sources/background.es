import background from '../core/base/background';
import domainInfo from '../core/services/domain-info';
import {
  openLink,
  callNumber,
  openMap,
  hideKeyboard,
  sendUIReadySignal,
} from '../platform/browser-actions';


/**
  @namespace <namespace>
  @class Background
 */
export default background({

  requiresServices: ['logos', 'cliqz-config', 'utils', 'telemetry', 'domainInfo'],

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
    getTrackerDetails: domainInfo.getTrackerDetails,
    openLink,
    callNumber,
    openMap,
    hideKeyboard,
    sendUIReadySignal,
  },
});
