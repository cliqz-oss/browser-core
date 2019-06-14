/* eslint no-param-reassign: off */

import moment from '../../platform/lib/moment';
import prefs from '../../core/prefs';
import inject from '../../core/kord/inject';
import ActionID from '../offers/actions-defs';
import OffersConfigs from '../offers_configs';
import logger from '../common/offers_v2_logger';
import { isDeveloper } from '../utils';

const addOrCreate = (d, field, value = 1) => {
  const newValue = d[field] ? d[field] + value : value;
  d[field] = newValue;
};

// (EX-4191) Fix hpn-ts format to "yyyyMMdd"
const getHpnTimeStamp = () => prefs.get('config_ts', '19700101');

const getMinuteTimestamp = () => {
  const today = +moment(getHpnTimeStamp(), 'YYYYMMDD');
  const todayInMinutes = Math.floor(today / 1000 / 60);
  const now = new Date();
  const result = todayInMinutes + now.getHours() * 60 + now.getMinutes();
  return result;
};

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

const constructSignal = (signalID, signalType, signalData, gid) => {
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
      sent_ts: getMinuteTimestamp(),
      abtest_popups_tmpl: prefs.get('offers-popup.type', 'card'),
      data: tmp,
    },
  };
};

export {
  addOrCreate,
  constructSignal,
  getHpnTimeStamp,
  getMinuteTimestamp
};
