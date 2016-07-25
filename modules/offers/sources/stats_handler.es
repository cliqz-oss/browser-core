import { utils } from 'core/cliqz';
import OffersConfigs from 'offers/offers_configs';
import LoggingHandler from 'offers/logging_handler';



////////////////////////////////////////////////////////////////////////////////
// Consts

const MODULE_NAME = 'stats_handler';

////////////////////////////////////////////////////////////////////////////////

function generateOrAddField(d, f1, f2, val) {
  if (!d[f1]) {
    d[f1] = {};
  }
  if (!d[f1][f2]) {
    d[f1][f2] = val;
  } else {
    d[f1][f2] += val;
  }
}

////////////////////////////////////////////////////////////////////////////////
export class StatsHandler {

  constructor() {
    this.dataDirty = true;
    this.currentData = {
      'data' : {},
      'last_ts_sent' : Date.now()
    };

    // we will use the CliqzStorage here
    var localStorage = CLIQZEnvironment.getLocalStorage(OffersConfigs.STATS_LOCAL_STORAGE_URL);
    var cache = localStorage.getItem('stats_data');
    if (!cache) {
      // we need to write this then
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.info(MODULE_NAME, 'no db found, creating new one');

      this.generateNewDataStructure();
      this.savePersistentData();
    } else {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.info(MODULE_NAME, 'db found, loading it: ' + cache);

      // we have data, load it
      this.currentData = JSON.parse(cache);
      this.dataDirty = true;
      if (this.shouldWeNeedToSendCurrenData()) {
        LoggingHandler.LOG_ENABLED &&
        LoggingHandler.info(MODULE_NAME,
                           'after loading it pass more than N ' +
                           'seconds so we will send it now');
        if (this.sendOverTelemetry()) {
          this.generateNewDataStructure();
          // reset the current data in the database to avoid inconsistences
          this.savePersistentData();
        }
      }
    }

    // TODO: here we can re-set properly the timer but we will just set it
    // to the time specified above
    this.interval = utils.setInterval(function () {
      // we will check if we need to send the data and we will send it and
      // reset all the counters if needed
      if (this.shouldWeNeedToSendCurrenData()) {
        if (this.sendOverTelemetry()) {
          // reset only if we are able to send it over telemetry
          this.generateNewDataStructure();
          this.savePersistentData();
        }
      }
    }.bind(this), OffersConfigs.STATS_SENT_PERIODISITY_MS);
  }


