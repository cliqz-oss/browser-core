import IncrementalStorage from 'core/incremental-storage';

// This used to be an automatically persisting JSON object implemented using a Proxy object, but
// Proxy implementation was removed for compatibility reasons. Now it can be used in the
// following way:


// let ss = new SimpleStorage();
// ss.open('databaseName', 'directoryName').then(() => {
// ss.set('whatever', 5); // Persisted!
// ss.get('whatever'); // -> 5

// // Modify subojects
// ss.set('myobject', {nestedobject:[]});
// ss.set(['myobject', 'nestedobject'], [1, 2, 3]);
// ss.get('myobject'); // -> {nestedobject:[1, 2, 3]}

// // Apply functions to objects
// ss.apply(['myobject', 'nestedobject'], 'push', 4, 5, 6);
// ss.get(['myobject', 'nestedobject']); // -> [1, 2, 3, 4, 5, 6]
//   ss.storage.whatever = 5; // Persisted!
//   ss.storage.foo = [1,2,3]; // Persisted!
//   ss.storage.foo[0] = 4; // Persisted!
// })

// ss.close(); // When finished...
export default class SimpleStorage {
  // inMemory = true for testing purposes, no need to call open in that case
  constructor(inMemory = false) {
    this.inMemory = inMemory;
    if (!inMemory) {
      this.istorage = new IncrementalStorage();
    } else {
      this.istorage = { obj: {} };
    }
  }

  open(dbName, dirName, exactName = false, immediateSnap = false) {
    if (!this.inMemory) {
      return this.istorage.open(
        dbName,
        e => this.processEvent(e),
        dirName,
        exactName,
        immediateSnap,
      );
    }
    return Promise.resolve();
  }

  close() {
    if (!this.inMemory) {
      return this.istorage.close();
    }
    return Promise.resolve();
  }

  get isInit() {
    if (!this.inMemory) {
      return this.istorage.isOpen;
    }
    return true;
  }

  destroy() {
    if (!this.inMemory) {
      return this.istorage.destroy();
    }
    this.istorage.obj = {};
    return Promise.resolve();
  }

  get(path) {
    const mutPath = Array.isArray(path) ? path : [path];
    return mutPath.reduce((a, b) => a[b], this.istorage.obj);
  }

  set(path, value) {
    const mutPath = Array.isArray(path) ? path : [path];
    this._processEvent(['set', mutPath, value]);
  }

  delete(path) {
    const mutPath = Array.isArray(path) ? path : [path];
    this._processEvent(['delete', mutPath]);
  }

  apply(path, fun, ...args) {
    const mutPath = Array.isArray(path) ? path : [path];
    this._processEvent(['apply', mutPath, fun, ...args]);
  }

  _processEvent(...args) {
    if (!this.inMemory) {
      this.istorage.processEvent(...args);
    } else {
      this.processEvent(...args);
    }
  }

  // Private
  processEvent([type, path, ...args]) {
    const obj = path.slice(0, -1).reduce((a, b) => a[b], this.istorage.obj);
    const last = path[path.length - 1];
    if (type === 'set') {
      obj[last] = args[0];
    } else if (type === 'delete') {
      delete obj[last];
    } else if (type === 'apply') {
      const [fun, ...rest] = args;
      obj[last][fun](...rest);
    }
  }
}
