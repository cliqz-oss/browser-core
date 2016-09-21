import { utils } from 'core/cliqz';
import {RulesBuilder} from 'offers/rules/rules_builder';
import {FIDsBuilder} from 'offers/fids/fids_builder';
import {IntentDetector} from 'offers/intent_detector';
import {IntentInput} from 'offers/intent_input';
import { OfferFetcher } from 'offers/offer_fetcher';
import { DateTimeDB } from 'offers/dbs/datetime_db';
import { GeneralDB } from 'offers/dbs/general_db';
import { DomainInfoDB } from 'offers/dbs/domain_info_db';
import { UIManager } from 'offers/ui/ui_manager';
import { StatsHandler } from 'offers/stats_handler';
import { CouponHandler } from 'offers/coupon_handler';
import OffersConfigs from 'offers/offers_configs';
import LoggingHandler from 'offers/logging_handler';
import { loadFileFromChrome } from 'offers/utils';
import { VoucherDetector } from 'offers/voucher_detector';
import ResourceLoader from 'core/resource-loader';

Components.utils.import('resource://gre/modules/Services.jsm');
// needed for the history
Components.utils.import('chrome://cliqzmodules/content/CliqzHistoryManager.jsm');


////////////////////////////////////////////////////////////////////////////////
// Consts
//
const MODULE_NAME = 'offer_manager';

////////////////////////////////////////////////////////////////////////////////


// TODO: remove this and the usage of this method
//
function check(expression, message) {
  if (!expression) {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.error(MODULE_NAME, message, LoggingHandler.ERR_INTERNAL);
  }
}

////////////////////////////////////////////////////////////////////////////////

function openNewTabAndSelect(url) {
  var currWindow = utils.getWindow();
  var gBrowser = currWindow.gBrowser;
  if (!currWindow || !gBrowser) {
    return false;
  }

  gBrowser.selectedTab = gBrowser.addTab(url);
  return true;
}

////////////////////////////////////////////////////////////////////////////////
function parseMappingsFileAsPromise(filename) {
  return new Promise(function(resolve, reject) {
    loadFileFromChrome([ 'offers', filename ]).then(jsonData => {
      let json = JSON.parse(jsonData);
      // now we parse the data and return this
      check(json['cid_to_cname'] !== undefined, 'cid_to_cname not defined');
      check(json['cname_to_cid'] !== undefined, 'cname_to_cid not defined');
      check(json['did_to_dname'] !== undefined, 'did_to_dname not defined');
      check(json['dname_to_did'] !== undefined, 'dname_to_did not defined');
      check(json['dname_to_cid'] !== undefined, 'dname_to_cid not defined');

      resolve(json);
    });
  });
}


////////////////////////////////////////////////////////////////////////////////
function parseFileASPromise(filename) {
  return new Promise(function(resolve, reject) {
    loadFileFromChrome([ 'offers', filename ]).then(jsonData => {
      let json = JSON.parse(jsonData);
      resolve(json);
    });
  });
}

////////////////////////////////////////////////////////////////////////////////
//
// @brief this method should load all the data of each cluster (the files)
//        to be used later.
//
function getClustersFilesMap() {
  // cluster_name -> {
  //    'domains_file' : filepath,
  //    'db_file' : filepath,
  //    'patterns_file' : filepath,
  // }
  //
  // for now we will hardcode this.
  var result = {};
  return result = {
    'food_delivery' : {
      'db_file' : 'food_delivery.dbinfo',
    },
    'travel' : {
      'db_file' : 'travel.dbinfo',
    },
    'gaming': {
      'db_file': 'gaming.dbinfo',
    },
    'wines' : {
      'db_file': 'wines.dbinfo',
    }
  };
}


////////////////////////////////////////////////////////////////////////////////
//
// @brief generate a list of databases from db_name to db instance (from a list of names)
//
function generateDBMap(dbsNamesList) {
  return new Promise(function(resolve, reject) {
    var result = {};
    for (let dbName of dbsNamesList) {
      switch (dbName) {
        case 'datetime_db':
          result[dbName] = new DateTimeDB();
          break;
        case 'domain_info_db':
          result[dbName] = new DomainInfoDB();
          break;
        case 'general_db':
          result[dbName] = new GeneralDB();
          break;
      }
    }
    resolve(result);
  });
}


