import prefs from '../core/prefs';
import config from '../core/config';

const prefPrefix = 'offers-v2.';
const constToPrefName = constName => `${prefPrefix}${constName.toLowerCase()}`;

const OffersConfigs = {

  // ///////////////////////////////////////////////////////////////////////////
  // GLOBAL
  MINUTE: 60,
  HOUR: 60 * 60,
  DAY: 60 * 60 * 24,

  CURRENT_VERSION: 2.0,

  LOG_LEVEL: 'debug',

  // by default is not dev mode
  IS_DEV_MODE: true,

  // ///////////////////////////////////////////////////////////////////////////
  // trigger backend endpoint
  get BACKEND_URL() {
    return prefs.get('triggersBE', config.settings.OFFERS_BE_BASE_URL);
  },

  // the redirect url to where we should point to when the user sees the offer
  // and click on "more info"
  OFFER_INFORMATION_URL: 'https://cliqz.com/products/cliqz-for-desktop/cliqz-angebote',

  // the time we want to track the signals after they were created
  OFFERS_HISTORY_LIVE_TIME_SECS: 20 * 60 * 24 * 60,

  // the current trigger engine version
  TRIGGER_ENGINE_VERSION: '24',

  // offer storage
  LOAD_OFFERS_STORAGE_DATA: true,
  OFFERS_STORAGE_DEFAULT_TTS_SECS: 60 * 60 * 24 * 10,

  //
  THROTTLE_HISTORY_QUERIES_SECS: 180,
  THROTTLE_PUSH_TO_REWARD_BOX_SECS: 180,

  // ///////////////////////////////////////////////////////////////////////////
  // SIGNALS

  // how often we want to send the signals related with the offers to the BE
  // ten minutes
  SIGNALS_OFFERS_FREQ_SECS: 30 * 60,
  get SIGNALS_HPN_BE_ADDR() {
    return `${prefs.get('triggersBE', config.settings.OFFERS_BE_BASE_URL)}/api/v1/savesignal`;
  },
  SIGNALS_HPN_BE_ACTION: 'offers-signal',
  // the time we want to keep the signals (accumulating) from the last time
  // the signal was modified (#GR-298)
  SIGNALS_OFFERS_EXPIRATION_SECS: 60 * 60 * 24 * 60,
  // the version number of the signal structure we are currently using
  SIGNALS_VERSION: 3.1,
  // debug variable to load / not load the data from DB
  SIGNALS_LOAD_FROM_DB: true,
  // how frequent we want to save into DB
  SIGNALS_AUTOSAVE_FREQ_SECS: 2 * 60,
  // maximum number of retries sending a signal
  MAX_RETRIES: 3,

  // adding configs values for the send_signal operation (EX-4976)
  SEND_SIG_OP_EXPIRATION_SECS: 60 * 60 * 24 * 60,
  SEND_SIG_OP_SHOULD_LOAD: true,

  // ///////////////////////////////////////////////////////////////////////////
  // CONFIG / DEBUG variables
  //

  // override the timeout time of the offers only if this is > 0
  OFFERS_OVERRIDE_TIMEOUT: -1,

  get MAX_NUM_OFFERS_PER_DAY() {
    return prefs.get(constToPrefName('MAX_NUM_OFFERS_PER_DAY'), 5);
  },
};

export default OffersConfigs;
