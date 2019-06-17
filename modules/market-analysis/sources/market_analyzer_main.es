import { getDetailsFromUrl } from '../core/url';
import { setTimeout } from '../core/timers';

// import utilities
import { getTopLevelCategory, joinKeyVal, splitKeyVal, generateItems } from './common/utils';
import now from './common/now';
import logger from './common/logger';
import RegexHelper from './common/regex_helper';
import SessionChecker from './common/session_checker';

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
  // database is modified
  dbModified: false,

  regexHelper: new RegexHelper(),

  sessionChecker: new SessionChecker(),

  logCurrentMATable() {
    logger.debug('Current MATable:');
    logger.logObject(this.maTable);
  },

  /**
   * this function is called whenever the browser starts
   */
  async init() {
    const self = this;
    await self.dataAccessProvider.init();
    self.dataAccessProvider.loadMATable((docData) => {
      if (docData) {
        self.maTable = docData;
        logger.log('>>> Loaded MATable <<<');
        self.logCurrentMATable();
        self._upgradeMATable();
        logger.log('>>> Upgraded MATable <<<');
        self.logCurrentMATable();
      } else {
        logger.log('>>> No Database to Load <<<');
      }
      self._startSendSignalsLoop(MAConfigs.SIGNALS_SEND_INTERVAL_SECS);
    });
  },

  /**
   * upgrade MATable from v0.1 to v0.2
   * since there are some changes in the metric names and metric codes
   * this will be removed at some point
   * @private
   */
  _upgradeMATable() {
    const self = this;
    Object.keys(self.maTable).forEach((maGroupStr) => {
      Object.keys(self.maTable[maGroupStr]).forEach((timeFrameStr) => {
        const maStats = self.maTable[maGroupStr][timeFrameStr];
        Object.keys(maStats).forEach((metric) => {
          if (metric === MAMetrics.CR1_IMP || metric === MAMetrics.CR2_IMP) {
            delete maStats[metric];
            this.dbModified = true;
          }

          if (metric === MAMetrics.U_IMP) {
            maStats[MAMetrics.U_VISITOR] = maStats[metric];
            delete maStats[metric];
            this.dbModified = true;
          }

          if (metric === MAMetrics.CR1_U_IMP) {
            maStats[MAMetrics.U_SHOPPER] = maStats[metric];
            delete maStats[metric];
            this.dbModified = true;
          }

          if (metric === MAMetrics.CR2_U_IMP) {
            maStats[MAMetrics.U_POT_BUYER] = maStats[metric];
            delete maStats[metric];
            this.dbModified = true;
          }
        });
      });
    });
    self._persistCurrentMATable();
  },

  _addTelemetryStats() {
    const telemetryGroupStr = joinKeyVal(MAGroups.TELEMETRY, 'any');
    const todayTFs = TimeFrames.fromToday();
    if (!(telemetryGroupStr in this.maTable)) {
      this.maTable[telemetryGroupStr] = {};
    }
    const groupContainer = this.maTable[telemetryGroupStr];
    Object.keys(MATimeFrames).forEach((tfKey) => {
      const tf = MATimeFrames[tfKey];
      const todayTFStr = joinKeyVal(tf, todayTFs.getTFValue(tf));

      if (!(todayTFStr in groupContainer)) {
        groupContainer[todayTFStr] = this._newTelemetryRecord();
        this.dbModified = true;
      }
    });

    if (this.dbModified) {
      logger.debug('added telemetry stats');
      this._persistCurrentMATable();
    }
  },

  /**
   * persist current MATable
   */
  _persistCurrentMATable() {
    if (this.dbModified) {
      logger.debug('saving the current MATable:');
      logger.logObject(this.maTable);
      this.dataAccessProvider.saveMATable(this.maTable);
      this.dbModified = false;
    }
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
      const tfContainers = Object.keys(self.maTable[maGroupStr]);
      if (tfContainers.length === 0) {
        delete self.maTable[maGroupStr];
        self.dbModified = true;
        return;
      }

      const [group, groupVal] = splitKeyVal(maGroupStr);

      // used for accumulating (tf, unique metrics) of signal
      // send only one signal (with unique metrics) per maGroup
      // subject to changes. This is the fight between privacy & performance
      const uniqueRecords = [];
      tfContainers.forEach((timeFrameStr) => {
        const [timeFrame, timeFrameVal] = splitKeyVal(timeFrameStr);
        const todayTFStr = joinKeyVal(timeFrame, todayTFs.getTFValue(timeFrame));
        if (todayTFStr) {
          const maStats = self.maTable[maGroupStr][timeFrameStr];

          if (group === MAGroups.DOMAIN && timeFrame === MATimeFrames.DAY_OF_YEAR) {
            if (self._isNotEmptyNonUniqueStats(maStats)) {
              // send only one signal (with nonunique metrics) per domain
              // subject to changes. This is the fight between privacy vs performance
              const domainMappings = self.regexMappings[groupVal];
              let category = '';
              if ('cat' in domainMappings) {
                category = domainMappings.cat;
              }
              const tlCategory = getTopLevelCategory(category);
              const signal = MASignalBuilder.buildSignalForNonUniqueMetrics(groupVal,
                category,
                tlCategory,
                timeFrameVal,
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
          if (self._isOldAndEmptyTFRecord(todayTFStr, timeFrameStr, maStats)) {
            delete self.maTable[maGroupStr][timeFrameStr];
            self.dbModified = true;
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
    self._persistCurrentMATable();
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
            self.dbModified = true;
            self._persistCurrentMATable();
            self.sendSignalTO = setTimeout(sendNextSignal, 1000);
          },
          (sentSig, err) => {
            logger.log(`Failed to send signal. Error: ${err}`);
            self.sendSignalTO = setTimeout(sendNextSignal, 1000);
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
    function startNextSignalLoop() {
      self._addTelemetryStats();
      self._sendOldStats();
      self.sendSignalLoopTO = setTimeout(startNextSignalLoop, timeToSendSecs * 1000);
    }
    // start sending the first signals after 1 minute, just in case HPN hasn't been loaded yet
    self.sendSignalLoopTO = setTimeout(startNextSignalLoop, 60 * 1000);
  },

  /**
   * callback function whenever the current url changes
   * If a regex matches, we analyze that match
   * @param  {string} currentUrl
   */
  matchURL(currentUrl) {
    const url = currentUrl.toLowerCase();
    logger.debug(`current url: ${currentUrl}`);
    // cut-off on url's length
    if (url.length <= MAConfigs.MAX_URL_LENGTH) {
      // domain here is a top-level domain (registered domain)
      const domain = getDetailsFromUrl(url).domain;
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
   * @param  {String} category - category of domain
   * @param  {String} metric - metric matched in mappings.json
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
        this.maTable[maGroupStr] = {};
        this.dbModified = true;
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
          maStats = this._updateMetricRecord(domain, maStats, metric, uniqueOnly);
          groupContainer[todayTFStr] = maStats;
        } else {
          // never have stats for this time frame
          groupContainer[todayTFStr] = this._updateMetricRecord(domain, {}, metric, uniqueOnly);
        }
        this.dbModified = true;
      });
    });
    this._persistCurrentMATable();
  },

  /**
   * update stats record when there is a new impression on a given metric code
   * @param  {String} domain        domain (registered domain)
   * @param  {Object} maStats       stats record
   * @param  {String} metric        metric code in mappings.json
   * @param  {Boolean} uniqueOnly   whether to update nonUnique metrics
   * @param  {Boolean} isNewSession whether this impression is a new session or not
   * @return {Object}               updated maStats
   */
  _updateMetricRecord(domain, maStats, metric, uniqueOnly) {
    const dict = maStats;
    let [nonUniqueMetricCodes, uniqueMetricCode] = [[], ''];
    switch (metric) {
      case 'v': {
        nonUniqueMetricCodes.push(MAMetrics.IMP);
        nonUniqueMetricCodes.push(MAMetrics.VISIT);
        uniqueMetricCode = MAMetrics.U_VISITOR;
        break;
      }
      case 'reg': {
        nonUniqueMetricCodes = [MAMetrics.REGISTRATION];
        uniqueMetricCode = MAMetrics.U_REGISTRANT;
        break;
      }
      case 'sho': {
        nonUniqueMetricCodes = [MAMetrics.SHOPPING];
        uniqueMetricCode = MAMetrics.U_SHOPPER;
        break;
      }
      case 'chk': {
        nonUniqueMetricCodes = [MAMetrics.CHECKOUT];
        uniqueMetricCode = MAMetrics.U_POT_BUYER;
        break;
      }
      case 'tra': {
        nonUniqueMetricCodes = [MAMetrics.TRANSACTION];
        uniqueMetricCode = MAMetrics.U_BUYER;
        break;
      }
      default: {
        logger.error(`Unrecognized metric: ${metric}`);
        break;
      }
    }

    if (!uniqueOnly) {
      nonUniqueMetricCodes.forEach((nonUniqueMetricCode) => {
        const isNewSession = this.sessionChecker.isNewSession(domain, nonUniqueMetricCode, now());
        if (maStats[nonUniqueMetricCode]) {
          if (isNewSession) {
            dict[nonUniqueMetricCode] += 1;
          }
        } else {
          dict[nonUniqueMetricCode] = 1;
        }
      });
    }
    if (!(maStats[uniqueMetricCode])) {
      // new impression
      dict[uniqueMetricCode] = 1;
    }
    return dict;
  },

  _newTelemetryRecord() {
    return { [MAMetrics.U_VISITOR]: 1 };
  },

  _isUniqueMetric(metric) {
    return (metric === MAMetrics.U_VISITOR
      || metric === MAMetrics.U_REGISTRANT
      || metric === MAMetrics.U_SHOPPER
      || metric === MAMetrics.U_POT_BUYER
      || metric === MAMetrics.U_BUYER);
  },

  _isNotEmptyNonUniqueStats(maStats) {
    const imp = maStats[MAMetrics.IMP] || 0;
    const visit = maStats[MAMetrics.VISIT] || 0;
    const registration = maStats[MAMetrics.REGISTRATION] || 0;
    const shopping = maStats[MAMetrics.SHOPPING] || 0;
    const checkout = maStats[MAMetrics.CHECKOUT] || 0;
    const transaction = maStats[MAMetrics.TRANSACTION] || 0;
    return ((imp !== 0)
      || (visit !== 0)
      || (registration !== 0)
      || (shopping !== 0)
      || (checkout !== 0)
      || (transaction !== 0));
  },

  _isOldAndEmptyTFRecord(todayTFStr, timeFrameStr, maStats) {
    if (todayTFStr !== timeFrameStr) {
      // TODO: should we check todayTFStr > timeFrameStr?
      let canDelete = true;
      Object.keys(maStats).forEach((metric) => {
        const metricVal = maStats[metric];
        if (metricVal > 0) {
          canDelete = false;
        }
      });
      return canDelete;
    }
    return false;
  }
};

export default CliqzMarketAnalyzer;
