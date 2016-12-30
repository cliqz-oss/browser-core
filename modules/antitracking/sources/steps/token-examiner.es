import pacemaker from 'antitracking/pacemaker';
import * as persist from 'antitracking/persistent-state';
import * as datetime from 'antitracking/time';
import { getGeneralDomain } from 'antitracking/domain';
import md5 from 'antitracking/md5';

// creates local safe keys for keys with multiple observed values
export default class {

  constructor(qsWhitelist, shortTokenLength, safekeyValuesThreshold, safeKeyExpire) {
    this.qsWhitelist = qsWhitelist;
    this.shortTokenLength = shortTokenLength;
    this.safekeyValuesThreshold = safekeyValuesThreshold;
    this.safeKeyExpire = safeKeyExpire;
    this.requestKeyValue = {};
    this._requestKeyValue = new persist.AutoPersistentObject("requestKeyValue", (v) => this.requestKeyValue = v, 60000);
  }

  init() {
    const hourly = 60 * 60 * 1000;
    this._pmPrune = pacemaker.register(this._pruneRequestKeyValue.bind(this), hourly);
    this._pmAnnotate = pacemaker.register(function annotateSafeKeys() {
        this.qsWhitelist.annotateSafeKeys(this.requestKeyValue);
    }.bind(this), 10 * hourly);
  }

  unload() {
    pacemaker.deregister(this._pmPrune);
    pacemaker.deregister(this._pmAnnotate);
  }

  clearCache() {
    this._requestKeyValue.clear();
  }

  examineTokens(state) {
    if (!state.requestContext.isChannelPrivate()) {
      this._examineTokens(state.urlParts);
    }
    return true;
  }

  _examineTokens(url_parts) {
    var day = datetime.newUTCDate();
    var today = datetime.dateString(day);
    // save appeared tokens with field name
    // mark field name as "safe" if different values appears
    var s = getGeneralDomain(url_parts.hostname);
    s = md5(s).substr(0, 16);
    url_parts.getKeyValuesMD5().filter((kv) => {
      return kv.v_len >= this.shortTokenLength;
    }).forEach((kv) => {
      var key = kv.k,
          tok = kv.v;
      if (this.qsWhitelist.isSafeKey(s, key))
        return;
      if (this.requestKeyValue[s] == null)
        this.requestKeyValue[s] = {};
      if (this.requestKeyValue[s][key] == null)
        this.requestKeyValue[s][key] = {};

      this.requestKeyValue[s][key][tok] = today;
      // see at least 3 different value until it's safe
      let valueCount = Object.keys(this.requestKeyValue[s][key]).length
      if ( valueCount > this.safekeyValuesThreshold ) {
        this.qsWhitelist.addSafeKey(s, key, valueCount);
        // keep the last seen token
        this.requestKeyValue[s][key] = {tok: today};
      }
      this._requestKeyValue.setDirty();
    });
  }

  _pruneRequestKeyValue() {
      var day = datetime.newUTCDate();
      day.setDate(day.getDate() - this.safeKeyExpire);
      var dayCutoff  = datetime.dateString(day);
      for (var s in this.requestKeyValue) {
        for (var key in this.requestKeyValue[s]) {
          for (var tok in this.requestKeyValue[s][key]) {
            if (this.requestKeyValue[s][key][tok] < dayCutoff) {
              delete this.requestKeyValue[s][key][tok];
            }
          }
          if (Object.keys(this.requestKeyValue[s][key]).length == 0) {
            delete this.requestKeyValue[s][key];
          }
        }
        if (Object.keys(this.requestKeyValue[s]).length == 0) {
          delete this.requestKeyValue[s];
        }
      }
      this._requestKeyValue.setDirty();
      this._requestKeyValue.save();
    }
}
