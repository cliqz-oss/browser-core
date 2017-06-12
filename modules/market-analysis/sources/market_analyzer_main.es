import { utils } from '../core/cliqz';

// import utilities
import { getTopLevelCategory, joinKeyVal, splitKeyVal, generateItems } from './common/utils';
import logger from './common/logger';
import RegexHelper from './common/regex_helper';

// import configuration
import MAConfigs from './conf/ma_configs';

// import models
import { MASignalBuilder, MAGroups, MATimeFrames, MAMetrics } from './model/ma_signal';
import TimeFrames from './model/time_frames';

// import services
import DataAccessProvider from './data_access_provider';
import CommunicationProvider from './communication_provider';

/**
 * Entry point of the module
 * @type {Object}
 */
const CliqzMarketAnalyzer = {
  // data access provider
  dataAccessProvider: new DataAccessProvider(),
  // communication provider
  communicationProvider: new CommunicationProvider(MAConfigs.SIGNALS_BE_ADDR),
  // object recording ma stats, will be saved to ma database
  maTable: {},
  // json file of regexes for checkouts & categories
  regexMappings: null,

  regexHelper: new RegexHelper(),

  logCurrentMATable() {
    logger.debug('Current MATable:');
    logger.logObject(this.maTable);
  },

  /**
   * this function is called whenever the browser starts
   */
  init() {
    const self = this;
    self.dataAccessProvider.loadMATable((docData) => {
      if (docData) {
        self.maTable = docData;
        logger.log('>>> Loaded MATable <<<');
        self.logCurrentMATable();
      } else {
        logger.log('>>> No Database to Load <<<');
      }
      self._startSendSignalsLoop(MAConfigs.SIGNALS_OFFERS_FREQ_SECS);
    });
  },

  _addTelemetryStats() {
    const telemetryGroupStr = joinKeyVal(MAGroups.TELEMETRY, 'any');
    const todayTFs = TimeFrames.fromToday();
    if (!(telemetryGroupStr in this.maTable)) {
      this.maTable[telemetryGroupStr] = {};
    }
    let changed = false;
    const groupContainer = this.maTable[telemetryGroupStr];
    Object.keys(MATimeFrames).forEach((tfKey) => {
      const tf = MATimeFrames[tfKey];
      const todayTFStr = joinKeyVal(tf, todayTFs.getTFValue(tf));

      if (!(todayTFStr in groupContainer)) {
        groupContainer[todayTFStr] = this._newTelemetryRecord();
        changed = true;
      }
    });

    if (changed) {
      logger.debug('added telemetry stats');
      this._persistCurrentMATable();
    }
  },

  /**
   * persist current MATable
   */
  _persistCurrentMATable() {
    logger.debug('saving the current MATable:');
    logger.logObject(this.maTable);
    this.dataAccessProvider.saveMATable(this.maTable);
  },

  /**
   * Find old stats. This function runs periodically
   * If any, send them to the backend and then remove them from local database
   */
  _sendOldStats() {
    logger.debug('>>> Finding stats to send..');
    if (!this.maTable) return;

    const self = this;
    const todayTFs = TimeFrames.fromToday();
    const signalsToSend = [];

    // Looking for old stats in maTable
    // If has, send & remove the old stats
    Object.keys(self.maTable).forEach((maGroupStr) => {
      const groupSplits = splitKeyVal(maGroupStr);
      const group = groupSplits[0];
      const groupVal = groupSplits[1];

      // used for accumulating (tf, unique metrics) of signal
      // send only one signal (with unique metrics) per maGroup
      // subject to changes. This is the fight between privacy vs performance
      const uniqueRecords = [];

      Object.keys(self.maTable[maGroupStr]).forEach((timeFrameStr) => {
        const tfSplits = splitKeyVal(timeFrameStr);
        const timeFrame = tfSplits[0];
        const timeFrameVal = tfSplits[1];
        const todayTFStr = joinKeyVal(timeFrame, todayTFs.getTFValue(timeFrame));
        if (todayTFStr) {
          const maStats = self.maTable[maGroupStr][timeFrameStr];

          if (group === MAGroups.DOMAIN && timeFrame === MATimeFrames.DAY_OF_YEAR) {
            if (this._isNotEmptyNonUniqueStats(maStats)) {
              // send only one signal (with nonunique metrics) per domain
              // subject to changes. This is the fight between privacy vs performance
              const domainMappings = this.regexMappings[groupVal];
              let category = '';
              if ('cat' in domainMappings) {
                category = domainMappings.cat;
              }
              const tlCategory = getTopLevelCategory(category);
              const signal = MASignalBuilder.buildSignalForNonUniqueMetrics(groupVal,
                category,
                tlCategory,
                todayTFs,
                maStats);
              signalsToSend.push(signal);
            }
          }

          const uniqueRecord = {};
          uniqueRecord.metrics = {};
          Object.keys(maStats).forEach((metric) => {
            if (this._isUniqueMetric(metric)) {
              const metricVal = maStats[metric];
              if (metricVal !== -1) { // -1 is marked for delete
                uniqueRecord.metrics[metric] = metricVal;
              }
            }
          });

          if (Object.keys(uniqueRecord.metrics).length > 0) {
            uniqueRecord.tf = {};
            uniqueRecord.tf[timeFrame] = timeFrameVal;
            uniqueRecords.push(uniqueRecord);
          }

          // also remove empty records
          if (todayTFStr !== timeFrameStr) {
            // TODO: should we check todayTFStr > timeFrameStr?
            let canDelete = true;
            Object.keys(maStats).forEach((metric) => {
              const metricVal = maStats[metric];
              if (metricVal > 0) {
                canDelete = false;
              }
            });
            if (canDelete) {
              delete self.maTable[maGroupStr][timeFrameStr];
              self._persistCurrentMATable();
            }
          }
        } else {
          logger.error(`Cannot parse todayTFStr for ${timeFrameStr}`);
        }
      });

      if (Object.keys(uniqueRecords).length > 0) {
        const signal = MASignalBuilder.buildSignalForUniqueMetrics(group, groupVal, uniqueRecords);
        signalsToSend.push(signal);
      }
    });

    if (signalsToSend.length > 0) {
      this._sendSignals(signalsToSend);
    }
  },

  /**
   * send signals sequentially
   * @param  {List<Object>} signals
   */
  _sendSignals(signals) {
    const self = this;
    const generator = generateItems(signals);
    function sendNextSignal() {
      const nextItem = generator.next();
      if (nextItem.value) {
        const maSignal = nextItem.value;
        self.communicationProvider.sendSignalToBE(
          maSignal,
          (sentSig, succ) => {
            logger.log(`Signal sent successfully. Success: ${succ}`);
            // mark for delete or update the metricVal
            const isUniqueMetrics = sentSig.isUniqueMetrics;
            if (!isUniqueMetrics) {
              const sentGroupStr = joinKeyVal(MAGroups.DOMAIN,
                sentSig.groups[MAGroups.DOMAIN]);
              const sentTFStr = joinKeyVal(MATimeFrames.DAY_OF_YEAR,
                sentSig.tfs[MATimeFrames.DAY_OF_YEAR]);
              Object.keys(sentSig.metrics).forEach((m) => {
                self.maTable[sentGroupStr][sentTFStr][m] -= sentSig.metrics[m];
              });
            } else {
              const sentGroup = Object.keys(sentSig.group)[0];
              const sentGroupStr = joinKeyVal(sentGroup, sentSig.group[sentGroup]);
              const records = sentSig.records;
              records.forEach((rec) => {
                const sentTF = Object.keys(rec.tf)[0];
                const sentTFStr = joinKeyVal(sentTF, rec.tf[sentTF]);
                Object.keys(rec.metrics).forEach((m) => {
                  if (rec.metrics[m] === 1) {
                    self.maTable[sentGroupStr][sentTFStr][m] = -1;
                  }
                });
              });
            }
            self._persistCurrentMATable();
            self.sendSignalTO = utils.setTimeout(sendNextSignal, 1000);
          },
          (sentSig, err) => {
            logger.error(`Failed to send signal. Error: ${err}`);
            self.sendSignalTO = utils.setTimeout(sendNextSignal, 1000);
          }
        );
      }
    }
    sendNextSignal();
  },

  /**
   * start the SendSignalLoop process
   * @param  {number} timeToSendSecs - time to send in seconds
   */
  _startSendSignalsLoop(timeToSendSecs) {
    const self = this;
    function signalLoop() {
      self._addTelemetryStats();
      self._sendOldStats();
      self.sendSignalLoopTO = utils.setTimeout(signalLoop, timeToSendSecs * 1000);
    }
    signalLoop();
  },

  /**
   * callback function whenever the current url changes
   * if a regex matches, we analyze that match
   * @param  {string} currentUrl
   */
  matchURL(currentUrl) {
    const url = currentUrl.toLowerCase();
    logger.debug(`current url: ${currentUrl}`);
    // cut-off on url's length
    if (url.length <= MAConfigs.MAX_URL_LENGTH) {
      // domain here is a top-level domain (registered domain)
      const domain = utils.getDetailsFromUrl(url).domain;
      if (domain && this.regexMappings && this.regexMappings[domain]) {
        const domainMappings = this.regexMappings[domain];
        let category = '';
        if ('cat' in domainMappings) {
          category = domainMappings.cat;
        }
        if ('regexes' in domainMappings) {
          Object.keys(domainMappings.regexes).forEach((metric) => {
            const regexesForThisMetric = domainMappings.regexes[metric];
            regexesForThisMetric.some((regexStr) => {
              // linear search, looking for the first match only in each metric
              if ((regexStr === '.') || this.regexHelper.test(regexStr, url)) {
                logger.debug(`A pattern matches: url=${url}, domain=${domain}, category=${category}, regex=${regexStr}`);
                CliqzMarketAnalyzer.analyzeMAMatch(domain, category, metric);
                return true;
              }
              return false;
            });
          });
        } else {
          logger.error(`Missing "regexes" for domain ${domain}`);
        }
      }
    }
  },

  /**
   * Handle a (url, regex pattern) match
   * Analyze the match, checking against current MATable
   * Update MATable accordingly
   * @param  {String} domain - domain of the url
   * @param  {[String]} maGroups
   */
  analyzeMAMatch(domain, category, metric) {
    const maGroups = [joinKeyVal(MAGroups.DOMAIN, domain)];
    if (category) {
      const tlCategory = getTopLevelCategory(category);
      maGroups.push(joinKeyVal(MAGroups.CATEGORY, category));
      maGroups.push(joinKeyVal(MAGroups.TL_CATEGORY, tlCategory));
    }

    const todayTFs = TimeFrames.fromToday();
    maGroups.forEach((maGroupStr) => {
      if (!(maGroupStr in this.maTable)) {
        // this magroup does not exist
        this.maTable[maGroupStr] = {};
      }
      const groupContainer = this.maTable[maGroupStr];
      Object.keys(MATimeFrames).forEach((tfKey) => {
        const tf = MATimeFrames[tfKey];
        // only store non-unique metrics when
        // time frame type is day of year and group is domain
        const uniqueOnly = ((tf !== MATimeFrames.DAY_OF_YEAR)
          || (splitKeyVal(maGroupStr)[0] !== MAGroups.DOMAIN));
        const todayTFStr = joinKeyVal(tf, todayTFs.getTFValue(tf));
        if (todayTFStr in groupContainer) {
          // there is an existing stats for this time frame
          // just increase the number of impression
          let maStats = groupContainer[todayTFStr];
          maStats = this._updateRecordForNewImpression(maStats, metric, uniqueOnly);
          groupContainer[todayTFStr] = maStats;
        } else {
          // never have stats for this time frame
          groupContainer[todayTFStr] = this._updateRecordForNewImpression({}, metric, uniqueOnly);
        }
      });
    });
    this._persistCurrentMATable();
  },

  /**
   * update stats record when there is a new impression on a given metric code
   * @param  {Object} maStats     stats record
   * @param  {String} metric      metric code in mappings.json
   * @param  {Boolean} uniqueOnly whether to update nonUnique metrics
   * @return {Object}             updated maStats
   */
  _updateRecordForNewImpression(maStats, metric, uniqueOnly) {
    const dict = maStats;
    switch (metric) {
      case 'v': {
        if (!uniqueOnly) {
          if (maStats[MAMetrics.IMP]) {
            dict[MAMetrics.IMP] += 1;
          } else {
            dict[MAMetrics.IMP] = 1;
          }
        }
        if (!(maStats[MAMetrics.U_IMP])) {
          dict[MAMetrics.U_IMP] = 1;
        }
        break;
      }
      case 'cr1': {
        if (!uniqueOnly) {
          if (maStats[MAMetrics.CR1_IMP]) {
            dict[MAMetrics.CR1_IMP] += 1;
          } else {
            dict[MAMetrics.CR1_IMP] = 1;
          }
        }

        if (!(maStats[MAMetrics.CR1_U_IMP])) {
          dict[MAMetrics.CR1_U_IMP] = 1;
        }
        break;
      }
      case 'cr2': {
        if (!uniqueOnly) {
          if (maStats[MAMetrics.CR2_IMP]) {
            dict[MAMetrics.CR2_IMP] += 1;
          } else {
            dict[MAMetrics.CR2_IMP] = 1;
          }
        }
        if (!(maStats[MAMetrics.CR2_U_IMP])) {
          dict[MAMetrics.CR2_U_IMP] = 1;
        }
        break;
      }
      default : {
        break;
      }
    }
    return dict;
  },

  _newTelemetryRecord() {
    const dict = {};
    dict[MAMetrics.U_IMP] = 1;
    return dict;
  },

  _isUniqueMetric(metric) {
    return (metric === MAMetrics.U_IMP
      || metric === MAMetrics.CR1_U_IMP
      || metric === MAMetrics.CR2_U_IMP);
  },

  _isNotEmptyNonUniqueStats(maStats) {
    const imp = maStats[MAMetrics.IMP] || 0;
    const cr1Imp = maStats[MAMetrics.CR1_IMP] || 0;
    const cr2Imp = maStats[MAMetrics.CR2_IMP] || 0;
    return ((imp !== 0) || (cr1Imp !== 0) || (cr2Imp !== 0));
  }
};

export default CliqzMarketAnalyzer;
