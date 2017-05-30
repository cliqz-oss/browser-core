import * as datetime from './time';
import { events } from '../core/cliqz';
import Database from '../core/database';
import console from '../core/console';
import { migrateTokenDomain } from './legacy/database';

const DAYS_EXPIRE = 7;
const DB_NAME = 'cliqz-attrack-token-domain';

export default class {

  constructor(config) {
    this.config = config;
    this.currentDay = datetime.getTime().substr(0, 8);
    this.db = new Database(DB_NAME, { auto_compaction: true });
    this.blockedTokens = new Set();
  }

  init() {
    // migrate from old db
    const init = migrateTokenDomain(this);
    // load current tokens over threshold
    init.then(() => this.loadBlockedTokens());

    this.onHourChanged = () => {
      this.currentDay = datetime.getTime().substr(0, 8);
      this.clean();
    };
    this._hourChangedListener = events.subscribe('attrack:hour_changed', this.onHourChanged);
    return init;
  }

  unload() {
    if (this._hourChangedListener) {
      this._hourChangedListener.unsubscribe();
      this._hourChangedListener = null;
    }
  }

  loadBlockedTokens() {
    return this.db.allDocs({ include_docs: true }).then(docs => docs.rows
      .filter(row => Object.keys(row.doc.fps).length >= this.config.tokenDomainCountThreshold)
      .map(doc => doc.id)
    )
    .then((toks) => {
      if (this.config.debugMode) {
        console.log('tokenDomain', 'blockedTokens:', toks.length);
      }
      toks.forEach(tok => this.blockedTokens.add(tok));
    });
  }

  /**
   * Mark that the given token was seen on this firstParty. Optionally specify a past day to insert
   * for, otherwise the current day is used
   * @param {String} token      token value
   * @param {String} firstParty first party domain
   * @param {String} day        (optional) day string (YYYYMMDD format)
   */
  addTokenOnFirstParty(token, firstParty, day) {
    const tokenDay = day || this.currentDay;
    return this.db.get(token).catch((err) => {
      if (err.name === 'not_found') {
        return {
          _id: token,
          fps: {},
        };
      }
      throw err;
    }).then((_doc) => {
      const doc = _doc;
      doc.mtime = this.currentDay > tokenDay ? this.currentDay : tokenDay;
      doc.fps[firstParty] = tokenDay;
      if (Object.keys(doc.fps).length >= this.config.tokenDomainCountThreshold) {
        if (this.config.debugMode) {
          console.log('tokenDomain', 'will be blocked:', token);
        }
        this.blockedTokens.add(token);
      }
      return doc;
    }).then((doc) => {
      this.db.put(doc);
    })
    .catch((err) => {
      console.error('upserting tokenDomain', err);
    });
  }

  isTokenDomainThresholdReached(token) {
    return this.config.tokenDomainCountThreshold < 2 || this.blockedTokens.has(token);
  }

  clean() {
    const day = datetime.newUTCDate();
    day.setDate(day.getDate() - DAYS_EXPIRE);
    const dayCutoff = datetime.dateString(day);

    return this.db.allDocs({ include_docs: true }).then((docs) => {
      const modifiedDocs = docs.rows.reduce((acc, item) => {
        const doc = item.doc;
        if (doc.mtime < dayCutoff) {
          // no hits for token
          doc._deleted = true;
          acc.push(doc);
          this.blockedTokens.delete(doc._id);
        } else {
          // first parties to be removed
          const oldFps = Object.keys(doc.fps).filter(fp => doc.fps[fp] < dayCutoff);
          if (oldFps.length > 0) {
            oldFps.forEach(fp => delete doc.fps[fp]);
            acc.push(doc);
            // check if this token still is over the threshold
            if (Object.keys(doc.fps).length < this.config.tokenDomainCountThreshold) {
              this.blockedTokens.delete(doc._id);
            }
          }
        }
        return acc;
      }, []);
      if (this.config.debugMode) {
        console.log('tokenDomain', 'cleaning', modifiedDocs.length);
      }
      return this.db.bulkDocs(modifiedDocs);
    });
  }

  clear() {
    this.blockedTokens.clear();
    this.db.destroy().then(() => {
      this.db = new Database(DB_NAME, { auto_compaction: true });
    });
  }
}
