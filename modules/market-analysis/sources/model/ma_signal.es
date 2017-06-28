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
  VISIT:      'v',
  IMP:        'imp',
  U_IMP:      'uImp',
  CR1_IMP:    'cr1Imp',
  CR1_U_IMP:  'cr1UImp',
  CR2_IMP:    'cr2Imp',
  CR2_U_IMP:  'cr2UImp'
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
   *     "doy": 151,
   *     "woy": 22,
   *     "m": 5
   *   },
   *   "metrics": {
   *     "imp": 5,
   *     "cr1Imp": 2,
   *     "cr2Imp": 1
   *   }
   * }
   * @param  {String}     domain
   * @param  {String}     cat
   * @param  {String}     tlcat
   * @param  {TimeFrames} timeframes
   * @param  {Object}     stats
   * @return {Object}
   */
  static buildSignalForNonUniqueMetrics(domain, cat, tlcat, timeframes, stats) {
    const dict = {};
    dict.isUniqueMetrics = false;
    const groupContainer = {};
    groupContainer[MAGroups.DOMAIN] = domain;
    groupContainer[MAGroups.CATEGORY] = cat;
    groupContainer[MAGroups.TL_CATEGORY] = tlcat;
    dict.groups = groupContainer;

    const tfContainer = {};
    tfContainer[MATimeFrames.DAY_OF_YEAR] = timeframes.getTFValue(MATimeFrames.DAY_OF_YEAR);
    tfContainer[MATimeFrames.WEEK_OF_YEAR] = timeframes.getTFValue(MATimeFrames.WEEK_OF_YEAR);
    tfContainer[MATimeFrames.MONTH] = timeframes.getTFValue(MATimeFrames.MONTH);
    dict.tfs = tfContainer;

    const metricsContainer = {};
    if (stats[MAMetrics.IMP]) {
      metricsContainer[MAMetrics.IMP] = stats[MAMetrics.IMP];
    }
    if (stats[MAMetrics.CR1_IMP]) {
      metricsContainer[MAMetrics.CR1_IMP] = stats[MAMetrics.CR1_IMP];
    }
    if (stats[MAMetrics.CR2_IMP]) {
      metricsContainer[MAMetrics.CR2_IMP] = stats[MAMetrics.CR2_IMP];
    }
    dict.metrics = metricsContainer;
    return dict;
  }

  /**
   * Build signal object for unique metrics
   * Sample signal:
   * {
   *   "isUniqueMetrics": true,
   *   "group": {
   *     "tlcat": "Home"
   *   },
   *   "records": [
   *     {
   *       "metrics": {
   *         "uImp": 1,
   *         "cr1UImp": 1
   *       },
   *       "tf": {
   *         "doy": "151"
   *       }
   *     },
   *     {
   *       "metrics": {
   *         "uImp": 1,
   *         "cr1UImp": 1
   *       },
   *       "tf": {
   *         "woy": "22"
   *       }
   *     },
   *     {
   *       "metrics": {
   *         "uImp": 1,
   *         "cr1UImp": 1
   *       },
   *       "tf": {
   *         "m": "5"
   *       }
   *     }
   *   ]
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