////////////////////////////////////////////////////////////////////////////////
//
// @brief This class will be in charge of handling the offers and almost everything
//        else. This is the main class.
//
export function OfferManager() {
  // the mappings we will use
  this.mappings = null;
  // the intent detectors mapping (clusterID -> intent detector)
  this.intentDetectorsMap = {};
  // the intent input maps (clusterID -> intentInput)
  this.intentInputMap = {};
  this.offerFetcher = null;
  // the ui manager (we need to provide UI data for this)
  this.uiManager = new UIManager();
  this.uiManager.configureCallbacks({
    'show_coupon': this.checkButtonUICallback.bind(this),
    'not_interested': this.notInterestedUICallback.bind(this),
    'information': this.informationUICallback.bind(this),
    'extra_events': this.extraEventsUICallback.bind(this),
    'close_btn_clicked': this.onCloseBtnClickedUICallback.bind(this),
    'on_offer_shown': this.offerShownUICallback.bind(this),
    'on_offer_hide': this.offerHideUICallback.bind(this),
    'cp_to_clipboard': this.copyToClipboardUICallback.bind(this)
  });

  this.userDB = null;

  // create the stats handler
  this.statsHandler = new StatsHandler();

  // create the ID counter we will use to handle the offers, we need to be able
  // to identify each offer uniquely since we need to track them with these ids.
  this.offerIDCounter = 0;
  // this map will contain the list of offers and the given data for each offer
  this.currentOfferMap = {};
  // the clusterID -> offerID map.
  this.cidToOfferMap = {};
  // track the number of events of all the clusters and also the global num of events
  this.eventsCounts = {total: 0};
  // track shown offers
  this.offersShownCounterMap = {};
  // coupon handler
  this.couponHandler = null;
  // configs
  this.configs = null;
  // the checkout regex mapping
  this.checkoutRegexMap = null;


  // voucher detector
  this.voucherDetector = new VoucherDetector();

  // load checkout regex map
  this.loadCheckoutRegexMap();

  // the fetcher
  let destURL = OffersConfigs.OFFER_FETCHER_DEST_URL;
  let self = this;
  parseFileASPromise('configs.json').then(function(configs) {
    self.configs = configs;
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME,
                        'load the configs.json: ' + JSON.stringify(self.configs));
    parseMappingsFileAsPromise('mappings.json').then(function(mappings) {
      self.mappings = mappings;

      // create the subcluster information
      self.couponHandler = new CouponHandler(self.mappings);
      self.couponHandler.loadPersistentData();

      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.info(MODULE_NAME, 'setting the mappings to the offer manager');
      self.offerFetcher = new OfferFetcher(destURL, mappings);
    }).then(function() {
        // we will use the CliqzStorage here
        let localStorage = utils.getLocalStorage(OffersConfigs.USER_LOCAL_STORAGE_URL);
        let cache = localStorage.getItem('user_data');
        if (!cache) {
          // we need to write this then
          LoggingHandler.LOG_ENABLED &&
          LoggingHandler.info(MODULE_NAME, 'no db found, creating new one');
          let userDB = {};
          for (let cid in self.mappings['cid_to_cname']) {
            userDB[cid] = {};
          }
          localStorage.setItem('user_data', JSON.stringify(userDB));
          self.userDB = userDB;
        } else {
          LoggingHandler.LOG_ENABLED &&
          LoggingHandler.info(MODULE_NAME, 'db found, loading it: ' + cache);
          self.userDB = JSON.parse(cache);
        }

        // here we need to still create empty DB for new cluster we can have:
        for (let cid in self.mappings['cid_to_cname']) {
          if (self.userDB.hasOwnProperty(cid)) {
            continue;
          }
          // else we create it here
          self.userDB[cid] = {};
        }
    }).then(function() {
        LoggingHandler.LOG_ENABLED &&
        LoggingHandler.info(MODULE_NAME, 'load the clusters and create the');

        self.clusterFilesMap = getClustersFilesMap();
        LoggingHandler.LOG_ENABLED &&
        LoggingHandler.info(MODULE_NAME, 'self.clusterFilesMap: ' + JSON.stringify(self.clusterFilesMap));

        LoggingHandler.LOG_ENABLED &&
        LoggingHandler.info(MODULE_NAME, 'calling generateIntentsDetector');

        self.generateIntentsDetector(self.clusterFilesMap);

        // now here we need to check the history of the user so we can load the
        // old events and more
        self.loadHistoryEvents();
    });
  });

};

////////////////////////////////////////////////////////////////////////////////
//                        "PRIVATE" METHODS
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
//
// @brief load the checkoutRegexMap, if we have one already we use the latest one
//        if not we just load the default one
//
OfferManager.prototype.loadCheckoutRegexMap = function() {
  // check if we have one already in the local storage
  let localStorage = utils.getLocalStorage(OffersConfigs.CHECKOUT_REGEX_MAP_URL);
  // on debug we always load from the extension
  let cache = (OffersConfigs.DEBUG_MODE) ? null : localStorage.getItem('checkout_regex');
  if (!cache) {
    // we need to write this then
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'no checkout_regex localstorage found, reading the file');
    var self = this;
    parseFileASPromise('regex_maps.json').then(function(regexMap) {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.info(MODULE_NAME, 'checkout_regex loaded from default location: ' + JSON.stringify(regexMap));
      self.checkoutRegexMap = regexMap['checkouts'];

      // now save it in the local storage
      localStorage.setItem('checkout_regex', JSON.stringify(self.checkoutRegexMap));
    });
  } else {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'checkout_regex load it from localstorage ' + JSON.stringify(cache));
    this.checkoutRegexMap = JSON.parse(cache);
  }

  // fetch from the backend now
  this.getLatestRegularExpFromBE();
};

OfferManager.prototype.saveCheckoutRegexMap = function() {
  let localStorage = utils.getLocalStorage(OffersConfigs.CHECKOUT_REGEX_MAP_URL);
  if (localStorage && this.checkoutRegexMap) {
    localStorage.setItem('checkout_regex', JSON.stringify(this.checkoutRegexMap));
  }
};

////////////////////////////////////////////////////////////////////////////////
//
// @brief This method will get a object with the following kind of form
//      {
//        domain_name: [regex1, regex2, ...]
//      }
//  where we will set this into the mappings.json and we will save it for the
//  next time.
//

OfferManager.prototype.updateCheckoutRegex = function(regexDict) {

  LoggingHandler.LOG_ENABLED &&
  LoggingHandler.info(MODULE_NAME, 'updateCheckoutRegex!!');

  if (!regexDict || !regexDict['dname_to_checkout_regex']) {
    return;
  }

  // get the real map
  regexDict = regexDict['dname_to_checkout_regex'];

  if (!this.checkoutRegexMap) {
    // nothing to do
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'the checkout regex map is null!');
    return;
  }
  // get the map that contains the checkout regular expression
  if (!this.checkoutRegexMap['dname_to_checkout_regex']) {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.error(MODULE_NAME,
                         'No checkout map?',
                         LoggingHandler.ERR_INTERNAL);
    return;
  }

  // we need to remove the current list so we can do a full update
  this.checkoutRegexMap['dname_to_checkout_regex'] = {};
  const domMapChecker = this.mappings['dname_to_cid'];

  // get the list to be updated
  for (var domName in regexDict) {
    if (!regexDict.hasOwnProperty(domName)) {
      continue;
    }
    // we need to ensure that the domain is in the list of domains we can map
    // to avoid security issues
    if (!domMapChecker.hasOwnProperty(domName)) {
      // skip this one
      continue;
    }

    // else get the list and replace it
    this.checkoutRegexMap['dname_to_checkout_regex'][domName] = regexDict[domName];
  }

  // update the current file here
  this.saveCheckoutRegexMap();
};


