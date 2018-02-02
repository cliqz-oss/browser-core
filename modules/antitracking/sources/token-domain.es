import * as datetime from './time';
import Database from '../core/database';
import console from '../core/console';
import { migrateTokenDomain } from './legacy/database';
import Rx from '../platform/lib/rxjs';

const DAYS_EXPIRE = 7;
const DB_NAME = 'cliqz-attrack-token-domain';

export default class TokenDomain {
  constructor(config) {
    this.config = config;
    this.db = new Database(DB_NAME, { auto_compaction: true });
    this.blockedTokens = new Set();
    this.stagedTokenDomain = new Map();
    // cache of currentDay string (YYYYMMDD)
    this._currentDay = null;
    this._dbAvailable = true;

    this.subjectTokens = new Rx.Subject();
  }

  init() {
    // migrate from old db
    const init = migrateTokenDomain(this);
    // load current tokens over threshold
    const startup = this._wrapDbOperation(init.then(() => this.loadBlockedTokens()));

    // listen to the token tuples and update staged token data
    // emit when a new token is added to the blockedTokens set
    this._tokenSubscription = this.subjectTokens.subscribe((v) => {
      this._addTokenOnFirstParty(v);
    });

    // sample token events to trigger database persist a most
    // once per minute.
    // While a previous persist is running these messages will be suppressed.
    const persistWhen = this.subjectTokens
      .observeOn(Rx.Scheduler.async)
      .filter(() => this._dbAvailable)
      .auditTime(60000);

    // Persist to disk controlled by the persistWhen Observable
    this._persistSubscription = persistWhen.subscribe(() => {
      this._wrapDbOperation(this._persist());
    });

    // when cleanup is due: after startup, or when day changes
    this._cleanupSubscription = Rx.Observable.merge(
      Rx.Observable.fromPromise(startup).map(() => this.currentDay),
      this.subjectTokens
        .observeOn(Rx.Scheduler.async)
        .pluck('day')
    )
      .distinctUntilChanged()
      .delay(5000)
      .subscribe(() => {
        this.clean();
      });
    return this._wrapDbOperation(init);
  }

  unload() {
    [this._persistSubscription, this._cleanupSubscription, this._tokenSubscription]
      .forEach((sub) => {
        if (sub) {
          sub.unsubscribe();
        }
      });
  }

  get currentDay() {
    if (!this._currentDay || Date.now() > this._nextDayCheck) {
      const day = datetime.getTime().substr(0, 8);
      if (day !== this._currentDay) {
        this._nextDayCheck = Date.now() + (3600 * 1000);
      }
      this._currentDay = day;
    }
    return this._currentDay;
  }

  /**
   * Wraps an operation on the db with a _dbAvailable flag. This flag can then be used to prevent
   * concurrent heavy operations on the db.
   * @param promise
   */
  _wrapDbOperation(promise) {
    this._dbAvailable = false;
    const unlockDb = () => {
      this._dbAvailable = true;
    };
    return promise.then(unlockDb, unlockDb);
  }

  loadBlockedTokens() {
    return this.db.allDocs({ include_docs: true }).then(docs => docs.rows
      .filter(row => Object.keys(row.doc.fps).length >= this.config.tokenDomainCountThreshold)
      .map(doc => doc.id)
    ).then((toks) => {
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
    // Pass the token tuples to the Rx Subject. Processing is handled via the _tokenSubscription
    // subscription (synchronously), and data persistance by the _persistSubscription
    // (asynchronously).
    this.subjectTokens.next({
      token,
      firstParty,
      day: tokenDay,
    });
  }

  _addTokenOnFirstParty({ token, firstParty, day }) {
    if (!this.stagedTokenDomain.has(token)) {
      this.stagedTokenDomain.set(token, { fps: {} });
    }
    const tokens = this.stagedTokenDomain.get(token);
    tokens.mtime = this.currentDay > day ? this.currentDay : day;
    tokens.fps[firstParty] = day;
    return this._checkThresholdReached(token, tokens);
  }

  _checkThresholdReached(token, tokens) {
    if (Object.keys(tokens.fps).length >= this.config.tokenDomainCountThreshold) {
      if (this.config.debugMode) {
        console.log('tokenDomain', 'will be blocked:', token);
      }
      this.blockedTokens.add(token);
    }
    return this.blockedTokens.has(token);
  }

  isTokenDomainThresholdReached(token) {
    return this.config.tokenDomainCountThreshold < 2 || this.blockedTokens.has(token);
  }

  _persist() {
    const upserts = [];
    const unstageTokens = new Set();
    this.stagedTokenDomain.forEach((newDoc, token) => {
      const op = this.db.get(token).catch((err) => {
        if (err.name === 'not_found') {
          return {
            _id: token,
            fps: {},
          };
        }
        throw err;
      }).then((_doc) => {
        // merge existing doc with updated cached version
        const doc = _doc;
        doc.mtime = newDoc.mtime;
        Object.keys(newDoc.fps).forEach((firstParty) => {
          doc.fps[firstParty] = newDoc.fps[firstParty];
        });
        if (this._checkThresholdReached(token, doc)) {
          // if this token reached the threshold we don't need to keep it staged
          unstageTokens.add(token);
        }
        return doc;
      }).then(doc => this.db.put(doc));
      upserts.push(op);
    });
    return Promise.all(upserts).then(() => {
      unstageTokens.forEach((key) => {
        this.stagedTokenDomain.delete(key);
      });
      console.log('tokenDomain', 'persist successful', this.stagedTokenDomain.size, 'tokens,',
        unstageTokens.size, 'removed from staging');
    });
  }

  clean() {
    const day = datetime.newUTCDate();
    day.setDate(day.getDate() - DAYS_EXPIRE);
    const dayCutoff = datetime.dateString(day);

    const cleanPrefix = prefix =>
      this.db.allDocs({
        include_docs: true,
        startkey: prefix,
        endkey: `${prefix}\ufff0`,
      }).then((docs) => {
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

    // keys are all md5 hashes, so prefixes are hex digits
    const prefixes = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];

    // Create a chain of clean operations for each of the 16 possible key prefixes in the database
    // Each operation waits for the previous promise to return, then waits another 1 second before
    // starting.
    return prefixes
      .reduce(
        (prev, prefix) =>
          prev.then(
            () =>
              new Promise((resolve) => {
                setTimeout(() => {
                  resolve(cleanPrefix(prefix));
                }, 1000);
              })
          ),
        Promise.resolve()
      )
      .then(() => {
        const expiredTokens = new Set();
        this.stagedTokenDomain.forEach((value, key) => {
          if (value.mtime < dayCutoff) {
            expiredTokens.add(key);
          }
        });
        expiredTokens.forEach((key) => {
          this.stagedTokenDomain.delete(key);
        });
        if (this.config.debugMode) {
          console.log('tokenDomain', 'cleaning cache', expiredTokens.size);
        }
      });
  }

  clear() {
    this.blockedTokens.clear();
    this.stagedTokenDomain.clear();
    this.db.destroy().then(() => {
      this.db = new Database(DB_NAME, { auto_compaction: true });
    });
  }
}
