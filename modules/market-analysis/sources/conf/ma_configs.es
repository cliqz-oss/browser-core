import prefs from '../../core/prefs';

const MAConfigs = {

  //------------------------------------------------------------
  //  GLOBAL
  //------------------------------------------------------------
  // module version
  CURRENT_VERSION: 0.8,

  // cut-off value for url length
  // any url has length more than MAX_URL_LENGTH will be ignored
  MAX_URL_LENGTH: 500,

  // is this module enabled?
  IS_ENABLED: prefs.get('MarketAnalysisEnabled', false),

  IS_LOGGING_ENABLED: prefs.get('showConsoleLogs', false),

  LOG_LEVEL: prefs.get('MA.LogLevel', 'log'), // log, debug

  //------------------------------------------------------------
  //  SIGNALS
  //------------------------------------------------------------

  // backend server address
  SIGNALS_BE_ADDR: prefs.get('MA.BackendAddr', 'https://offers-api.cliqz.com/api/v1/savemasignal'),

  // need this action to pass through hpn
  SIGNALS_HPN_BE_ACTION: 'offers-signal',

  // the code of signal type for market analysis signal
  SIGNALS_MA_TYPE: 'ma',

  // the version number of the market analysis signal structure that we are using
  SIGNALS_VERSION: 0.8,

  // how often we want to check & send (if has) the signals to the backend
  // eg: 10 minutes: 10 * 60
  SIGNALS_SEND_INTERVAL_SECS: prefs.get('MA.SendIntervalSecs', 600),
};

export default MAConfigs;
