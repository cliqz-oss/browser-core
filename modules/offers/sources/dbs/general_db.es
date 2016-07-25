import { DB } from 'offers/dbs/db';
import { utils } from 'core/cliqz';
import LoggingHandler from 'offers/logging_handler';


const MODULE_NAME = 'general_db';

//////////////////////////////////////////////////////////////////////////////

export function GeneralDB() {
  DB.call(this, 'general_db');
  this.data = {};
  this.defaultNotFoundValue = 0.0;
  this.validKeys = ['total_buy_signals', 'avg_total_buying_time', 'avg_time_between_sessions',
                    'avg_unique_num_days', 'avg_num_sessions_per_buying', 'avg_num_events_per_buying',
                    'top_referrers', 'avg_session_duration_secs', 'avg_time_between_events',
                    'avg_evts_per_avg_sessions'];
}

GeneralDB.prototype = Object.create(DB.prototype);
GeneralDB.prototype.constructor = GeneralDB;

// set a value for a particular key
//
GeneralDB.prototype.addValue = function(k, value) {
  this.data[k] = value;
};

//
// get the value for a particular key
GeneralDB.prototype.getValue = function(k) {
  let v;
  if (this.validKeys.includes(k)) {
    v = this.data[k];
  }
  return v === undefined ? this.defaultNotFoundValue : v;
};

// Load from dict
//
GeneralDB.prototype.loadFromDict = function(dict) {
  for (var key in dict) {
    if (this.validKeys.includes(key)) {
      this.addValue(key, dict[key]);
    }else {
      LoggingHandler.info(MODULE_NAME, 'Key not found in the list of valid keys');
    }
  }
};








