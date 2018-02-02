/* eslint-disable key-spacing */

const MAGroups = {
  TL_CATEGORY:  'tlcat',
  CATEGORY:     'cat',
  DOMAIN:       'domain',
  TELEMETRY:    'tel'
};

const MATimeFrames = {
  DAY_OF_YEAR:  'doy',
  WEEK_OF_YEAR: 'woy',
  MONTH:        'm'
};

const MAMetrics = {
  //------------------------------------------------------------
  // per user metrics
  //------------------------------------------------------------
  U_VISITOR:    'uVisitor', // unique visitor
  U_REGISTRANT: 'uRegistrant', // unique registrant
  U_SHOPPER:    'uShopper', // unique shopper
  U_POT_BUYER:  'uPotBuyer', // unique potential buyer
  U_BUYER:      'uBuyer', // unique buyer

  U_IMP:        'uImp', // (unique visitor) deprecated, use U_VISITOR
  CR1_IMP:      'cr1Imp', // deprecated, to be removed
  CR1_U_IMP:    'cr1UImp', // (unique shopper) deprecated, use U_SHOPPER
  CR2_IMP:      'cr2Imp', // deprecated, to be removed
  CR2_U_IMP:    'cr2UImp', // (unique potential buyer) deprecated, use U_POT_BUYER

  //------------------------------------------------------------
  // per activity metrics
  // based on session: x-seconds inactivity on a particular domain, or browser is closed
  //------------------------------------------------------------
  IMP:          'imp', // an impression (5-second-session)
  VISIT:        'v', // a visit is at least an impression in 30-minute-session
  REGISTRATION: 'reg', // a registration (30-minute-session)
  SHOPPING:     'sho', // a shopping action (add item to basket, visit "my basket" page, ...) (5-minute-session)
  CHECKOUT:     'chk', // a checkout action (payment, coupons, shipping, ... pages) (30-minute-session)
  TRANSACTION:  'tra', // a successful transaction (30-minute-session)
};

/**
 * Class for building a "market analysis signal" to be sent to the backend
 */
class MASignalBuilder {
  /**
   * Build signal object for non-unique metrics
   * Sample signal data
   * {
   *   "isUniqueMetrics": false,
   *   "groups": {
   *     "domain": "matratzen-concord.de",
   *     "cat": "Home.Bed",
   *     "tlcat": "Home"
   *   },
   *   "tfs": {
   *     "doy": "177"
   *   },
   *   "metrics": {
   *     "imp": 5,
   *     "v": 1,
   *     "reg": 1,
   *     "sho": 1,
   *     "chk": 1,
   *     "tra": 1
   *   }
   * }
   * @param  {String}     domain
   * @param  {String}     cat
   * @param  {String}     tlcat
   * @param  {Number}     dayOfYearVal
   * @param  {Object}     stats
   * @return {Object}
   */
  static buildSignalForNonUniqueMetrics(domain, cat, tlcat, dayOfYearVal, stats) {
    const dict = {};
    dict.isUniqueMetrics = false;
    const groupContainer = {};
    groupContainer[MAGroups.DOMAIN] = domain;
    groupContainer[MAGroups.CATEGORY] = cat;
    groupContainer[MAGroups.TL_CATEGORY] = tlcat;
    dict.groups = groupContainer;

    const tfContainer = {};
    tfContainer[MATimeFrames.DAY_OF_YEAR] = dayOfYearVal;
    dict.tfs = tfContainer;

    const metrics = [MAMetrics.IMP,
      MAMetrics.VISIT,
      MAMetrics.REGISTRATION,
      MAMetrics.SHOPPING,
      MAMetrics.CHECKOUT,
      MAMetrics.TRANSACTION];
    const metricsContainer = {};
    metrics.forEach((metric) => {
      if (stats[metric]) {
        metricsContainer[metric] = stats[metric];
      }
    });

    dict.metrics = metricsContainer;
    return dict;
  }

  /**
   * Build signal object for unique metrics
   * Sample signal:
   * {
   *   "isUniqueMetrics": true,
   *   "group": {
   *     "domain": "matratzen-concord.de"
   *   },
   *   "records": [{
   *     "metrics": {
   *       "uVisitor": 1,
   *       "uRegistrant": 1,
   *       "uPotBuyer": 1,
   *       "uBuyer": 1,
   *       "uShopper": 1
   *     },
   *     "tf": {
   *       "doy": "177"
   *     }
   *   }, {
   *     "metrics": {
   *       "uVisitor": 1,
   *       "uRegistrant": 1,
   *       "uPotBuyer": 1,
   *       "uBuyer": 1,
   *       "uShopper": 1
   *     },
   *     "tf": {
   *       "woy": "26"
   *     }
   *   }, {
   *     "metrics": {
   *       "uVisitor": 1,
   *       "uRegistrant": 1,
   *       "uPotBuyer": 1,
   *       "uBuyer": 1,
   *       "uShopper": 1
   *     },
   *     "tf": {
   *       "m": "6"
   *     }
   *   }]
   * }
   * @param  {String} group
   * @param  {String} groupVal
   * @param  {Object} records
   * @return {Object}
   */
  static buildSignalForUniqueMetrics(group, groupVal, records) {
    const dict = {};
    dict.isUniqueMetrics = true;
    const groupContainer = {};
    groupContainer[group] = groupVal;
    dict.group = groupContainer;

    dict.records = records;
    return dict;
  }
}

export {
  MASignalBuilder,
  MAGroups,
  MATimeFrames,
  MAMetrics
};