////////////////////////////////////////////////////////////////////////////////
//
// @brief will fetch from the BE the latest information from the regular expressions
//        for the checkouts and the coupons_used
//
OfferManager.prototype.getLatestRegularExpFromBE = function() {
  // TODO:
  // here we should use the ResourceLoader and get it into a function that will
  // periodically (once per session?) fetch it and update the values: it will
  // call each function (updateCheckoutRegex, updateCouponDetectionRegex) and
  // before that will detect which is the current version on the BE to check
  // if we really need to update this or not.
  //
  var rscLoader = new ResourceLoader(['regex_remote_map'], {
      remoteURL: OffersConfigs.CHECKOUT_REGEX_MAP_REMOTE_URL,
      cron: OffersConfigs.CHECKOUT_REGEX_MAP_CRON_MS,
  });

  var self = this;
  rscLoader.onUpdate(function(regexMapData) {
    // The regex map data will look like:
    // {
    //   'checkouts':{...},
    //   'coupons_used': {...},
    // }
    if (!regexMapData) {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.error(MODULE_NAME,
                           'We couldnt fetch the file ' + OffersConfigs.CHECKOUT_REGEX_MAP_REMOTE_URL +
                           ' from backend properly',
                           LoggingHandler.ERR_BACKEND);
      return;
    }

    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME,
                         'regex_remote_map fetch from backend properly: ' +
                         OffersConfigs.CHECKOUT_REGEX_MAP_REMOTE_URL +
                         '. File data: \n' + JSON.stringify(regexMapData));

    // check if it is valid data
    var checkoutData = regexMapData.checkouts;
    var couponsUsed = regexMapData.coupons_used;

    if (checkoutData) {
      self.updateCheckoutRegex(checkoutData);
    } else {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.error(MODULE_NAME,
                           'The file fetched from the backend: ' + OffersConfigs.CHECKOUT_REGEX_MAP_REMOTE_URL +
                           ' doesnt contains the checkouts field',
                           LoggingHandler.ERR_BACKEND);
    }

    if (couponsUsed) {
      if (self.voucherDetector) {
        self.voucherDetector.updateCurrentRegEx(couponsUsed);
        self.voucherDetector.saveCurrentRegEx();
      }
    } else {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.error(MODULE_NAME,
                           'The file fetched from the backend: ' + OffersConfigs.CHECKOUT_REGEX_MAP_REMOTE_URL +
                           ' doesnt contains the coupons_used field',
                           LoggingHandler.ERR_BACKEND);
    }

  });

  rscLoader.updateFromRemote();
};


////////////////////////////////////////////////////////////////////////////////
//
// @brief This method will read the history of the user and will feed the intent
//        input with the events
//
OfferManager.prototype.loadHistoryEvents = function() {
  if (!OffersConfigs.LOAD_HISTORY_EVENTS) {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'skipping the LOAD_HISTORY_EVENTS since flag is false');
    return;
  }

  // here we need to get all the visits (moz_historyvisits) in the last N days
  // and join them with the moz_places table to get the urls.
  //
  // \ref: http://softholmsyndrome.com/2014/10/27/places-sqlite.html
  // CREATE INDEX moz_historyvisits_placedateindex ON moz_historyvisits (place_id, visit_date);
  // CREATE UNIQUE INDEX moz_places_url_uniqueindex ON moz_places (url);
  //
  // the SQL should look something like this:
  // SELECT url, visit_date FROM moz_historyvisits INNER JOIN moz_places ON
  //  moz_historyvisits.place_id = moz_places.id WHERE visit_date > "1466499090175383"
  //  ORDER BY visit_date ASC;
  //

  var self = this;

  // calculate the delta time to fetch the data from
  const currentTs = Date.now();
  const absoluteTimestamp = (currentTs -
    (OffersConfigs.HISTORY_EVENTS_TIME_DAYS * OffersConfigs.DAY * 1000)) * 1000;

  const sqlQuery = 'SELECT url, visit_date FROM moz_historyvisits INNER JOIN moz_places ON ' +
                   'moz_historyvisits.place_id = moz_places.id WHERE visit_date > ' +
                   absoluteTimestamp + ' ORDER BY visit_date ASC;';

  LoggingHandler.LOG_ENABLED &&
  LoggingHandler.info(MODULE_NAME, 'loading the history events now with query: ' + sqlQuery);
  // execute the query now
  let eventCounts = 0;
  CliqzHistoryManager.PlacesInterestsStorage._execute(sqlQuery,
                                                      ['url', 'visit_date'],
                                                      function(result) {
      var urlObj = utils.getDetailsFromUrl(result.url);
      const timestamp = Number(result.visit_date) / 1000; // convert microseconds to ms
      self.feedWithHistoryEvent(urlObj, timestamp);
      eventCounts += 1;
    },
    null
    ).then(function() {
      // nothing to do
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.info(MODULE_NAME,
                         'finishing feeding from history. Number of events: ' + eventCounts);
    }
  );
};


