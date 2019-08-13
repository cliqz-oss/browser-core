import background from '../core/base/background';
import inject from '../core/kord/inject';
import {
  openLink,
  callNumber,
  openMap,
  hideKeyboard,
  sendUIReadySignal,
  handleAutocompletion,
  queryCliqz,
} from '../platform/browser-actions';


/**
  @namespace <namespace>
  @class Background
 */
export default background({

  requiresServices: ['logos', 'cliqz-config', 'telemetry'],
  search: inject.module('search'),

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
    async openLink(url, selection) {
      if (selection) {
        await this.search.action('reportSelection', selection, { contextId: 'mobile-cards' });
      }
      openLink(url, selection.query);
    },
    callNumber,
    openMap,
    hideKeyboard,
    sendUIReadySignal,
    handleAutocompletion,
    queryCliqz,
  },
});
