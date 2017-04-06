import {utils} from '../core/cliqz';
import MapCache from './fixed-size-cache';
import * as datetime from './time';

var privacyScoreURL = 'https://anti-tracking.cliqz.com/api/v1/score?';

var PrivacyScore = function(tldHashRole) {
  this.tldHash = tldHashRole.substring(0, 16);
  this.role = tldHashRole.substring(16, tldHashRole.length);
  this.score = null;
  this.datetime = null;
  return this;
};

PrivacyScore._cache = new MapCache(function(tldHashRole) { return new PrivacyScore(tldHashRole); }, 1000);

PrivacyScore.get = function(tldHashRole) {
  return PrivacyScore._cache.get(tldHashRole);
};

PrivacyScore.prototype.getPrivacyScore = function() {
  if (this.score !== null && this.datetime === datetime.getTime()) {
    return;
  }
  var prefix = this.tldHash.substring(0, 8),
      suffix = this.tldHash.substring(8, 16);
  var reqURL = privacyScoreURL + 'prefix=' + prefix + '&role=' + this.role;
  this.score = -1;
  this.datetime = datetime.getTime();
  utils.httpGet(reqURL, function(req) {
    var res = JSON.parse(req.response);
    if (suffix in res) {
      this.score = res[suffix];
    }
  }.bind(this), utils.log, 10000);
};

export {
  PrivacyScore
};