////////////////////////////////////////////////////////////////////////////////
//
// @brief this method will generate the intent detection system with the current
//        data we have. It will load all the intent detector and also generate
//        the map from cluster_id -> intent_detector.
//        we will also generate the cluster_id -> intentInput
//
OfferManager.prototype.generateIntentsDetector = function(clusterFilesMap) {
  let self = this;
  check(this.mappings != null, 'mappings is not properly initialized');



  var rulesBuilder = new RulesBuilder();
  var fidsBuilder = new FIDsBuilder();

  for (var clusterName in clusterFilesMap) {
    // get the given cluster ID from the name.
    let clusterID = this.mappings['cname_to_cid'][clusterName];
    if (typeof clusterID === 'undefined') {
      LoggingHandler.info(MODULE_NAME, 'cluster with name ' + clusterName + ' was not found');
      continue;
    }

    // init the this.eventsCounts to 0
    this.eventsCounts[clusterID] = 0;

    var sessionThresholdTimeSecs = OffersConfigs.INTENT_SESSION_THRESHOLD_SECS;
    var buyIntentThresholdSecs = OffersConfigs.BUY_INTENT_SESSION_THRESHOLD_SECS;

    // we check the here if we have a configuration for the current cluster
    if (this.configs &&
        this.configs.cluster_thresholds &&
        this.configs.cluster_thresholds.hasOwnProperty(clusterID)) {
      // we will use the specific config for this
      let thresholdConfig = this.configs.cluster_thresholds[clusterID];
      if (thresholdConfig.hasOwnProperty('session_time_secs')) {
        sessionThresholdTimeSecs = thresholdConfig['session_time_secs'];
      }
      if (thresholdConfig.hasOwnProperty('buy_intent_secs')) {
        buyIntentThresholdSecs = thresholdConfig['buy_intent_secs'];
      }
    }

    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME,
                        'using threshold values for cluster ' + clusterID +
                        '\n - sessionThresholdTimeSecs: ' + sessionThresholdTimeSecs +
                        '\n - buyIntentThresholdSecs: ' + buyIntentThresholdSecs);

    // // generate the intent input
    this.intentInputMap[clusterID] = new IntentInput(sessionThresholdTimeSecs,
                                                     buyIntentThresholdSecs,
                                                     clusterID,
                                                     this.intentLifeCycleStarted.bind(this));

    // we need to build the current cluster system.
    let dbFilePath = clusterFilesMap[clusterName]['db_file'];

    check(dbFilePath !== undefined, 'dbFilePath is undefined?');

    // we need to read the db file and the rule file and then we are able
    // to fully build the intentDetector for this particular cluster.

    var dbFilePromise = new Promise(function(resolve, reject) {
      // read the resource
      loadFileFromChrome(['offers/clusters', dbFilePath]).then(
        jsonData => {
          let json = JSON.parse(jsonData);
          resolve(json);
        });
    });

    // get all the data and then construct the intent detector and push it into
    // the map
    let dbInstancesMap = null;
    let dbsJson = null;
    Promise.all([dbFilePromise]).then(function(results) {
      // we need now to build the intent detector
      dbsJson = results[0];
      let dbsNames = Object.keys(dbsJson); // extract keys from json object
      return generateDBMap(dbsNames);
    }).then(function(dbInstancesMapResult) {
      dbInstancesMap = dbInstancesMapResult;
      //add cluster related section of userDB to instacen
      dbInstancesMap['user_db'] = self.userDB[clusterID];

      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.info(MODULE_NAME, 'dbInstancesMap' + JSON.stringify(dbInstancesMap, null, 4));
      return;
    }).then(function() {
      let intentDetector =  new IntentDetector(clusterID, self.mappings, dbInstancesMap);
      // try to load everything now
      try {
        intentDetector.loadDataBases(dbsJson);
        intentDetector.loadRule(rulesBuilder, fidsBuilder);
        self.intentDetectorsMap[clusterID] = intentDetector;
      } catch (e) {
        LoggingHandler.LOG_ENABLED &&
        LoggingHandler.error(MODULE_NAME,
                             'something happened when configuring the intent ' +
                             'detector for cluster ' + clusterName +
                             '. Error: ' + e,
                             LoggingHandler.ERR_INTERNAL);
      }
    }).catch(function(errMsg) {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.error(MODULE_NAME,
                           'Some error happened when reading and parsing the ' +
                           '. Error: ' + errMsg,
                           'files for the cluster ' + clusterName +
                           LoggingHandler.ERR_JSON_PARSE);
    });
  }


};

////////////////////////////////////////////////////////////////////////////////
//
// @brief save all the current data that should persist on disk
//
OfferManager.prototype.savePersistentData = function() {
  if (this.statsHandler) {
    this.statsHandler.savePersistentData();
  }
  // save userdb
  if(this.userDB) {
    let localStorage = utils.getLocalStorage(OffersConfigs.USER_LOCAL_STORAGE_URL);
    localStorage.setItem('user_data', JSON.stringify(this.userDB));
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'Saving data into local storage');
  }

  if (this.couponHandler) {
    this.couponHandler.savePersistentData();
  }

};


////////////////////////////////////////////////////////////////////////////////
//
// @brief Unload all the class
//
OfferManager.prototype.destroy = function() {
  if (this.statsHandler) {
    this.statsHandler.destroy();
  }

};


////////////////////////////////////////////////////////////////////////////////
//
// @brief this method will format an event into the struct we need to call the
//        intent input.
//        will return null if the event is not related with any cluster.
// @note check the intent input to see which is the expected format
//
OfferManager.prototype.formatEvent = function(urlObj, aTimestamp) {
  if (!this.mappings) {
    return null;
  }

  // we need to detect if we are in a domain of some cluster.
  const domainName = urlObj['name'];
  const domainID = this.mappings['dname_to_did'][domainName];
  if (!domainID) {
    // skip this one
    return null;
  }

  const fullURL = urlObj['domain'] + urlObj['path'];
  // This is how the other modules at cliqz does it
  const timestamp = aTimestamp;
  // check if we are in a checkout page?
  const checkoutFlag = this.isCheckoutPage(domainName, fullURL);
  // TODO_QUESTION: how to get the last url?
  const lastURL = '';
  const referrerURL = urlObj.referrer;

  // for now we don't have anything here
  const eventType = null;

  // full event info:
  //
  // 'event_type'
  // 'full_url'
  // 'ts'
  // 'domain_id'
  // 'checkout_flag'
  // 'last_url'
  // 'referrer_url
  // 'extra'

  return {
    'event_type' : eventType,
    'full_url' : fullURL,
    'ts' : timestamp,
    'domain_id' : domainID,
    'checkout_flag' : checkoutFlag,
    'last_url' : lastURL,
    'referrer_url' : referrerURL,
    'extra' : null
  };
};

////////////////////////////////////////////////////////////////////////////////
//
// @brief This method will check if we need to evaluate the intent system for
//        a particular cluster / event.
// @return true if we should | false otherwise
//
OfferManager.prototype.shouldEvaluateEvent = function(clusterID, event) {
  // TODO: implement this logic here
  return (clusterID >= 0) ? true : false;
};

////////////////////////////////////////////////////////////////////////////////

