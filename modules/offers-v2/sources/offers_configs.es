import { isChromium } from '../core/platform';

var OffersConfigs = {

  //////////////////////////////////////////////////////////////////////////////
  // GLOBAL
  MINUTE: 60,
  HOUR: 60 * 60,
  DAY: 60 * 60 * 24,

  CURRENT_VERSION: 2.0,

  //////////////////////////////////////////////////////////////////////////////
  // trigger backend endpoint
  BACKEND_URL: 'https://offers-api.cliqz.com',

  // the redirect url to where we should point to when the user sees the offer
  // and click on "more info"
  OFFER_INFORMATION_URL: 'https://cliqz.com/products/cliqz-for-desktop/cliqz-angebote',


  //////////////////////////////////////////////////////////////////////////////
  // UI CONFIGS
  //
  UI_IFRAME_WIDTH_DEF: '100%',
  UI_IFRAME_HEIGHT_DEF: '200px',
  UI_IFRAME_ELEM_ID: 'cqz-of-iframe',
  UI_IFRAME_SRC_DEF: 'chrome://cliqz/content/offers-v2/index.html',

  // load/save offers history persistent data (offers shown, etc)
  LOAD_OFFERS_HISTORY_DATA: true,
  // this will clear the current saved that
  CLEAR_OFFERS_HISTORY_DATA: false,
  OFFERS_HISTORY_DATA: isChromium ? undefined : 'chrome://cliqz/content/offers-v2/offers_history.json',
  // the time we want to track the signals after they were created
  OFFERS_HISTORY_LIVE_TIME_SECS: 60 * 60 * 24 * 60,

  // trigger specific browser history
  LOAD_TRIGGERS_HISTORY_DATA: true,
  TRIGGER_HISTORY_DATA: isChromium ? undefined : 'chrome://cliqz/content/offers-v2/trigger_history.json',


  //////////////////////////////////////////////////////////////////////////////
  // SIGNALS

  // how often we want to send the signals related with the offers to the BE
  // one hour
  SIGNALS_OFFERS_FREQ_SECS: 60 * 60,
  SIGNALS_HPN_BE_ADDR: 'https://offers-api.cliqz.com/api/v1/savesignal',
  SIGNALS_HPN_BE_ACTION: 'offers-signal',
  // the time we want to keep the signals (accumulating) from the last time
  // the signal was modified (#GR-298)
  SIGNALS_OFFERS_EXPIRATION_SECS: 60 * 60 * 24 * 60, //60 days?

  //////////////////////////////////////////////////////////////////////////////
  // CONFIG / DEBUG variables
  //

  // override the timeout time of the offers only if this is > 0
  OFFERS_OVERRIDE_TIMEOUT: -1


};


export default OffersConfigs;
