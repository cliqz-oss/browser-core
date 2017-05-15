import * as persist from './persistent-state';
import md5 from './md5';
import { events } from '../core/cliqz';
import * as datetime from './time';


export default class {

  constructor(telemetry, config) {
    this.telemetry = telemetry;
    this.config = config;
    this.blocked = new persist.LazyPersistentObject('blocked');
    this.localBlocked = new persist.LazyPersistentObject('localBlocked');
  }

  get blockReportList() {
    return this.config.reportList || {};
  }

  init() {
    this.blocked.load();
    this.localBlocked.load();

    this.onHourChanged = () => {
      const delay = 24;
      const hour = datetime.newUTCDate();
      hour.setHours(hour.getHours() - delay);
      const hourCutoff = datetime.hourString(hour);

      this._cleanLocalBlocked(hourCutoff);
      this.sendTelemetry();
    };
    this._hourChangedListener = events.subscribe('attrack:hour_changed', this.onHourChanged);
  }

  unload() {
    if (this._hourChangedListener) {
      this._hourChangedListener.unsubscribe();
      this._hourChangedListener = null;
    }
  }

  /**
   * Add an entry to the block log
   * @param {String} sourceUrl domain name of where this block happened
   * @param {String} tracker   the 3rd party tracker hostname which was blocked
   * @param {String} key       the key for the blocked value
   * @param {String} value     the blocked value
   * @param {String} type      the type of blocked value
   */
  add(sourceUrl, tracker, key, value, type) {
    const hour = datetime.getTime();

    this.offerToReporter(sourceUrl, tracker, key, value, type);

    // local logging of blocked tokens
    this._addLocalBlocked(sourceUrl, tracker, key, value, hour);
  }

  clear() {
    this.blocked.clear();
    this.localBlocked.clear();
  }

  _addBlocked(tracker, key, value, type) {
    const bl = this.blocked.value;
    if (!(tracker in bl)) {
      bl[tracker] = {};
    }
    if (!(key in bl[tracker])) {
      bl[tracker][key] = {};
    }
    if (!(value in bl[tracker][key])) {
      bl[tracker][key][value] = {};
    }
    if (!(type in bl[tracker][key][value])) {
      bl[tracker][key][value][type] = 0;
    }
    bl[tracker][key][value][type]++;
    this.blocked.setDirty();
  }

  _addLocalBlocked(source, s, k, v, hour) {
    const lb = this.localBlocked.value;
    if (!(source in lb)) {
      lb[source] = {};
    }
    if (!(s in lb[source])) {
      lb[source][s] = {};
    }
    if (!(k in lb[source][s])) {
      lb[source][s][k] = {};
    }
    if (!(v in lb[source][s][k])) {
      lb[source][s][k][v] = {};
    }
    if (!(hour in lb[source][s][k][v])) {
      lb[source][s][k][v][hour] = 0;
    }
    lb[source][s][k][v][hour]++;
    this.localBlocked.setDirty();
  }

  _cleanLocalBlocked(hourCutoff) {
    // localBlocked
    for (const source in this.localBlocked.value) {
      for (const s in this.localBlocked.value[source]) {
        for (const k in this.localBlocked.value[source][s]) {
          for (const v in this.localBlocked.value[source][s][k]) {
            for (const h in this.localBlocked.value[source][s][k][v]) {
              if (h < hourCutoff) {
                delete this.localBlocked.value[source][s][k][v][h];
              }
            }
            if (Object.keys(this.localBlocked.value[source][s][k][v]).length === 0) {
              delete this.localBlocked.value[source][s][k][v];
            }
          }
          if (Object.keys(this.localBlocked.value[source][s][k]).length === 0) {
            delete this.localBlocked.value[source][s][k];
          }
        }
        if (Object.keys(this.localBlocked.value[source][s]).length === 0) {
          delete this.localBlocked.value[source][s];
        }
      }
      if (Object.keys(this.localBlocked.value[source]).length === 0) {
        delete this.localBlocked.value[source];
      }
    }
    this.localBlocked.setDirty(true);
    this.localBlocked.save();
  }

  /**
   * Check if this block event should be reported via telemetry, and if so, add to the
   * block log
   * @param  {String} sourceUrl
   * @param  {String} tracker
   * @param  {String} key
   * @param  {String} value
   * @param  {String} type
   */
  offerToReporter(sourceUrl, tracker, key, value, type) {
    if (this.isInBlockReportList(tracker, key, value)) {
      this._addBlocked(tracker, key, md5(value), type);
    }
  }

  isInBlockReportList(tracker, key, value) {
    if (tracker in this.blockReportList) {
      const keyList = this.blockReportList[tracker];
      if (keyList === '*') {
        return true;
      } else if (key in keyList || md5(key) in keyList) {
        const valueList = keyList[k] || keyList[md5(key)];
        if (valueList === '*') {
          return true;
        } else if (value in valueList || md5(value) in valueList) {
          return true;
        }
      }
    }
    return false;
  }

  sendTelemetry() {
    if (Object.keys(this.blocked.value).length > 0) {
      this.telemetry({
        message:{
          action: 'attrack.blocked',
          payload: this.blocked.value,
        }
      });
      // reset the state
      this.blocked.clear();
    }
  }
}