//
// @brief this method will be called when the system detects a new offer and
//        we need to track it with the given coupon.
// @param coupon is the coupon object that will be modified and added the offer_id
//        and maintain all the fields
// @return the new offer created (couponInfo + offer_id)
//
OfferManager.prototype.createAndTrackNewOffer = function(coupon, timestamp, clusterID, domainID) {
  // for simplicity we will also get the domain ID (if any) from the coupon redirect_url
  // so we can simply later check if we are in the current domain or not when
  // showing the add
  var redirectUrl = utils.getDetailsFromUrl(coupon.redirect_url);
  const redirectDomID = this.mappings['dname_to_did'][redirectUrl.name];

  // generate a new offer with a new id
  const offerID = this.offerIDCounter++;
  var offer = {
    voucher_data: coupon,
    offer_id: offerID,
    appear_on_did: domainID,
    appear_on_cid: clusterID,
    active: true,
    redirect_url_did: (redirectDomID === undefined) ? -1 : redirectDomID
  };

  // add to the maps
  this.currentOfferMap[offerID] = offer;
  this.cidToOfferMap[clusterID] = offerID;

  // notify the stats handler
  if (this.statsHandler) {
    this.statsHandler.offerCreated(clusterID);
    // notify the telemetry now with the A|B flags
    const voucherShownOnSameDomain = (coupon.domain_id === domainID);
    if (voucherShownOnSameDomain) {
      this.statsHandler.offerOnSameDomain(clusterID);
    }
    if (coupon.hasOwnProperty('subcluster_tag')) {
      this.statsHandler.offerShownOnSubcluster(clusterID, coupon.subcluster_tag);
    }
  }

  // Every time we show a offer add it to this maps. It will help us track
  // is our coupon where used or not
  let couponCode = coupon.code.toLowerCase();
  if(this.offersShownCounterMap.hasOwnProperty(couponCode)) {
    this.offersShownCounterMap[couponCode] += 1;
  } else {
    this.offersShownCounterMap[couponCode] = 1;
  }
  LoggingHandler.LOG_ENABLED &&
  LoggingHandler.info(MODULE_NAME,
                     'offersShownCounterMap content: ' + JSON.stringify(this.offersShownCounterMap));

  // set the timeout to disable this add
  offer.timerID = utils.setTimeout(function () {
    // check if we are showing the add, if not we just remove it
    this.removeAndUntrackOffer(offerID, true);
  }.bind(this), OffersConfigs.HIDE_OFFER_MS);

  return offer;
};

//
// @brief removes a particular offer with a given id
//
OfferManager.prototype.removeAndUntrackOffer = function(offerID, fromTimeout = false) {
  // - search for the offer on the maps and remove it
  // - disable the disabler timer
  LoggingHandler.LOG_ENABLED &&
  LoggingHandler.info(MODULE_NAME, 'removing and untracking offer with ID: ' + offerID);

  var offer = this.currentOfferMap[offerID];
  if (!offer) {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'offer no longer valid with id: ' + offerID);
    return;
  }

  // make the offer inactive
  offer.active = false;

  // disable the timeout
  utils.clearTimeout(offer.timerID);

  const clusterID = offer.appear_on_cid;

  if (fromTimeout) {
    this.couponHandler.markCouponAsClosedBySystem(offer.voucher_data, Date.now());
  }

  // remove it from the UI if we are showing it
  if (this.uiManager.isOfferForClusterShownInCurrentWindow(clusterID)) {
    this.uiManager.hideOfferOfClusterFromCurrentWindow(clusterID);
  }

  if (this.cidToOfferMap[clusterID] === undefined) {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.error(MODULE_NAME,
                         'ERROR: we couldnt find the offer for cluster ID: ' + clusterID,
                         LoggingHandler.ERR_INTERNAL);
  } else {
    delete this.cidToOfferMap[clusterID];
  }

  delete this.currentOfferMap[offerID];
};


////////////////////////////////////////////////////////////////////////////////
//
// @brief flag is the user is on a checkout page
//
OfferManager.prototype.isCheckoutPage = function(domainName, fullUrl) {
  if (this.checkoutRegexMap) {
    // GR-191: we now support multiple regex per domain for the checkout
    //
    let regexForDomainList = this.checkoutRegexMap['dname_to_checkout_regex'][domainName];
    if (regexForDomainList && regexForDomainList.length > 0) {
      const regexSize = regexForDomainList.length;
      for (var i = 0; i < regexSize; ++i) {
        if (regexForDomainList[i] && fullUrl.match(regexForDomainList[i])) {
          return true;
        }
      }
    }
  }

  return false;
};


////////////////////////////////////////////////////////////////////////////////
//
// @brief this method will show (if needed) an offer for this particular cluster
//        If we need to show it then we will do it here
//
OfferManager.prototype.showOfferIfNeeded = function(clusterID, domainID) {
  // we check if we have an offer for this particular cluster
  const offerID = this.cidToOfferMap[clusterID];
  if (offerID === undefined) {
    // nothing related with this cluster
    // TODO: here still could be the case that we are showing and old
    // ad and we need to close it... if the ui has an offer from this cluster
    // but we don't have any => hide it.
    // remove it from the UI if we are showing it
    if (this.uiManager.isOfferForClusterShownInCurrentWindow(clusterID)) {
      this.uiManager.hideOfferOfClusterFromCurrentWindow(clusterID);
    }
    return;
  }

  // we have an offer, check if we are showing this one in particular
  const offer = this.currentOfferMap[offerID];
  if (!offer) {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.error(MODULE_NAME,
                         'This cannot happen here... there is inconsistent data',
                         LoggingHandler.ERR_INTERNAL);
    return;
  }

  // we show the offer now in this tab if it is not being shown already
  if (this.uiManager.isOfferForClusterShownInCurrentWindow(clusterID)) {
    // nothing to do
    return;
  }

  // nasty hack here to check if we need to void showing the offer in the given domain
  // this is only for ffxiv-freetrial domain
  const filterGoToOffer = offer.redirect_url_did === domainID;
  const filterShowOffer = (this.mappings['dname_to_did']['ffxiv-freetrial'] === domainID);

  // else we need to show the current offer in this window
  this.uiManager.showOfferInCurrentWindow(offer, filterGoToOffer, filterShowOffer);
};



