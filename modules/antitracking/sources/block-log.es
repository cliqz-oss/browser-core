import * as persist from 'antitracking/persistent-state';
import pacemaker from 'antitracking/pacemaker';
import md5 from 'antitracking/md5';
import { events } from 'core/cliqz';
import * as datetime from 'antitracking/time';
import ResourceLoader from 'core/resource-loader';

const DAYS_EXPIRE = 7;

class TokenDomain {

  constructor() {
    this._tokenDomain = new persist.LazyPersistentObject('tokenDomain');
  }

  init() {
    this._tokenDomain.load();
  }

  addTokenOnFirstParty(token, firstParty) {
    if (!this._tokenDomain.value[token]) {
      this._tokenDomain.value[token] = {};
    }
    this._tokenDomain.value[token][firstParty] = datetime.getTime().substr(0, 8);
    this._tokenDomain.setDirty();
  }

  getNFirstPartiesForToken(token) {
    return Object.keys(this._tokenDomain.value[token] || {}).length;
  }

  clean() {
    const day = datetime.newUTCDate();
    day.setDate(day.getDate() - DAYS_EXPIRE);
    const dayCutoff = datetime.dateString(day);
    const td = this._tokenDomain.value;
    for (const tok in td) {
      for (const s in td[tok]) {
        if (td[tok][s] < dayCutoff) {
          delete td[tok][s];
        }
      }
      if (Object.keys(td[tok]).length === 0) {
        delete td[tok];
      }
    }
    this._tokenDomain.setDirty();
    this._tokenDomain.save();
  }

  clear() {
    this._tokenDomain.clear();
  }
}

class BlockLog {
  constructor(telemetry) {
    this.telemetry = telemetry;
    this.URL_BLOCK_REPORT_LIST = 'https://cdn.cliqz.com/anti-tracking/whitelist/anti-tracking-report-list.json';
    this.blockReportList = {};
    this.blocked = new persist.LazyPersistentObject('blocked');
    this.localBlocked = new persist.LazyPersistentObject('localBlocked');
    this._blockReportListLoader = new ResourceLoader(
      ['antitracking', 'anti-tracking-report-list.json'], {
        remoteURL: 'https://cdn.cliqz.com/anti-tracking/whitelist/anti-tracking-report-list.json',
        cron: 24 * 60 * 60 * 1000,
      });
  }

  init() {
    this.blocked.load();
    this.localBlocked.load();
    this._blockReportListLoader.load().then(this._loadReportList.bind(this));
    this._blockReportListLoader.onUpdate(this._loadReportList.bind(this));
  }

  destroy() {
    this._blockReportListLoader.stop();
  }

  // blocked + localBlocked
  add(sourceUrl, tracker, key, value, type) {
    const s = tracker;
    const k = md5(key);
    const v = md5(value);
    const hour = datetime.getTime();
    const source = md5(sourceUrl);

    if (this.isInBlockReportList(s, k, v)) {
      this._addBlocked(s, k, v, type);
    }
    // local logging of blocked tokens
    this._addLocalBlocked(source, tracker, key, value, hour);
  }

