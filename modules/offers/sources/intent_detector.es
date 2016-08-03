//import Reporter from 'offers/reporter';
import LoggingHandler from 'offers/logging_handler';


const MODULE_NAME = 'intent_detector';



////////////////////////////////////////////////////////////////////////////////
export function IntentDetector(clusterID, mappings = null, dbMaps = null) {
  this.clusterID = clusterID;
  this.mappings = mappings;
  this.dbMap = dbMaps;
  this.rule = null;
  this.processedRuleData = null;

}

//
// @brief load the databases from a raw db file (json)
// @returns true on success | false otherwise
//
IntentDetector.prototype.loadDataBases = function(rawDatabase) {
  if (this.dbMap === null) {
    throw new Error('no databases map found! for IntentDetector: ' + this.clusterID);
  }
  for (var dbName in rawDatabase) {
    if (!this.dbMap.hasOwnProperty(dbName)) {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.error(MODULE_NAME,
                           'The databasemap is missing the database with name: ' + dbName,
                           LoggingHandler.ERR_INTERNAL);

      throw new Error('we couldnt find the database with name ' + dbName + ' in the map');
    }

    // initialize all the databases
    let db = this.dbMap[dbName];
    db.loadFromDict(rawDatabase[dbName]);
  }

  LoggingHandler.LOG_ENABLED &&
  LoggingHandler.info(MODULE_NAME,
    'databases loaded for intent detector of cluster ' + this.clusterID);

  return true;
};

//
// @brief load and parse the rule
//
IntentDetector.prototype.loadRule = function(rulesBuilder, fidsBuilder) {
  // get the rule from the builder
  this.rule = rulesBuilder.buildRule(this.clusterID);
  if (!this.rule) {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.error(MODULE_NAME,
                         'We couldnt build a rule for the cluster id: ' + this.clusterID,
                         LoggingHandler.ERR_INTERNAL);
    throw new Error('We couldnt build a rule for the cluster id: ' + this.clusterID);
  }

  // get the fidsMappings from the rule and parse it.
  var fidsMapping = this.rule.fidsMappings();
  if (!fidsMapping) {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.error(MODULE_NAME,
                         'We couldnt get a valid fidsMappings for the rule with '+
                         'clusterID: ' + this.clusterID,
                         LoggingHandler.ERR_INTERNAL);
    throw new Error('We couldnt get a valid fidsMappings for the rule with ' +
                    'clusterID: ' + this.clusterID);
  }

  LoggingHandler.LOG_ENABLED &&
  LoggingHandler.info(MODULE_NAME, 'Reading fidMappings: ' + JSON.stringify(fidsMapping));

  // build all the needed fids for the rule itself (ensure we are not repeating this)
  this.processedRuleData = {};
  for (var id in fidsMapping) {
    if (!fidsMapping.hasOwnProperty(id)) {
      continue;
    }

    // get the fid name and the arguments maps
    var fidMap = fidsMapping[id];
    var fidName = ((fidMap) && (fidMap.hasOwnProperty('name'))) ? fidMap['name'] : null;
    var fidArgs = ((fidMap) && (fidMap.hasOwnProperty('args'))) ? fidMap['args'] : null;
    if (!fidName || !fidArgs) {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.error(MODULE_NAME,
                           'The rule has invalid format for the fids map, for ' +
                           'clusterID: ' + this.clusterID +
                           ' - fidMap: ' + JSON.stringify(fidMap),
                           LoggingHandler.ERR_INTERNAL);
      throw new Error('The rule has invalid format for the fids map, for ' +
                      'clusterID: ' + this.clusterID);
    }

    // now build the fid for this
    var fidInstance = fidsBuilder.buildFID(fidName);
    if (!fidInstance) {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.error(MODULE_NAME,
                           'We dont have fid with name ' + fidName + 'for ' +
                           'clusterID: ' + this.clusterID,
                           LoggingHandler.ERR_INTERNAL);
      throw new Error('We dont have fid with name ' + fidName + 'for ' +
                      'clusterID: ' + this.clusterID);
    }

    // add this to the processed rule
    this.processedRuleData[id] = [fidInstance, fidArgs];

    // load the databases and configure the args right away
    fidInstance.configureDataBases(this.dbMap);
    fidInstance.configureArgs(fidArgs);
  }
  // TODO check consistency (cannot have the same fid with exactly the same args).

  // do a evaluation test here with values
  var testResultData = {};
  for (var id in this.processedRuleData) {
    testResultData[id] = 1;
  }
  const testResult = this.rule.evaluate(testResultData);
  LoggingHandler.LOG_ENABLED &&
  LoggingHandler.info(MODULE_NAME,
                      'evaluating rule for clusterID: ' + this.clusterID + ' with '+
                      '\n fidsMapping: ' + JSON.stringify(fidsMapping) +
                      '\n testData: ' + JSON.stringify(testResultData) +
                      '\n and result: ' + testResult);
};

//
// @brief evaluateInput
//
IntentDetector.prototype.evaluateInput = function(intentInput) {
  if (!this.rule || !this.processedRuleData) {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.error(MODULE_NAME,
                         'We cannot process rule for cid: ' + this.clusterID,
                         LoggingHandler.ERR_INTERNAL);
    return 0.0;
  }

  // evaluate the rule here after evaluating the fids
  var resultVal = 0.0;
  try {
    var evalData = {};
    for (var id in this.processedRuleData) {
      var fid = this.processedRuleData[id][0];
      evalData[id] = fid.evaluate(intentInput);
    }
    resultVal = this.rule.evaluate(evalData);
  } catch (ee) {
    LoggingHandler.error(MODULE_NAME,
                         'Error processing the event for cid: ' + this.clusterID +
                         'error: ' + ee,
                         LoggingHandler.ERR_INTERNAL);
  }

  return resultVal;
};