////////////////////////////////////////////////////////////////////////////////
//                          PUBLIC INTERFACE
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
//
// @brief This method will get events from the history and will fill in the
//        intent input systems if we have. This way we can have real longer
//        sessions
//
OfferManager.prototype.feedWithHistoryEvent = function(urlObject, timestamp) {
  // - parse the url and format the event.
  // - check if the event belongs to any cluster we are tracking
  // - check if we have an intent system
  // - feed it with the event.
  // - update the events counters...

  var event = this.formatEvent(urlObject, timestamp);
  if (!event) {
    // we skip this event.
    return;
  }

  // get the associated cluster
  const domainName = this.mappings['did_to_dname'][event['domain_id']];
  const clusterID = this.mappings['dname_to_cid'][domainName];
  const domainID = event['domain_id'];
  if (!clusterID || clusterID < 0) {
    // this cannot happen since we got a valid domainID from the mappings but
    // we don't have the given cluster ID in the mappings? this is not gut
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.error(MODULE_NAME,
                         'Invalid cluster id!: ' + domainName,
                         LoggingHandler.ERR_INTERNAL);
    return;
  }

  // count the number of visits
  this.eventsCounts.total += 1;
  this.eventsCounts[clusterID] += 1;

  // get the associated intent system
  let intentInput = this.intentInputMap[clusterID];
  if (!intentInput) {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.warning(MODULE_NAME,
                           'WARNING: we still dont have a intent system for ' +
                           'cluster ID: ' + clusterID,
                           LoggingHandler.ERR_INTERNAL);
    return;
  }

  // feed with the event
  intentInput.feedWithHistoryEvent(event);
};

////////////////////////////////////////////////////////////////////////////////
//
// @brief This method should be called everytime the tab of the browser has
//        changed or the window itself. This method will be used mainly
//        to remove all the offers that are not longer valid in the tabs.
//        (nasty but temporary).
//
OfferManager.prototype.onTabOrWinChanged = function(currUrl) {
  if (!this.mappings || !currUrl || !currUrl.name) {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.warning(MODULE_NAME, 'onTabOrWinChanged: null something');
    // nothing to do
    return;
  }

  // get the cluster ID if we have one
  const domainID = this.mappings['dname_to_did'][currUrl.name];
  if (!domainID) {
    return;
  }
  const clusterID = this.mappings['dname_to_cid'][currUrl.name];

  // now we need to check if we have to show or not the
  this.showOfferIfNeeded(clusterID, domainID);
};


////////////////////////////////////////////////////////////////////////////////
//
// @brief this method will evaluate a new event from the user.
//        Here we will get a specific value for the given event and we should do
//        all the logic of showing a coupong if our system detects a coupon or not.
//
OfferManager.prototype.processNewEvent = function(urlObject) {
  LoggingHandler.LOG_ENABLED &&
  LoggingHandler.info(MODULE_NAME, 'processNewEvent');
  // here we need to:
  // 1) parse the url information and format it in a way that the intent intput
  //    can handle
  // 2) check if we are in a cluster or not and if we are then we evaluate the
  //    intention value.
  // 3) feed the intent input from the given cluster.
  // 4) Filter by any logic if we need or want to show an ad for this cluster
  //    or not (external checker / filter).
  // 5) If we don't need to filter then we evaluate the intent detector system
  //    and check if we have or not an intention
  // 6) if we have an intention -> get a coupon from the backend.
  // 7) Select the "best" coupon (first one, or whatever).
  // 8) execute the UIManager to show a coupon to the user.
  // 9) Activate tracking system to see if the user clicked or not in a link so
  //    we can identify and detect the coupon field to verify if the user
  //    used it or not.

  // (1) & (2)
  var event = this.formatEvent(urlObject, Date.now());
  LoggingHandler.LOG_ENABLED &&
  LoggingHandler.info(MODULE_NAME, 'event' + JSON.stringify(event, null, 4));
  if (!event) {
    // we skip this event.
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'skipping event has domain relevant');
    return;
  }

  // get the associated cluster
  const domainName = this.mappings['did_to_dname'][event['domain_id']];
  const clusterID = this.mappings['dname_to_cid'][domainName];
  const domainID = event['domain_id'];
  if (!clusterID || clusterID < 0) {
    // this cannot happen since we got a valid domainID from the mappings but
    // we don't have the given cluster ID in the mappings? this is not gut
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.error(MODULE_NAME,
                         'Invalid cluster id!: ' + domainName,
                         LoggingHandler.ERR_INTERNAL);
    return;
  }

  // track in the stats
  if (this.statsHandler) {
    this.statsHandler.userVisitedCluster(clusterID);
  }

  // count the number of visits
  this.eventsCounts.total += 1;
  this.eventsCounts[clusterID] += 1;

  // check if we need to show something in this cluster
  // the following line is commented
  //    this.showOfferIfNeeded(clusterID, domainID);
  // because of TODO: GR-137 && GR-140: temporary fix. now we track this in other
  // method

  // get the associated intent system
  let intentSystem = this.intentDetectorsMap[clusterID];
  let intentInput = this.intentInputMap[clusterID];
  if (!intentSystem || !intentInput) {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.error(MODULE_NAME,
                       'we still dont have a intent system for cluster ID: ' + clusterID);
    return;
  }

  // (3)
  intentInput.feedWithEvent(event);

  // (4)
  if (!this.shouldEvaluateEvent(clusterID, event)) {
    // skip it
    return;
  }

  // here we check if there is a new bought or not, we will only send one signal
  // per buying activity
  if (intentInput.currentBuyIntentSession().checkoutsCount() === 1) {
    if (this.statsHandler) {
      this.statsHandler.userProbablyBought(domainID, clusterID);

      // GR-154: we will add the the flag for last_checkout detected
      if (this.userDB && this.userDB[clusterID]) {
        this.userDB[clusterID]['last_checkout'] = event.ts;
      }
    }
  }

  // (5)
  const intentValue = intentSystem.evaluateInput(intentInput);
  LoggingHandler.LOG_ENABLED &&
  LoggingHandler.info(MODULE_NAME, 'intentValue: ' + intentValue);

  // (6)
  const thereIsAnIntention = intentValue >= 1.0;
  if (!thereIsAnIntention) {
    // nothing to do, we skip this
    return;
  }

  // we detect an intention, we track this now
  if (this.statsHandler) {
    this.statsHandler.systemIntentionDetected(domainID, clusterID);
  }

  // check if we have an offer already for this particular cluster, in that case
  // we don't show any other one since we can only show one per cluster
  if (this.cidToOfferMap[clusterID] !== undefined) {
    // skip this particular one
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME,
                       'we already have an offer for clusterID: ' + clusterID +
                       ' so we dont show another one');
    return;
  }

  // we have an intention so we need to get the coupons from the fetcher
  if (!this.offerFetcher) {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.warning(MODULE_NAME,
                           'We dont have still the offerFetcher, we then skip this event?',
                           LoggingHandler.ERR_INTERNAL);
    return;
  }

  var self = this;
  this.offerFetcher.checkForCouponsByCluster(clusterID, function(vouchers) {
    if (!vouchers) {
      // nothing to do.
      return;
    }
    // (7)
    // else get the best coupon for this
    var bestCoupon = self.couponHandler.selectBestCoupon(domainID, clusterID, vouchers);
    if (!bestCoupon) {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.warning(MODULE_NAME,
                             'we dont have vouchers for this particular cluser ' +
                             'ID: ' + clusterID,
                             LoggingHandler.ERR_INTERNAL);
      return;
    }

    // (9) we need to track it on the callback of the button since the user
    //     can cancel the coupon -> we don't care about it.

    // create and track this new offer now, and show it in the UI
    const timestamp = Date.now();
    var offer = self.createAndTrackNewOffer(bestCoupon, timestamp, clusterID, domainID);
    if (!offer) {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.error(MODULE_NAME,
                           'we couldnt create the offer?? for clusterID: ' + clusterID,
                           LoggingHandler.ERR_INTERNAL);
      return;
    }

    // track the coupon
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'offer created properly calling the trackCoupon');
    self.couponHandler.trackNewCoupon(bestCoupon);
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'trackCoupon proper called');

    // nasty hack here to check if we need to void showing the offer in the given domain
    // this is only for ffxiv-freetrial domain
    const filterGoToOffer = offer.redirect_url_did === domainID;
    const filterShowOffer = (self.mappings['dname_to_did']['ffxiv-freetrial'] === domainID);

    // else we need to show the current offer in this window
    self.uiManager.showOfferInCurrentWindow(offer, filterGoToOffer, filterShowOffer);
  });


};