  clear() {
    this.blockReportList = {};
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

  _loadReportList(list) {
    this.blockReportList = list;
  }

  isInBlockReportList(s, k, v) {
    if ('*' in this.blockReportList) {
      return true;
    } else if (s in this.blockReportList) {
      const keyList = this.blockReportList[s];
      if (keyList === '*') {
        return true;
      } else if (k in keyList) {
        const valueList = keyList[k];
        if (valueList === '*') {
          return true;
        } else if (v in valueList) {
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

export default class {
  constructor(qsWhitelist, telemetry) {
    this.telemetry = telemetry;
    this.blockLog = new BlockLog(telemetry);
    this.tokenDomain = new TokenDomain();
    this.checkedToken = new persist.LazyPersistentObject('checkedToken');
    this.blockedToken = new persist.LazyPersistentObject('blockedToken');
    this.loadedPage = new persist.LazyPersistentObject('loadedPage');
    this.currentHour = datetime.getTime();
    this._updated = {};
    this.qsWhitelist = qsWhitelist;
  }

  init() {
    this.blockLog.init();
    this.tokenDomain.init();

    this.onHourChanged = () => {
      this.currentHour = datetime.getTime();
      this._clean();
      this.sendTelemetry();
    };
    events.sub('attrack:hour_changed', this.onHourChanged);
    this.onTokenWhitelistUpdated = () => {
      this.checkWrongToken('token');
    };
    events.sub('attrack:token_whitelist_updated', this.onTokenWhitelistUpdated);
    this.onSafekeysUpdated = () => {
      this.checkWrongToken('safeKey');
    };
    events.sub('attrack:safekeys_updated', this.onSafekeysUpdated)

    this.checkedToken.load();
    this.blockedToken.load();
    this.loadedPage.load();

    this.saveBlocklog = () => {
      this.checkedToken.save();
      this.blockedToken.save();
      this.loadedPage.save();
      this.tokenDomain._tokenDomain.save();
      this.blockLog.blocked.save();
      this.blockLog.localBlocked.save();
    };
    this._pmTask = pacemaker.register(this.saveBlocklog, 1000 * 60 * 5);
  }

  destroy() {
    events.un_sub('attrack:hour_changed', this.onHourChanged);
    events.un_sub('attrack:token_whitelist_updated', this.onTokenWhitelistUpdated);
    events.un_sub('attrack:safekeys_updated', this.onSafekeysUpdated)
    pacemaker.deregister(this._pmTask);
    this.blockLog.destroy();
  }

  incrementCheckedTokens() {
    this._incrementPersistentValue(this.checkedToken, 1);
  }

  incrementBlockedTokens(nBlocked) {
    this._incrementPersistentValue(this.blockedToken, nBlocked);
  }

  incrementLoadedPages() {
    this._incrementPersistentValue(this.loadedPage, 1);
  }

  _incrementPersistentValue(v, n) {
    const hour = this.currentHour;
    if (!(hour in v.value)) {
      v.value[hour] = 0;
    }
    v.value[hour] += n;
    v.setDirty();
  }

  sendTelemetry() {
    this.blockLog.sendTelemetry();
  }

  checkWrongToken(key) {
    this._clean();
    // send max one time a day
    const day = datetime.getTime().slice(0, 8);
    const wrongTokenLastSent = persist.getValue('wrongTokenLastSent', datetime.getTime().slice(0, 8));
    if (wrongTokenLastSent === day) {
      return;  // max one signal per day
    }
    this._updated[key] = true;
    if (!('safeKey' in this._updated) || (!('token' in this._updated))) {
      return;  // wait until both lists are updated
    }
    let countLoadedPage = 0;
    let countCheckedToken = 0;
    let countBlockedToken = 0;
    let countWrongToken = 0;
    let countWrongPage = 0;

    const localBlocked = this.blockLog.localBlocked.value;
    for (const source in localBlocked) {
      let wrongSource = true;
      for (const s in localBlocked[source]) {
        for (const k in localBlocked[source][s]) {
          for (const v in localBlocked[source][s][k]) {
            if (!this.qsWhitelist.isTrackerDomain(s) ||
              this.qsWhitelist.isSafeKey(s, k) ||
              this.qsWhitelist.isSafeToken(s, v)) {
              for (const h in localBlocked[source][s][k][v]) {
                countWrongToken += localBlocked[source][s][k][v][h];
                localBlocked[source][s][k][v][h] = 0;
              }
              this.blockLog.localBlocked.setDirty();
            } else {
              wrongSource = false;
            }
          }
        }
      }
      if (wrongSource) {
        countWrongPage++;
      }
    }

    // send signal
    // sum checkedToken & blockedToken
    for (const h in this.checkedToken.value) {
      countCheckedToken += this.checkedToken.value[h];
    }
    for (const h in this.blockedToken.value) {
      countBlockedToken += this.blockedToken.value[h];
    }
    for (const h in this.loadedPage.value) {
      countLoadedPage += this.loadedPage.value[h];
    }

    const data = {
      wrongToken: countWrongPage,
      checkedToken: countCheckedToken,
      blockedToken: countBlockedToken,
      wrongPage: countWrongPage,
      loadedPage: countLoadedPage,
    };
    this.telemetry({
      message: {
        action: 'attrack.FP',
        payload: data,
      },
      ts: wrongTokenLastSent
    });
    persist.setValue('wrongTokenLastSent', day);
    this._updated = {};
  }

  clear() {
    this.blockLog.clear();
    this.tokenDomain.clear();
    this.checkedToken.clear();
    this.blockedToken.clear();
    this.loadedPage.clear();
  }

  _clean() {
    const delay = 24;
    const hour = datetime.newUTCDate();
    hour.setHours(hour.getHours() - delay);
    const hourCutoff = datetime.hourString(hour);

    this.blockLog._cleanLocalBlocked(hourCutoff);
    // checkedToken
    for (const h in this.checkedToken.value) {
      if (h < hourCutoff) {
        delete this.checkedToken.value[h];
      }
    }
    for (const h in this.loadedPage.value) {
      if (h < hourCutoff) {
        delete this.loadedPage.value[h];
      }
    }

    this.checkedToken.setDirty();
    this.loadedPage.setDirty();

    this.tokenDomain.clean();
  }

}
