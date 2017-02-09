import { DB } from 'offers/dbs/db';
import { utils } from 'core/cliqz';



//////////////////////////////////////////////////////////////////////////////

export function DateTimeDB() {
  DB.call(this, 'datetime_db');
  this.dayData = {};
  this.hourData = {};
  this.monthData = {};
  this.defaultNotFoundValue = 0.0;
  this.totalNumSignals = 0;
}

DateTimeDB.prototype = Object.create(DB.prototype);
DateTimeDB.prototype.constructor = DateTimeDB;


// total of signals
DateTimeDB.prototype.getTotalSignalsCount = function() {
  return this.totalNumSignals;
};

// Day functions
//
DateTimeDB.prototype.addDayValue = function(k, value) {
  this.dayData[k] = value;
};

DateTimeDB.prototype.getDayValue = function(k) {
  let v = this.dayData[k];
  return v === undefined ? this.defaultNotFoundValue : v;
};

// hour functions
//
DateTimeDB.prototype.addHourValue = function(k, value) {
  this.hourData[k] = value;
};

DateTimeDB.prototype.getHourValue = function(k) {
  let v = this.hourData[k];
  return v === undefined ? this.defaultNotFoundValue : v;
};

// Load from dict
//
DateTimeDB.prototype.loadFromDict = function(dict) {
  this.totalNumSignals = dict['total_signals'];
  this.dayData = dict['day_data'];
  this.hourData = dict['hour_data'];
  this.monthData = dict['month_data'];
};