////////////////////////////////////////////////////////////////////////////////
//
// @brief this method will be called everytime we detect that a coupon
//        was used on the page (This is done using content-scripts). This method
//        should then check if the coupon used was one we provided or not
//
OfferManager.prototype.addCouponAsUsedStats = function(domain, aCoupon, isDownload) {
  aCoupon = aCoupon.toLowerCase();
  const cid = this.mappings['dname_to_cid'][domain];
  if((this.offersShownCounterMap.hasOwnProperty(aCoupon) && this.offersShownCounterMap[aCoupon] > 0) ||
     (isDownload)) {
    // nasty fix here to distinguish between voucher and download offer
    var coupon = aCoupon;
    const offerID = this.cidToOfferMap[cid];
    const offer = (offerID) ? this.currentOfferMap[offerID] : null;

    if (isDownload) {
      // we need to replace the coupon
      coupon = offer ? offer.voucher_data.code : null;
    }

    if (coupon) {
      this.offersShownCounterMap[coupon] -= 1;
    }

    this.statsHandler.couponUsed(cid);

    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME,
                       'Our coupon used :\t cid: ' + cid +  ' \t domain: ' +
                       domain + ' \tcoupon: ' + coupon);

    // mark the current coupon as used
    if (offer) {
      this.couponHandler.markCouponAsUsed(offer.voucher_data, Date.now());
    }
  } else {
    this.statsHandler.externalCouponUsed(cid);
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME,
                       'Unrecognized coupon used :\t cid: ' + cid  +
                       ' \t domain: ' + domain + ' \tcoupon: ' + aCoupon);
  }

    // at any case we need to mark the current intent as over since the user used
    // a coupon
    var intentInput = this.intentInputMap[cid];
    if (intentInput) {
      intentInput.flagCurrentBuyIntentSessionAsDone();
    }
};


////////////////////////////////////////////////////////////////////////////////
//                          CALLBACKS FROM THE UI
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
//
// @brief when the user press on the "check coupon or view coupon"
//
OfferManager.prototype.checkButtonUICallback = function(offerID) {
  LoggingHandler.LOG_ENABLED &&
  LoggingHandler.info(MODULE_NAME, 'checkButtonUICallback');

  const offer = this.currentOfferMap[offerID];
  if (!offer) {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.error(MODULE_NAME,
                         'there is no related offer with id ' + offerID,
                         LoggingHandler.ERR_INTERNAL);
    return;
  }

  // track the signal
  if (this.statsHandler) {
    this.statsHandler.couponClicked(offer.appear_on_cid);
  }

  // we will remove the timer here so the person can see the offer until he
  // close it
  utils.clearTimeout(offer.timerID);

  // we will get the url to redirect from the coupon here
  const urlToGo = offer.voucher_data.redirect_url;
  if (!urlToGo) {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.error(MODULE_NAME,
                         'No redirect_url found in the voucher/coupon?',
                         LoggingHandler.ERR_INTERNAL);
    // close the offer
    return false;
  }

  // redirect to there
  openNewTabAndSelect(urlToGo);

  return true;
};

