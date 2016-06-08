import { utils } from 'core/cliqz';
import { readFile, writeFile } from 'core/fs';

export default class {
  // this simple cache is a dictionary that addionally stores
  // timestamps for each entry; life is time in seconds before
  // entries are marked stale (if life is not specified entries
  // are good forever); going stale has no immediate consequences
  constructor(life) {
  	this._cache = { };
  	this._life = life ? life * 1000 : false;
  }

  // stores entry only if it is newer than current entry,
  // current time is used if time is not specified
  store(key, value, time) {
    time = time || Date.now();

    if (this.isNew(key, value, time)) {
      this._cache[key] = {
        time: time,
        value: value
      };
    }
  }

  // deletes entry
  delete(key) {
    if (this.isCached(key)) {
      delete this._cache[key];
    }
  }

  // returns cached entry or false if no entry exists for key
  retrieve(key) {
    if (!this.isCached(key)) {
      return false;
    }
    return this._cache[key].value;
  }

  isCached(key) {
    return this._cache.hasOwnProperty(key);
  }

  // returns true if there is no newer entry already cached for key
  isNew(key, value, time) {
    return !this.isCached(key) ||
      (time > this._cache[key].time);
  }

  // an entry is stale if it is not cached or has expired
  // (an entry can only expire if life is specified); this
  // has no immediate consequences, but can be used from
  // outside to decide if this entry should be updated
  isStale(key) {
    return !this.isCached(key) ||
      (this._life && (Date.now() - this._cache[key].time) > this._life);
  }

  // updates time without replacing the entry
  refresh(key, time) {
    time = time || Date.now();

    if (this.isCached(key)) {
      this._cache[key].time = time;
    }
  }

  // save cache to file
  save(filename) {
    const content = (new TextEncoder()).encode(JSON.stringify(this._cache));
    writeFile(filename, content).then(() => {
      this.log('save: saved to ' + filename);
    }).catch((e) => {
      this.log('save: failed saving: ' + e);
    });
  }

  // load cache from file
  load(filename) {
    readFile(filename).then((data) => {
      this._cache = JSON.parse((new TextDecoder()).decode(data));
      this.log('load: loaded from: ' + filename);
    }).catch((e) => {
      this.log('load: failed loading: ' + e);
    });
  }

  log(msg) {
    utils.log(msg, 'Cache');
  }
}
