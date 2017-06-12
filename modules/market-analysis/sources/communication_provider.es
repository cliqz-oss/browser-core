import { utils } from '../core/cliqz';
import config from '../core/config';
import MAConfigs from './conf/ma_configs';
import { getHpnTimeStamp } from './common/utils';
import logger from './common/logger';

/**
 * Class communicating with backend server
 */
class CommunicationProvider {
  constructor(endPointAddress) {
    this.endPointAddress = endPointAddress;
    this.channel = config.settings.HW_CHANNEL;
  }

  /**
   * send a signal to backend
   * @param  {Object} signalObject      signal object to be sent
   * @param  {Function} successCallback
   * @param  {Function} errCallback
   */
  sendSignalToBE(signalObject, successCallback, errCallback) {
    const hpnSignal = {
      action: MAConfigs.SIGNALS_HPN_BE_ACTION,
      signal_id: 'ma', // TODO: not very useful at the moment
      timestamp: getHpnTimeStamp(),
      payload: {
        v: MAConfigs.SIGNALS_VERSION,
        channel: this.channel,
        type: MAConfigs.SIGNALS_MA_TYPE,
        data: signalObject
      }
    };

    const hpnStrSignal = JSON.stringify(hpnSignal);
    utils.httpPost(this.endPointAddress,
                  (succ) => { successCallback(signalObject, succ); },
                   hpnStrSignal,
                   (err) => { errCallback(signalObject, err); });
    logger.log(`Sending signal to BE: ${hpnStrSignal}`);
  }
}

export default CommunicationProvider;
