/* eslint no-param-reassign: 'off' */

import prefs from '../../core/prefs';
import utils from '../../core/utils';
import { getMessage } from '../../core/i18n';
import { getDetailsFromUrl } from '../../core/url';

const REAL_ESTATE_ID = 'cliqz-tab';

export default class OffersUpdate {
  constructor({ messageCenter, offers }) {
    this.messageCenter = messageCenter;
    this.offersV2 = offers;
  }

  init() {
    this.refresh();
  }

  get showOffers() {
    const offersEnabled = (prefs.get('offers2FeatureEnabled', false) && prefs.get('offers2UserEnabled', true));
    const cliqzTabOfferEnabled = prefs.get('cliqzTabOffersNotification', false);
    return offersEnabled && cliqzTabOfferEnabled;
  }

  refresh() {
    if (!this.showOffers) {
      return undefined;
    }
    const args = {
      filters: {
        by_rs_dest: REAL_ESTATE_ID,
        ensure_has_dest: true
      }
    };
    const offers = this.offersV2.action('getStoredOffers', args);
    return offers.then((results) => {
      results.forEach((offer) => {
        offer.id = offer.offer_id;
        offer.position = 'middle';
        offer.type = 'offer';
        let validity = {};
        const templateData = offer.offer_info.ui_info.template_data;
        // calculate the expiration time if we have the new field #EX-7028
        const expirationTime = offer.offer_info.expirationMs ?
          (offer.created_ts + offer.offer_info.expirationMs) / 1000 :
          templateData.validity;
        if (expirationTime) {
          const timeDiff = Math.abs((expirationTime * 1000) - Date.now());
          let difference = Math.floor(timeDiff / 86400000);
          const isExpiredSoon = difference <= 2;
          let diffUnit = difference === 1 ? 'offers_expires_day' : 'offers_expires_days';

          if (difference < 1) {
            difference = Math.floor((timeDiff % 86400000) / 3600000);
            diffUnit = difference === 1 ? 'offers_expires_hour' : 'offers_expires_hours';

            if (difference < 1) {
              difference = Math.floor(((timeDiff % 86400000) % 3600000) / 60000);
              diffUnit = difference === 1 ? 'offers_expires_minute' : 'offers_expires_minutes';
            }
          }

          validity = {
            text: `${getMessage('offers_expires_in')} ${difference} ${getMessage(diffUnit)}`,
            isExpiredSoon,
          };

          offer.validity = validity;
        }
        let titleColor;
        if (templateData.styles && templateData.styles.headline_color) {
          titleColor = templateData.styles.headline_color;
        } else {
          const url = templateData.call_to_action.url;
          const urlDetails = getDetailsFromUrl(url);
          const logoDetails = utils.getLogoDetails(urlDetails);
          titleColor = `#${logoDetails.brandTxtColor}`;
        }
        templateData.titleColor = titleColor;

        this.messageCenter.action(
          'showMessage',
          'MESSAGE_HANDLER_FRESHTAB_OFFERS',
          offer
        );
      });
      return results;
    });
  }

  unload() {
  }
}
