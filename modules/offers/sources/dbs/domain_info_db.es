import { DB } from 'offers/dbs/db';
import { utils } from 'core/cliqz';



//////////////////////////////////////////////////////////////////////////////

export function DomainInfoDB() {
  DB.call(this, 'domain_info_db');
  this.data = { 'total_signals' : 0 , 'top_sellers': [], 'checkout_regex': {}};
  this.defaultNotFoundValue = 0.0;
  this.validKeys = ['total_signals', 'top_sellers', 'checkout_regex'];
}

DomainInfoDB.prototype = Object.create(DB.prototype);
DomainInfoDB.prototype.constructor = DomainInfoDB;

DomainInfoDB.prototype.getTotalSignals = function() {
  return this.data['total_signals'];
};

DomainInfoDB.prototype.setTopSellersList = function(topSellers) {
  // Sort array buy second value
  // Each entry has structure [domainId, count]
  // http://stackoverflow.com/questions/9316119/sort-complex-array-of-arrays-by-value-within
  topSellers.sort(function(a,b) {
    var x = a[1];
    var y = b[1];
    return y-x;
  });
  this.data['top_sellers'] = topSellers;
};

DomainInfoDB.prototype.getTopSellersList = function() {
  return this.data['top_sellers'];
};

DomainInfoDB.prototype.getTopSeller = function() {
  return this.data['top_sellers'][0];
};



// Load from dict
//
DomainInfoDB.prototype.loadFromDict = function(dict) {
  this.data['total_signals'] = dict['total_signals'];
  this.setTopSellersList(dict['top_sellers']);
};




