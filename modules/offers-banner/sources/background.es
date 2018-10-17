import background from '../core/base/background';
import prefs from '../core/prefs';
import inject from '../core/kord/inject';
import { getActiveTab } from '../core/browser';
import { getResourceUrl } from '../core/platform';
import getTitleColor from './utils';
import dispatcher from './transport';

const REAL_ESTATE_ID = 'browser-panel';

export default background({
  core: inject.module('core'),
  offersV2: inject.module('offers-v2'),

  init() {
    this.offersV2
      .action('registerRealEstate', { realEstateID: 'browser-panel' })
      .catch(() => {});
  },
  unload() {
    this.offersV2
      .action('unregisterRealEstate', { realEstateID: 'browser-panel' })
      .catch(() => {});
  },
  beforeBrowserShutdown() { },
  actions: {
    send(offerId, msg) { dispatcher(offerId, msg); },
  },

  events: {
    'offers-send-ch': function onMessage(msg) {
      if (!msg) { return; }
      const { dest = [], type = '', data } = msg;
      if (type !== 'push-offer' || !data) { return; }
      if (!dest.includes(REAL_ESTATE_ID)) { return; }
      const { offer_data: { ui_info: uiInfo } = {}, offer_id: offerId } = data;
      const { template_name: templateName, template_data: templateData } = uiInfo || {};
      if (!templateData || !templateName) { return; }

      const payload = {
        template_data: { ...templateData, titleColor: getTitleColor(templateData) },
        template_name: templateName,
        offerId,
        config: {
          url: getResourceUrl('browser-panel/index.html?cross-origin'),
          blueTheme: prefs.get('freshtab.blueTheme.enabled', false)
        },
      };

      /*
        Between event `content:change` in offers-v2 and event `offers-send-ch`
        in this module exist complex business-logic, so it's not very easy
        to send data about tab. Also exists other module which can trigger offer
        without passing info about tab.id
      */
      getActiveTab()
        .then(tab => this.core.action(
          'broadcastActionToWindow',
          tab.id,
          'offers-banner',
          'renderBanner',
          payload));
    },
  },
});
