import events from '../../../core/events';
import OffersConfigs from '../../offers_configs';
import OfferJob from './job';
import { isDeveloper } from '../../utils';

const SILENT_OFFER_NOTIF_TYPE = 'silent';
const TOOLTIP_OFFER_NOTIF_TYPE = 'tooltip';

function containsPopupRealEstate(estates) {
  return estates.includes('offers-cc') || estates.includes('ghostery');
}

export default class Throttle extends OfferJob {
  constructor() {
    super('Throttle');
    this.onOffersSendCh = this.onOffersSendCh.bind(this);
    this.lastRewardBoxTsMs = 0;
  }

  init() {
    events.sub('offers-send-ch', this.onOffersSendCh);
  }

  unload() {
    events.un_sub('offers-send-ch', this.onOffersSendCh);
  }

  onOffersSendCh(msg) {
    const { dest = [], type = '', data } = msg;
    if (type !== 'push-offer' || !data) { return; }
    if (!containsPopupRealEstate(dest)) { return; }
    const { offer_data: { ui_info: uiInfo = {} } = {} } = data;
    const { notif_type: notifType = 'pop-up' } = uiInfo;
    if (![SILENT_OFFER_NOTIF_TYPE, TOOLTIP_OFFER_NOTIF_TYPE].includes(notifType)) {
      this.lastRewardBoxTsMs = Date.now();
    }
  }

  process(offerList) {
    if (isDeveloper()) {
      return offerList;
    }
    const throttleMs = OffersConfigs.THROTTLE_PUSH_TO_REWARD_BOX_SECS * 1000;
    if (Date.now() - this.lastRewardBoxTsMs >= throttleMs) {
      return offerList;
    }
    return offerList.filter(o => !containsPopupRealEstate(o.destinationRealEstates));
  }
}
