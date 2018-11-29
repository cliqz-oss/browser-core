import * as datetime from './time';
import console from '../core/console';
import Rx from '../platform/lib/rxjs';

const DAYS_EXPIRE = 7;

export default class TokenDomain {
  constructor(config, db) {
    this.config = config;
    this.db = db;
    this.blockedTokens = new Set();
    this.stagedTokenDomain = new Map();
    // cache of currentDay string (YYYYMMDD)
    this._currentDay = null;

    this.subjectTokens = new Rx.Subject();
  }

  init() {
    // load current tokens over threshold
    const startup = this.db.ready.then(() => this.loadBlockedTokens());

    // listen to the token tuples and update staged token data
    // emit when a new token is added to the blockedTokens set
    this._tokenSubscription = this.subjectTokens
      .subscribe((v) => {
        this._addTokenOnFirstParty(v);
      });

    // sample token events to trigger database persist a most
    // once per minute.
    // While a previous persist is running these messages will be suppressed.
    const persistWhen = this.subjectTokens
      .observeOn(Rx.Scheduler.async)
      .auditTime(60000);

    // Persist to disk controlled by the persistWhen Observable
    this._persistSubscription = persistWhen.subscribe(() => {
      this._persist();
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
    return startup;
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

  loadBlockedTokens() {
    // delete expired blocked tokens
    return this.db.tokenBlocked.toCollection().uniqueKeys()
      .then((blockedTokens) => {
        this.blockedTokens.clear();
        blockedTokens.forEach(tok => this.blockedTokens.add(tok));
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
      this.stagedTokenDomain.set(token, new Map());
    }
    const tokens = this.stagedTokenDomain.get(token);
    tokens.set(firstParty, day);
    return this._checkThresholdReached(token, tokens);
  }

  _checkThresholdReached(token, tokens) {
    if (tokens.size >= this.config.tokenDomainCountThreshold) {
      this.addBlockedToken(token);
    }
    return this.blockedTokens.has(token);
  }

  addBlockedToken(token) {
    if (this.config.debugMode) {
      console.log('tokenDomain', 'will be blocked:', token);
    }
    const day = datetime.newUTCDate();
    day.setDate(day.getDate() + DAYS_EXPIRE);
    const expires = datetime.dateString(day);
    this.blockedTokens.add(token);
    return this.db.tokenBlocked.put({
      token,
      expires,
    });
  }

  isTokenDomainThresholdReached(token) {
    return this.config.tokenDomainCountThreshold < 2 || this.blockedTokens.has(token);
  }

  _persist() {
    const rows = [];
    const tokens = [];
    this.stagedTokenDomain.forEach((fps, token) => {
      tokens.push(token);
      fps.forEach((mtime, fp) => {
        rows.push({
          token,
          fp,
          mtime,
        });
      });
    });

    // upsert rows from staging to the db.
    return this.db.tokenDomain.bulkPut(rows).catch((errors) => {
      console.error('tokendomain', 'bulkPut errors', errors);
    }).then(() =>
      // for the tokens we have updated, check to see if the count exceeds the
      // threshold. In these cases, save the blocked token
      Promise.all(tokens.map(token =>
        this.db.tokenDomain.where('token').equals(token).count((n) => {
          if (n >= this.config.tokenDomainCountThreshold) {
            this.stagedTokenDomain.delete(token);
            return this.addBlockedToken(token);
          }
          return Promise.resolve();
        }))))
      .catch((e) => {
        console.error('tokendomain', 'count error', e);
      });
  }

  clean() {
    const day = datetime.newUTCDate();
    day.setDate(day.getDate() - DAYS_EXPIRE);
    const dayCutoff = datetime.dateString(day);

    const cleanTokenBlocked = this.db.tokenBlocked.where('expires')
      .below(this.currentDay)
      .delete()
      .then(() => this.loadBlockedTokens());
    const cleanTokeDomain = this.db.tokenDomain.where('mtime')
      .below(dayCutoff)
      .delete();
    return Promise.all([cleanTokenBlocked, cleanTokeDomain]);
  }

  clear() {
    this.blockedTokens.clear();
    this.stagedTokenDomain.clear();
    return Promise.all([
      this.db.tokenBlocked.clear(),
      this.db.tokenDomain.clear(),
    ]);
  }
}
