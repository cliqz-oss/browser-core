/* eslint no-param-reassign: off */

import prefs from '../../core/prefs';
import ActionID from '../offers/actions-defs';
import OffersConfigs from '../offers_configs';
import config from '../../core/config';
import logger from '../common/offers_v2_logger';

const addOrCreate = (d, field, value = 1) => {
  const newValue = d[field] ? d[field] + value : value;
  d[field] = newValue;
};

const isDeveloper = () =>
  prefs.get('developer', false) || prefs.get('offersDevFlag', false);

const getGID = () => prefs.getObject('anolysisGID');

// (EX-4191) Fix hpn-ts format to "yyyyMMdd"
const getHpnTimeStamp = () => prefs.get('config_ts', '19700101');

const getMinuteTimestamp = () => Math.floor((Date.now() / 1000) / 60);

const _modifyOriginDataInplace = (originData) => {
  const m = new Set(Object.values(ActionID));
  Object.keys(originData || {}).forEach((k) => {
    if (m.has(k)) { return; }
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

const constructSignal = (signalID, signalType, signalData) => {
  const tmp = JSON.parse(JSON.stringify(signalData || {})); // deep copy
  _modifySignalDataInplace(tmp);
  return {
    action: OffersConfigs.SIGNALS_HPN_BE_ACTION,
    signal_id: signalID,
    timestamp: getHpnTimeStamp(),
    payload: {
      v: OffersConfigs.SIGNALS_VERSION,
      ex_v: config.EXTENSION_VERSION,
      is_developer: isDeveloper(),
      gid: getGID(),
      type: signalType,
      sent_ts: getMinuteTimestamp(),
      data: tmp,
    },
  };
};

export {
  addOrCreate,
  constructSignal,
  getGID,
  getHpnTimeStamp,
  getMinuteTimestamp,
  isDeveloper
};
