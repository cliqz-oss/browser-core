/*
 * @brief Module used to send signals to the backend using different channels and
 *        configurations

 * The module works as follow:
 *  - Signals are grouped by buckets (keys) with configurations each (time to send, etc).
 *  - every bucket contains elements defined by keys, each key represent a signal
 *    that will be sent separately. Each key maps to a dict (json) data.
 *  - every time the tts (time to send) expires, the signals are sent to the specified
 *    backend (telemetry / humanweb / whatever).
 *  - the data will be stored on HD and loaded every time the browser is loaded, it
 *    will be send automatically to the BE if the tts expired.
 *
 */

import { utils } from 'core/cliqz';
import LoggingHandler from 'offers-v2/logging_handler';
import  OffersConfigs  from 'offers-v2/offers_configs';


////////////////////////////////////////////////////////////////////////////////
// consts

const MODULE_NAME = 'signals_handler';

const DB_MAIN_FIELD = 'chrome://cliqz/content/offers-v2/signals_data.json';
const DB_PREFIX = 'sig_hand_';

// TODO: remove this methods
function linfo(msg) {
  LoggingHandler.LOG_ENABLED && LoggingHandler.info(MODULE_NAME, msg);
}
function lwarn(msg) {
  LoggingHandler.LOG_ENABLED && LoggingHandler.warning(MODULE_NAME, msg);
}
function lerr(msg) {
  LoggingHandler.LOG_ENABLED && LoggingHandler.error(MODULE_NAME, msg);
}


class SignalBucket {
  constructor(id, expireTimeSecs = null, createdTS = null) {
    this.id = id;
    this.elems = {};
    this.expireTimeSecs = expireTimeSecs;
    this.createdTS = createdTS;
    this.isDataDirty = true;
  }

  // set signal
  setSignal(sigKey, sigData) {
    if (!sigKey) {
      lerr('setSignal: trying to set a null key? this should not happen');
      return;
    }
    linfo('setSignal: setting signal in ' + sigKey + ': ' + JSON.stringify(sigData));
    this.elems[sigKey] = sigData;
    this.isDataDirty = true;
  }

  // return the signal or null otherwise
  getSignal(sigKey) {
    const sig = this.elems[sigKey];
    return (sig) ? sig : null;
  }

  // expired?
  timeExpired() {
    const timeDiffSecs = (Date.now() - this.createdTS) / 1000;
    return timeDiffSecs >= this.expireTimeSecs;
  }

  // reset the last time sent
  resetCreatedTS(newTS) {
    this.createdTS = newTS;
  }

  // is dirty
  isDirty() {
    return this.isDataDirty;
  }

  isEmpty() {
    for (var k in this.elems) {
      if (this.elems.hasOwnProperty(k)) {
        return false;
      }
    }
    return true;
  }

  // toJSON
  toJSON() {
    return {
      elems: this.elems,
      expireTimeSecs: this.expireTimeSecs,
      createdTS: this.createdTS
    };
  }

  // fromJSON
  fromJSON(jdata) {
    if (!jdata.elems ||
        !jdata.expireTimeSecs ||
        !jdata.createdTS) {
      lerr('fromJSON: the JSON data is invalid, some field is missing');
      return;
    }

    // now we just set it
    this.elems = jdata.elems;
    this.expireTimeSecs = jdata.expireTimeSecs;
    this.createdTS = jdata.createdTS;

    // data dirty ?
    this.isDataDirty = true;
  }

  // send telemetry (return true on success | false on error)
  sendSignalsToBE() {
    // this will send all telemetry and remove all the data
    linfo('sendSignalsToBE: SENDING SIGNAL TO BE!!!: sending signal with id: ' + this.id);
    for (var k in this.elems) {
      if (!this.elems.hasOwnProperty(k)) {
        continue;
      }

      var signal = {
        type: 'offers',
        v : OffersConfigs.CURRENT_VERSION,
        data: {}
      };
      signal.data[k] = this.elems[k];
      utils.telemetry(signal);
      linfo('sendSignalsToBE: ' + JSON.stringify(signal));
    }

    return true;
  }

  // clear the current data
  clearSignals() {
    delete this.elems;
    this.elems = {};
    this.isDataDirty = false;
  }


};

////////////////////////////////////////////////////////////////////////////////
export class SignalHandler {

