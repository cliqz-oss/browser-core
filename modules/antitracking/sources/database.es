import getDexie from '../platform/lib/dexie';

export default class AttrackDatabase {
  constructor() {
    this.db = null;
    this._ready = null;
  }

  init() {
    if (this.db !== null) return Promise.resolve();

    this._ready = getDexie().then((Dexie) => {
      this.db = new Dexie('antitracking');
      this.db.version(1).stores({
        tokenDomain: '[token+fp], token, mtime',
        tokenBlocked: 'token, expires',
        requestKeyValue: '[tracker+key+value], [tracker+key], day',
      });

      return this.db;
    });
    return this._ready;
  }

  unload() {
    if (this.db !== null) {
      this.db.close();
      this.db = null;
    }
  }

  get ready() {
    if (this._ready === null) {
      return Promise.reject('init not called');
    }
    return this._ready;
  }

  get tokenDomain() {
    return this.db.tokenDomain;
  }

  get tokenBlocked() {
    return this.db.tokenBlocked;
  }

  get requestKeyValue() {
    return this.db.requestKeyValue;
  }
}