////////////////////////////////////////////////////////////////////////////////
//
// @brief when the user press on the "not interested coupon callback"
//
OfferManager.prototype.notInterestedUICallback = function(offerID) {
  LoggingHandler.LOG_ENABLED &&
  LoggingHandler.info(MODULE_NAME, 'notInterestedUICallback');

  // if the user explicetly says it doesnt want to see the add anymore then
  // we will close it here and everywhere
  //
  const offer = this.currentOfferMap[offerID];

  // if user closed this then we should stop tracking this add
  if (offer) {
    // track the stats
    if (this.statsHandler) {
      this.statsHandler.couponRejected(offer.appear_on_cid);
    }

    // track it
    this.couponHandler.markCouponAsRejected(offer.voucher_data, Date.now());

    // remove the offer
    this.removeAndUntrackOffer(offer.offer_id);
  }

};

////////////////////////////////////////////////////////////////////////////////
//
// @brief when the user press on the "information"
//
OfferManager.prototype.informationUICallback = function(offerID) {
  LoggingHandler.LOG_ENABLED &&
  LoggingHandler.info(MODULE_NAME, 'informationUICallback');

  const offer = this.currentOfferMap[offerID];
  if (offer) {
    // track the stats
    if (this.statsHandler) {
      this.statsHandler.showMoreInfoClicked(offer.appear_on_cid);
    }
  }

  // avoid closing the notification
  openNewTabAndSelect(OffersConfigs.OFFER_INFORMATION_URL);
  return true;
};

////////////////////////////////////////////////////////////////////////////////
//
// @brief any other type of events from the bar
// @note https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XUL/Method/appendNotification#Notification_box_events
//
OfferManager.prototype.extraEventsUICallback = function(reason, offerID) {
  LoggingHandler.LOG_ENABLED &&
  LoggingHandler.info(MODULE_NAME, 'extraEventsUICallback: ' + reason);

  if (reason === 'removed') {
    const offer = this.currentOfferMap[offerID];
    if (!offer) {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.error(MODULE_NAME,
                           'The offer is not valid with ID: ', offerID,
                           LoggingHandler.ERR_INTERNAL);
      return;
    }
    // track stats
    if (this.statsHandler) {
        this.statsHandler.advertiseClosed(offer.appear_on_cid);
    }
  }
  return true;
};

////////////////////////////////////////////////////////////////////////////////
//
// @brief when the close button is clicked
//
OfferManager.prototype.onCloseBtnClickedUICallback = function(offerID) {
  LoggingHandler.LOG_ENABLED &&
  LoggingHandler.info(MODULE_NAME, 'onCloseBtnClickedUICallback');

  const offer = this.currentOfferMap[offerID];
  if (!offer) {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.error(MODULE_NAME,
                        'Missing offer?? this is not possible: ' + offerID);
    return;
  }

  // track stats
  if (this.statsHandler) {
    this.statsHandler.advertiseClosedByUser(offer.appear_on_cid);
  }

  this.couponHandler.markCouponAsClosedByUser(offer.voucher_data, Date.now());

  // remove the offer
  this.removeAndUntrackOffer(offer.offer_id);
  return true;
};


////////////////////////////////////////////////////////////////////////////////
//
// @brief when the user press on the code to copy it to the clipboard
//
OfferManager.prototype.copyToClipboardUICallback = function(offerID) {
  LoggingHandler.LOG_ENABLED &&
  LoggingHandler.info(MODULE_NAME, 'copyToClipboardUICallback');
  const offer = this.currentOfferMap[offerID];
  if (!offer) {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.error(MODULE_NAME,
                         'We are missing the offer that we just clicked?: ' + offerID);
    return;
  }

  const clusterID = offer['appear_on_cid'];
  // track this into stats (telemetry later)
  if (this.statsHandler) {
    this.statsHandler.copyToClipboardClicked(clusterID);
  }
};


////////////////////////////////////////////////////////////////////////////////
//
// @brief when an offer is shown
//
OfferManager.prototype.offerShownUICallback = function(offerID, templateType) {
  LoggingHandler.LOG_ENABLED &&
  LoggingHandler.info(MODULE_NAME, 'offerShownUICallback');
  if (!this.userDB) {
    return;
  }

  const offer = this.currentOfferMap[offerID];
  if (!offer) {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.error(MODULE_NAME,
                         'We are showing and offer that we dont have?: ' + offerID,
                         LoggingHandler.ERR_INTERNAL);
    return;
  }

  // get the needed fields
  const clusterID = offer['appear_on_cid'];
  const timestamp = Date.now();

  LoggingHandler.LOG_ENABLED &&
  LoggingHandler.info(MODULE_NAME, 'offerShownUICallback: clusterID: ' + clusterID);

  // for now we will only add the last ad shown for a given cid and timestamp
  this.userDB[clusterID]['last_ad_shown'] = timestamp;

  // track this into stats (telemetry later)
  if (this.statsHandler) {
    this.statsHandler.advertiseDisplayed(clusterID, templateType);
  }

  // mark the coupon as shown
  if (this.couponHandler) {
    this.couponHandler.markCouponAsShown(offer.voucher_data, timestamp);
  }
};


////////////////////////////////////////////////////////////////////////////////
//
// @brief when an offer is hiden
//
OfferManager.prototype.offerHideUICallback = function(offerID) {
  // we are getting this event already on the extraEventsUICallback...
};


////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

//
// @brief when a new intent lifecycle starts we get a callback here
//
OfferManager.prototype.intentLifeCycleStarted = function(clusterID) {
  if (this.statsHandler) {
    this.statsHandler.newIntentLifeCycleStarted(clusterID);
  }
};

//
// @brief get called before a request is made
//
OfferManager.prototype.beforeRequestListener = function(requestObj) {
  if (!this.voucherDetector) {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.error(MODULE_NAME,
                         'no voucher detector object available',
                         LoggingHandler.ERR_INTERNAL);
    return;
  }
  let response = this.voucherDetector.processRequest(requestObj);
  if (response) {
    // another huge hacky here, this should be refactor ASAAAAAPPPPPPPP
    var domain = response['domain'];
    if (domain === 'bdi-services') {
      domain = 'ffxiv-freetrial';
    }
    this.addCouponAsUsedStats(domain, response['code'], response['is_download'] === true);
  }
};