  //
  constructor() {
    // bucket type id -> bucket
    this.bucketsMap = {};
    // timers map
    this.timersMap = {};

    // load the persistent data
    this._loadPersistenceData();
  }

  // destructor
  destroy() {
    this._savePersistenceData();
  }

  //
  // @brief create bucket with key and time config
  // @param config:
  //  {
  //    tts_secs: N, // number of seconds to send the bucket
  //  }
  //
  // @return true on success | false otherwise
  //
  createBucket(keyName, config, overWrite = false) {
    if (this.bucketsMap[keyName]) {
      if (overWrite) {
        this.deleteBucket(keyName);
      } else {
        lwarn('this bucket already exists: ' + keyName);
        return false;
      }
    }

    if (!config.tts_secs) {
      lwarn('tts field in config should be provided');
      return false;
    }

    this.bucketsMap[keyName] = new SignalBucket(keyName, config.tts_secs, Date.now());

    // track the timer for this
    this._startTimer(keyName, config.tts_secs);

    return true;
  }

  deleteBucket(keyName) {
    if (!this.bucketsMap[keyName]) {
      lwarn('this bucket doesnt exists: ' + keyName);
      return false;
    }
    // remove all data
    this._stopTimer(keyName);
    delete this.bucketsMap[keyName];

    return true;
  }

  // get the information of a bucket or null if not exists
  getBucketInfo(keyName) {
    var bucket = this.bucketsMap[keyName];
    if (!bucket) {
      return null;
    }
    return {
      tts_secs: bucket.expireTimeSecs,
    }
  }

  // add signal to bucket + signal key + data.
  addSignal(bucketKey, sigKey, sigData) {
    var bucket = this.bucketsMap[bucketKey];
    if (!bucket) {
      lwarn('addSignal: the bucket doesnt exists: ' + bucketKey);
      return false;
    }
    // add the signal
    return bucket.setSignal(sigKey, sigData);
  }

  // returns a signal if we have or null if not
  getSignal(bucketKey, sigKey) {
    var bucket = this.bucketsMap[bucketKey];
    if (!bucket) {
      return null;
    }
    // add the signal
    return bucket.getSignal(sigKey);
  }

  //////////////////////////////////////////////////////////////////////////////
  //                            PRIVATE METHODS

  _getDBBucketKey(bucketKeyName) {
    return DB_PREFIX + bucketKeyName;
  }

  // process a bucket with a given name (send it and clear it)
  _sendBucketToBE(bucketKeyName) {
    var bucket = this.bucketsMap[bucketKeyName];
    if (!bucket) {
      lwarn('_sendBucketToBE: the bucket doesnt exists: ' + bucketKeyName);
      return false;
    }

    // if empty we do nothing
    if (!bucket.isDirty()) {
      // nothing to do
      linfo('_sendBucketToBE: bucket ' + bucketKeyName + ' is not dirty, nothing to do');
      return true;
    }

    // send the data and restore the
    if (!bucket.sendSignalsToBE()) {
      lerr('_sendBucketToBE: bucket ' + bucketKeyName + ' failed on sending to BE');
      // TODO: do some other error check here.. maybe save it for a little more time
    }

    bucket.clearSignals();
    bucket.resetCreatedTS(Date.now());

    // TODO: clear the data here in the database
    var localStorage = utils.getLocalStorage(DB_MAIN_FIELD);
    if (!localStorage) {
      lerr('_sendBucketToBE: error getting the main local storage: ' + DB_MAIN_FIELD);
      return false;
    }
    const dbKeyName = this._getDBBucketKey(bucketKeyName);
    localStorage.setItem(dbKeyName, JSON.stringify(bucket.toJSON()));

    return true;
  }

