import { utils } from '../../core/cliqz';

const MAConfigs = {

  //------------------------------------------------------------
  //  GLOBAL
  //------------------------------------------------------------
  // module version
  CURRENT_VERSION: 0.1,

  // cut-off value for url length
  // any url has length more than MAX_URL_LENGTH will be ignored
  MAX_URL_LENGTH: 1000,

  // is this module enabled?
  IS_ENABLED: utils.getPref('MarketAnalysisEnabled', false),

  IS_LOGGING_ENABELD: utils.getPref('showConsoleLogs', false),

  //------------------------------------------------------------
  //  SIGNALS
  //------------------------------------------------------------

  // backend server address
  SIGNALS_BE_ADDR: utils.getPref('MarketAnalysisBE', 'https://offers-api.cliqz.com/api/v1/savemasignal'),

  // need this action to pass through hpn
  SIGNALS_HPN_BE_ACTION: 'offers-signal',

  // the code of signal type for market analysis signal
  SIGNALS_MA_TYPE: 'ma',

  // the version number of the market analysis signal structure that we are using
  SIGNALS_VERSION: 0.1,

  // how often we want to check & send (if has) the signals to the backend
  // eg: 10 minutes: 10 * 60
  SIGNALS_OFFERS_FREQ_SECS: 10 * 60,
};

export default MAConfigs;
