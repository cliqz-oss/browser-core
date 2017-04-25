import IncrementalStorage from 'hm/incremental-storage';

// WARNING: not very efficient if objects are really big (installing object proxies is expensive).
//          In that case, use IncrementalStorage instead!

// Automatically persisting object, using 'IncrementalStorage' as backend and ES6 proxy feature
// All modifying operations need to be done through the storage object. Examples:

// WRONG:
//   let array = [];
//   this.storage.myarray = array;
//   array.push('value'); // This will not be persisted!!!

// RIGHT:
// this.storage.myarray = [];
// this.storage.myarray.push('value'); // This will be persisted :)


// USAGE:
// let ss = new SimpleStorage();

// (pass the name of the database and the name of the directory inside
// user profile where files will be stored)
// ss.open('databaseName', 'directoryName').then(() => {
//   ss.storage.whatever = 5; // Persisted!
//   ss.storage.foo = [1,2,3]; // Persisted!
//   ss.storage.foo[0] = 4; // Persisted!
// })

// ss.close(); // When finished...
export default class SimpleStorage {
  constructor() {
    this.istorage = new IncrementalStorage();
  }

  open(dbName, dirName, exactName = false, immediateSnap = false) {
    return this.istorage.open(dbName, e => this.processEvent(e), dirName, exactName, immediateSnap);
  }

  close() {
    return this.istorage.close();
  }

  get isInit() {
    return this.istorage.isOpen;
  }

  destroy() {
    return this.istorage.destroy();
  }

  get(path) {
    const mutPath = Array.isArray(path) ? path : [path];
    return mutPath.reduce((a, b) => a[b], this.istorage.obj);
  }

  set(path, value) {
    const mutPath = Array.isArray(path) ? path : [path];
    this.istorage.processEvent(['set', mutPath, value]);
  }

  delete(path) {
    const mutPath = Array.isArray(path) ? path : [path];
    this.istorage.processEvent(['delete', mutPath]);
  }

  apply(path, fun, ...args) {
    const mutPath = Array.isArray(path) ? path : [path];
    this.istorage.processEvent(['apply', mutPath, fun, ...args]);
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
