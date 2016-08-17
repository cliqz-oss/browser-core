import IncrementalStorage from 'hm/incremental-storage';

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
    this.storage = null;
  }

  open(dbName, dirName = 'HMSearch', exactName = false) {
    return this.istorage.open(dbName, e => this.processEvent(e), dirName, exactName)
        .then(() => (this.storage = this.installProxies(this.istorage.obj)));
  }

  close() {
    return this.istorage.close()
        .then(() => (this.storage = null));
  }

  get isInit() {
    return this.istorage.isOpen;
  }

  destroy() {
    return this.istorage.destroy()
        .then(() => (this.storage = null));
  }

  processEvent(e) {
    const path = e[1];
    const obj = path.slice(0, -1).reduce((a, b) => a[b], this.istorage.obj);
    const last = path[path.length - 1];
    if (e[0] === 'set') {
      obj[last] = e[2];
    } else if (e[0] === 'delete') {
      delete obj[last];
    }
  }

  createProxy(obj, path) {
    const proxy = new Proxy(obj, this.makeHandler(path));
    return proxy;
  }

  makeHandler(path = []) {
    const ret = {
      path,
      set: (target, prop, value) => {
        const mutTarget = target;
        let mutValue = value;
        if (typeof value === 'object') {
          // This is the only way to do this cleanly, the object being assigned
          // could be a subobject in this.storage, or some object with nested objects...
          mutValue = this.installProxies(
            JSON.parse(JSON.stringify(mutValue)), ret.path.concat(prop)
          );
        }
        this.istorage.appendToJournal(['set', ret.path.concat(prop), mutValue]);
        mutTarget[prop] = mutValue;
        return true;
      },
      deleteProperty: (target, prop) => {
        const mutTarget = target;
        this.istorage.appendToJournal(['delete', ret.path.concat(prop)]);
        delete mutTarget[prop];
        return true;
      },
    };
    return ret;
  }

  // Expects a 'clean' object (no proxies in any of the subobjects)
  installProxies(obj, path = []) {
    const mutObj = obj;
    if (typeof obj === 'object' && obj) {
      Object.keys(obj).forEach(key => {
        mutObj[key] = this.installProxies(obj[key], path.concat(key));
      });
      return this.createProxy(obj, path);
    }
    return obj;
  }
}
