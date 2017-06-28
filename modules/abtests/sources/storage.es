import prefs from '../core/prefs';
import Database from '../core/database';


export class ModuleStorage {
  constructor() {
    this.database = new Database('cliqz-abtests');
  }

  get(k, d) {
    return this.database.get(k)
      .then(doc => doc.v)
      .catch((error) => {
        if (error.status === 404) {
          return d;
        }
        throw error;
      });
  }

  // replaces existing documents
  set(k, v) {
    return this.remove(k)
      .catch(() => null)
      .then(() => this.database.put({ _id: k, v }));
  }

  remove(k) {
    return this.database.get(k)
      .then(doc => this.database.remove(doc));
  }
}

export class SharedStorage {
  get(k, d) {
    return Promise.resolve(prefs.get(k, d));
  }

  set(k, v) {
    Promise.resolve(prefs.set(k, v));
  }

  remove(k) {
    Promise.resolve(prefs.clear(k));
  }
}
