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
  OFFERS_HISTORY_DATA: 'chrome://cliqz/content/offers-v2/offers_history.json',

  //////////////////////////////////////////////////////////////////////////////
  // SIGNALS

  // how often we want to send the signals related with the offers to the BE
  // one hour
  SIGNALS_OFFERS_FREQ_SECS: 60 * 60,
  SIGNALS_OFFERS_BUCKET_NAME: 'sig-offers',
  SIGNALS_TRIGGERS_BUCKET_NAME: 'sig-triggers',

  //////////////////////////////////////////////////////////////////////////////
  // CONFIG / DEBUG variables
  //

  // override the timeout time of the offers only if this is > 0
  OFFERS_OVERRIDE_TIMEOUT: -1


};


export default OffersConfigs;