  //////////////////////////////////////////////////////////////////////////////
  savePersistentData() {
    if (!this.dataDirty) {
      return;
    }
    var localStorage = CLIQZEnvironment.getLocalStorage(OffersConfigs.STATS_LOCAL_STORAGE_URL);
    localStorage.setItem('stats_data', JSON.stringify(this.currentData));
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'Saving data into local storage');
    this.dataDirty = false;
  }

  //////////////////////////////////////////////////////////////////////////////
  destroy() {
    // remove the interval update method
    utils.clearInterval(this.interval);

    // at any case we store the current data
    this.savePersistentData();
  }


  //////////////////////////////////////////////////////////////////////////////
  //                            "Private" methods
  //////////////////////////////////////////////////////////////////////////////

  //
  // @brief this method will sent the current data over telemtry.
  // @return true on success | false otherwise
  //
  sendOverTelemetry() {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'sending over telemetry');

    if (!this.currentData || !this.currentData['data']) {
      return false;
    }

    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'Current telemetry data: ' + JSON.stringify(signal));

    // if the data is not dirty we don't need to send anything?
    if (!this.dataDirty) {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.info(MODULE_NAME, 'data is not dirty so we will not send anything');
      return false;
    }

    // GR-149: we will add the version here
    var signal = {
      type: 'offers',
      v : OffersConfigs.CURRENT_VERSION,
      data: this.currentData['data']
    };

    // send it over telemetry
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'Signal to send: ' + JSON.stringify(signal));

    try {
      utils.telemetry(signal);
    } catch (ee) {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.error(MODULE_NAME, 'Error sending the telemtry data: ' + ee);
    }

    return true;
  }

  //
  // @brief this method will clear and reset all the field of the current
  //        data to start filling it again
  //
  generateNewDataStructure() {
    // GR-148: change telemetry signal to be incremental (not reseting all the values)
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'reseting the timestamp');
    if (!this.currentData) {
      this.currentData = {
        'data' : {},
        'last_ts_sent' : Date.now()
      };
    } else {
      this.currentData['last_ts_sent'] = Date.now();
    }

    this.dataDirty = true;
  }

  //
  // @brief this method will check if we need to send the current data over
  //        the telemetry or not
  //
  shouldWeNeedToSendCurrenData() {
    const lastTimeSent = Number(this.currentData['last_ts_sent']);
    const diffTime = Date.now() - lastTimeSent;

    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME,
                       'shouldWeNeedToSendCurrenData: lastTimeSent: ' + lastTimeSent +
                       ' - diffTime: ' + diffTime +
                       ' - OffersConfigs.STATS_SENT_PERIODISITY_MS: ' +
                       OffersConfigs.STATS_SENT_PERIODISITY_MS);
    return (diffTime >= OffersConfigs.STATS_SENT_PERIODISITY_MS);
  }



  //////////////////////////////////////////////////////////////////////////////
  //                            API
  //////////////////////////////////////////////////////////////////////////////


  //
  // @brief collect that a coupon provided by us was used
  //
  couponUsed(clusterID) {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'ourCouponUsed');

    generateOrAddField(this.currentData['data'], clusterID, 'coupons_used', 1);
    this.dataDirty = true;
  }

  //
  // @brief when another coupon has being used by the user and we couldn't track
  //        it for any reason (could be ours or not... most probably not).
  //
  externalCouponUsed(clusterID) {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'externalCouponUsed');

    generateOrAddField(this.currentData['data'], clusterID, 'external_coupons_used', 1);
    this.dataDirty = true;
  }

  //
  // @brief coupon being clicked
  //
  couponClicked(clusterID) {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'couponClicked');

    generateOrAddField(this.currentData['data'], clusterID, 'coupons_opened', 1);
    this.dataDirty = true;
  }

  //
  // @brief when the user press on "show more info" button
  //
  showMoreInfoClicked(clusterID) {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'showMoreInfoClicked');

    generateOrAddField(this.currentData['data'], clusterID, 'more_infos', 1);
    this.dataDirty = true;
  }

  //
  // @brief when the offer is shown in the same domain where the user is
  //
  offerOnSameDomain(clusterID) {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'offerOnSameDomain');

    generateOrAddField(this.currentData['data'], clusterID, 'same_domains', 1);
    this.dataDirty = true;
  }

  //
  // @brief when the offer is shown in a particular subcluster ({A,B}) if any.
  //
  offerShownOnSubcluster(clusterID, subclusterID) {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'offerShownOnSubcluster ' + subclusterID);

    generateOrAddField(this.currentData['data'], clusterID, 'subcluster_' + subclusterID, 1);
    this.dataDirty = true;
  }

  //
  // @brief when a coupon rejected by the main button
  //
  couponRejected(clusterID) {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'couponRejected');

    generateOrAddField(this.currentData['data'], clusterID, 'coupons_rejected', 1);
    this.dataDirty = true;
  }

  //
  // @brief when the offer is closed by some other reason
  //
  advertiseClosed(clusterID) {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'advertiseClosed');

    generateOrAddField(this.currentData['data'], clusterID, 'offers_closed', 1);
    this.dataDirty = true;
  }

  //
  // @brief when the ad is closed by the user on the X button
  //
  advertiseClosedByUser(clusterID) {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'advertiseClosedByUser');

    generateOrAddField(this.currentData['data'], clusterID, 'offers_closed_by_user', 1);
    this.dataDirty = true;
  }

  //
  // @brief an ad has being desplayed
  //
  advertiseDisplayed(clusterID) {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'advertiseDisplayed');

    generateOrAddField(this.currentData['data'], clusterID, 'offers_displayed', 1);
    this.dataDirty = true;
  }

  //
  // @brief when the offer is created by the first time
  //
  offerCreated(clusterID) {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'offerCreated');

    generateOrAddField(this.currentData['data'], clusterID, 'offers_created', 1);
    this.dataDirty = true;
  }

  //
  // @brief user bought or is in the checkout page
  //
  userProbablyBought(domainID, clusterID) {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'userProbablyBought');

    generateOrAddField(this.currentData['data'], clusterID, 'checkouts', 1);
    this.dataDirty = true;
  }

  //
  // @brief user clicked on the coupon code (copy to clipboard)
  //
  copyToClipboardClicked(clusterID) {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'copyToClipboardClicked');

    generateOrAddField(this.currentData['data'], clusterID, 'cp_to_clipboards', 1);
    this.dataDirty = true;
  }

  //
  // @brief system intention detected
  //
  systemIntentionDetected(domainID, clusterID) {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'systemIntentionDetected');

    generateOrAddField(this.currentData['data'], clusterID, 'system_intents', 1);
    this.dataDirty = true;
  }

  //
  // @brief user visited the cluster
  //
  userVisitedCluster(clusterID) {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'userVisitedCluster');

    generateOrAddField(this.currentData['data'], clusterID, 'visits', 1);
    this.dataDirty = true;
  }

  //
  // @brief new intent lifecycle has started
  //
  newIntentLifeCycleStarted(clusterID) {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'newIntentLifeCycleStarted');

    generateOrAddField(this.currentData['data'], clusterID, 'intent_lc', 1);
    this.dataDirty = true;
  }

}



