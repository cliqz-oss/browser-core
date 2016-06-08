import * as persist from 'antitracking/persistent-state';
import pacemaker from 'antitracking/pacemaker';
import md5 from 'antitracking/md5';
import { utils, events } from 'core/cliqz';
import * as datetime from 'antitracking/time';
import CliqzAttrack from 'antitracking/attrack';
import CliqzHumanWeb from 'human-web/human-web';

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
    var day = datetime.newUTCDate();
        day.setDate(day.getDate() - DAYS_EXPIRE);
    var dayCutoff = datetime.dateString(day),
        td = this._tokenDomain.value;
    for (var tok in td) {
      for (var s in td[tok]) {
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
  constructor() {
    this.URL_BLOCK_REPORT_LIST = 'https://cdn.cliqz.com/anti-tracking/whitelist/anti-tracking-report-list.json';
    this.blockReportList = {};
    this.blocked = new persist.LazyPersistentObject('blocked');
    this.localBlocked = new persist.LazyPersistentObject('localBlocked');
  }

  init() {
    this.blocked.load();
    this.localBlocked.load();
    this._loadReportList();
  }

  // blocked + localBlocked
  add(sourceUrl, tracker, key, value, type) {
    var s = tracker,
        k = md5(key),
        v = md5(value);
    if (this.isInBlockReportList(s, k, v)) {
        this._addBlocked(s, k, v, type);
    }
    // local logging of blocked tokens
    var hour = datetime.getTime(),
        source = md5(sourceUrl);

    this._addLocalBlocked(source, tracker, key, value, hour);
  }

  clear() {
    this.blockReportList = {};
    this.blocked.clear();
    this.localBlocked.clear();
  }

  _addBlocked(tracker, key, value, type) {
    var bl = this.blocked.value;
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
    var lb = this.localBlocked.value;
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
    for (var source in this.localBlocked.value) {
      for (var s in this.localBlocked.value[source]) {
        for (var k in this.localBlocked.value[source][s]) {
          for (var v in this.localBlocked.value[source][s][k]) {
            for (var h in this.localBlocked.value[source][s][k][v]) {
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

  _loadReportList() {
    utils.loadResource(this.URL_BLOCK_REPORT_LIST, function(req) {
      try {
        this.blockReportList = JSON.parse(req.response);
      } catch(e) {
        this.blockReportList = {};
      }
    }.bind(this));
  }

  isInBlockReportList(s, k, v) {
    return s in this.blockReportList &&
        k in this.blockReportList[s] &&
        v in this.blockReportList[s][k] ||
        '*' in this.blockReportList ||
        s in this.blockReportList && '*' in this.blockReportList[s] ||
        s in this.blockReportList && k in this.blockReportList[s] && '*' in this.blockReportList[s][k];
  }

  sendTelemetry() {
    if (Object.keys(this.blocked.value).length > 0) {
      var payl = CliqzAttrack.generateAttrackPayload(this.blocked.value);
      CliqzHumanWeb.telemetry({'type': CliqzHumanWeb.msgType, 'action': 'attrack.blocked', 'payload': payl});
      // reset the state
      this.blocked.clear();
    }
  }
}

export default class {
  constructor(qsWhitelist) {
    this.blockLog = new BlockLog();
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

    events.sub('attrack:hour_changed', () => {
      this.currentHour = datetime.getTime();
      this._clean();
      this.sendTelemetry();
    }.bind(this));
    events.sub('attrack:token_whitelist_updated', () => {
      this.checkWrongToken('token');
    }.bind(this));
    events.sub('attrack:safekeys_updated', () => {
      this.checkWrongToken('safeKey');
    }.bind(this));

    this.checkedToken.load();
    this.blockedToken.load();
    this.loadedPage.load();

    this.saveBlocklog = function() {
      this.checkedToken.save();
      this.blockedToken.save();
      this.loadedPage.save();
      this.tokenDomain._tokenDomain.save();
      this.blockLog.blocked.save();
      this.blockLog.localBlocked.save();
    }.bind(this);
    this._pmTask = pacemaker.register(this.saveBlocklog, 1000 * 60 * 5);
  }

  destroy() {
    pacemaker.deregister(this._pmTask);
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
    var hour = this.currentHour;
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
    var day = datetime.getTime().slice(0, 8),
      wrongTokenLastSent = persist.getValue('wrongTokenLastSent', datetime.getTime().slice(0, 8));
    if (wrongTokenLastSent === day) {
      return;  // max one signal per day
    }
    this._updated[key] = true;
    if (!('safeKey' in this._updated) || (!('token' in this._updated))) {
      return;  // wait until both lists are updated
    }
    var countLoadedPage = 0,
        countCheckedToken = 0,
        countBlockedToken = 0,
        countWrongToken = 0,
        countWrongPage = 0;

    var localBlocked = this.blockLog.localBlocked.value;
    for (var source in localBlocked) {
      var _wrongSource = true;
      for (var s in localBlocked[source]) {
        for (var k in localBlocked[source][s]) {
          for (var v in localBlocked[source][s][k]) {
            if (!this.qsWhitelist.isTrackerDomain(s) ||
              this.qsWhitelist.isSafeKey(s, k) ||
              this.qsWhitelist.isSafeToken(s, v)) {
              for (let h in localBlocked[source][s][k][v]) {
                countWrongToken += localBlocked[source][s][k][v][h];
                localBlocked[source][s][k][v][h] = 0;
              }
              this.blockLog.localBlocked.setDirty();
            }
            else {
              _wrongSource = false;
            }
          }
        }
      }
      if (_wrongSource) {
        countWrongPage++;
      }
    }

    // send signal
    // sum checkedToken & blockedToken
    for (let h in this.checkedToken.value) {
      countCheckedToken += this.checkedToken.value[h];
    }
    for (let h in this.blockedToken.value) {
      countBlockedToken += this.blockedToken.value[h];
    }
    for (let h in this.loadedPage.value) {
      countLoadedPage += this.loadedPage.value[h];
    }

    var data = {
      'wrongToken': countWrongPage,
      'checkedToken': countCheckedToken,
      'blockedToken': countBlockedToken,
      'wrongPage': countWrongPage,
      'loadedPage': countLoadedPage
    };
    var payl = CliqzAttrack.generateAttrackPayload(data, wrongTokenLastSent);
    CliqzHumanWeb.telemetry({'type': CliqzHumanWeb.msgType, 'action': 'attrack.FP', 'payload': payl});
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
    var delay = 24,
        hour = datetime.newUTCDate();
    hour.setHours(hour.getHours() - delay);
    var hourCutoff = datetime.hourString(hour);

    this.blockLog._cleanLocalBlocked(hourCutoff);
    // checkedToken
    for (let h in this.checkedToken.value) {
      if (h < hourCutoff) {
        delete this.checkedToken.value[h];
      }
    }
    for (let h in this.loadedPage.value) {
      if (h < hourCutoff) {
        delete this.loadedPage.value[h];
      }
    }

    this.checkedToken.setDirty();
    this.loadedPage.setDirty();

    this.tokenDomain.clean();
  }

}
