/* eslint no-param-reassign: off */

import prefs from '../../core/prefs';
import inject from '../../core/kord/inject';
import ActionID from '../offers/actions-defs';
import OffersConfigs from '../offers_configs';
import logger from '../common/offers_v2_logger';
import { isDeveloper } from '../utils';
import { updateSignalValue as updateCouponJourneySignalValue } from '../coupon/coupon-signal';

const addOrCreate = (d, field, addValue = 1) => {
  const oldValue = d[field];
  if (!oldValue) {
    d[field] = addValue;
    return;
  }
  d[field] = field === ActionID.AID_COUPON_JOURNEY
    ? updateCouponJourneySignalValue(oldValue, addValue)
    : oldValue + addValue;
};

// (EX-4191) Fix hpn-ts format to "yyyyMMdd"
const getHpnTimeStamp = () => prefs.get('config_ts', '19700101');

const _modifyOriginDataInplace = (originData) => {
  const m = new Set(Object.values(ActionID));
  Object.keys(originData || {}).forEach((k) => {
    if (m.has(k)) { return; }
    if (k.startsWith('filter_exp__') || k.startsWith('filtered_by_')) {
      return;
    }
    const len = ('repeated_').length; // all signals could appear as `repeated_xxx`
    if (k.startsWith('repeated_') && m.has(k.substring(len))) { return; }
    if (k.startsWith('offers_unexpected_signal_')) { return; }
    originData[`offers_unexpected_signal_${k}`] = originData[k];
    logger.warn('constructSignal: unexpected signal', k);
  });
};

const _modifySignalDataInplace = (data) => {
  const offers = data && data.c_data && data.c_data.offers;
  if (!offers) { return; }
  offers.forEach((o) => {
    const offerData = o.offer_data || [];
    offerData.forEach(od => _modifyOriginDataInplace(od.origin_data));
  });
};

const constructSignal = (signalID, signalType, signalData, gid, timestamp) => {
  const tmp = JSON.parse(JSON.stringify(signalData || {})); // deep copy
  _modifySignalDataInplace(tmp);
  return {
    action: OffersConfigs.SIGNALS_HPN_BE_ACTION,
    signal_id: signalID,
    timestamp: getHpnTimeStamp(),
    payload: {
      v: OffersConfigs.SIGNALS_VERSION,
      ex_v: inject.app.version,
      is_developer: isDeveloper(),
      gid,
      type: signalType,
      sent_ts: timestamp,
      data: tmp,
    },
  };
};

const getSignalID = signalPayload => signalPayload?.['signal_id'];

export {
  addOrCreate,
  constructSignal,
  getHpnTimeStamp,
  getSignalID
};