  // save persistence data
  _savePersistenceData() {
    // for testing comment the following check
    if (OffersConfigs.DEBUG_MODE) {
      linfo('_loadPersistenceData: skipping the loading');
      return;
    }

    // we will store each bucket in a different place on the DB using the
    // DB_PREFIX + bucketID as the doc name in the DB.
    // We should at some point make sure that we dont store garbage for ever.
    //
    // iterate over all buckets and save them into the DB
    linfo('_savePersistenceData: saving local data');
    var localStorage = utils.getLocalStorage(DB_MAIN_FIELD);
    if (!localStorage) {
      lerr('_savePersistenceData: error getting the main local storage: ' + DB_MAIN_FIELD);
      return;
    }

    var bucketsIDs = [];
    for (var k in this.bucketsMap) {
      if (!this.bucketsMap.hasOwnProperty(k)) {
        continue;
      }
      var bucket = this.bucketsMap[k];
      if (!bucket.isDirty() || bucket.isEmpty()) {
        linfo('_savePersistenceData: skipping ' + k + ' bucket.isDirty(): ' +
              bucket.isDirty() + ' - bucket.isEmpty(): ' + bucket.isEmpty());
        continue;
      }
      // we will store it as a separated document
      const docKey = this._getDBBucketKey(bucket.id);
      if (localStorage) {
        localStorage.setItem(docKey, JSON.stringify(bucket.toJSON()));
        linfo('_savePersistenceData: ' + docKey + ' saved: ' + JSON.stringify(bucket.toJSON()));
        bucketsIDs.push(docKey);
      } else {
        lerr('_savePersistenceData: ' + docKey + ' error: ' + err);
      }
    }

    // we need to store all the buckets ids now
    const dataToSave = {
      all_keys: bucketsIDs
    };

    localStorage.setItem('all_fields', JSON.stringify(dataToSave));
    linfo('_savePersistenceData: all fields: ' + JSON.stringify(dataToSave));
  }

  // load persistence data
  _loadPersistenceData() {
    // for testing comment the following check
    if (OffersConfigs.DEBUG_MODE) {
      linfo('_loadPersistenceData: skipping the loading');
      return;
    }

    linfo('_loadPersistenceData: loading local data');
    var localStorage = utils.getLocalStorage(DB_MAIN_FIELD);
    if (!localStorage) {
      lerr('_loadPersistenceData: error getting the main local storage: ' + DB_MAIN_FIELD);
      return;
    }

    // if we are on debug mode we will reload everything from extension
    var cache = localStorage.getItem('all_fields');
    if (!cache) {
      linfo('_loadPersistenceData: nothing to load from the data base');
      return;
    }

    // parse it and check the fields
    const allFields = JSON.parse(cache);
    if (!allFields || !allFields.all_keys) {
      lerr('_loadPersistenceData: error parsing the data? or is null');
      return;
    }

    // we will delete all the current data here
    delete this.bucketsMap;
    this.bucketsMap = {};

    // iterate and read all of them again
    const prefixSize = DB_PREFIX.length;
    for (var i = 0; i < allFields.all_keys.length; ++i) {
      const keyName = allFields.all_keys[i];
      cache = localStorage.getItem(keyName);
      if (!cache) {
        linfo('_loadPersistenceData: nothing to load from the data base for key ' + keyName);
        continue;
      }
      // else we have so we construct one bucket
      const bucketName = keyName.slice(prefixSize);
      var bucket = new SignalBucket(bucketName)
      bucket.fromJSON(JSON.parse(cache));

      // if for some reason this bucket is empty we will just delete it from here
      // TODO: OPTIMIZATION: maybe we can check if it is empty before creating it
      if (bucket.isEmpty()) {
        linfo('_loadPersistenceData: removing old empty bucket?: ' + bucketName +
              ' - data: ' + cache);
        continue;
      }

      this.bucketsMap[bucketName] = bucket;
      this._startTimer(bucketName, bucket.expireTimeSecs);

      linfo('_loadPersistenceData: loaded bucket from storage: ' + bucketName +
            ' with data: ' + cache);

      // check if we need to process right now the bucket, if we load it maybe
      // it is already expired so we send the signal right now
      if (bucket.timeExpired()) {
        this._sendBucketToBE(bucketName);
      }
    }
  }

  // start / stop timers
  _startTimer(bucketKeyName, ttsSecs = null) {
    if (!bucketKeyName || !ttsSecs) {
      lerr('_startTimer: invalid parameters.');
      return;
    }
    this._stopTimer(bucketKeyName);
    this.timersMap[bucketKeyName] = utils.setInterval(function () {
      // here we need to process this particular bucket
      if (!this._sendBucketToBE(bucketKeyName)) {
        // remove this timer
        this._stopTimer(bucketKeyName);
      }
    }.bind(this), ttsSecs * 1000);
  }

  _stopTimer(bucketKeyName) {
    var bucketTimer = this.timersMap[bucketKeyName];
    if (bucketTimer) {
      utils.clearInterval(bucketTimer);
      delete this.timersMap[bucketKeyName];
    }
  }




}
