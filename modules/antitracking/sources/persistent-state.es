import pacemaker from "antitracking/pacemaker";
import sto from "platform/antitracking/storage";
import CliqzUtils from 'core/utils';

const LOG_KEY = "attrack-persist";

/** Load data from the attrack sqlite table.
    From CliqzAttrack.loadRecord
 */
function loadRecord(id, callback) {
  sto.getItem('cliqz.dbattrack.' + id).then( callback );
};

/** Save data to the attrack sqlite table.
    From CliqzAttrack.saveRecord
 */
function saveRecord(id, data) {
  sto.setItem('cliqz.dbattrack.' + id, data);
};

class PersistenceHandler {
  constructor(name, target, dirty) {
    this.name = name;
    this.target = target;
    this.dirty = dirty || false;
    // write dirty pages every minute
    pacemaker.register(this.persistState.bind(this), 60000, this.isDirty.bind(this));

    // propegate proxy down object leaves
    for (let k in this.target) {
      this.target[k] = this.proxyBranch(this.target[k]);
    }

    // trap for set operations
    this.set = function(target, property, value, receiver) {
      // propegate proxy down object tree
      target[property] = this.proxyBranch(value);
      this.dirty = true;
      return true;
    };
    // trap for delete operations
    this.deleteProperty = function(target, property) {
      delete target[property];
      this.dirty = true;
      return true;
    };
  }

  persistState() {
    if (this.dirty) {
      saveRecord(this.name, JSON.stringify(this.target));
      this.dirty = false;
    }
  }

  proxyBranch(obj) {
    if (typeof obj === 'object') {
      for (let k in obj) {
        obj[k] = this.proxyBranch(obj[k]);
      }
      return new Proxy(obj, this);
    } else {
      return obj;
    }
  }

  isDirty() {
    return this.dirty;
  }
};

export function create_persistent(name, setter) {
  loadRecord(name, function(value) {
    var obj = {},
        dirty = false;
    try {
      obj = JSON.parse(value || "{}");
    } catch(e) {
      obj = {};
      dirty = true;
    }
    setter(new Proxy(obj, new PersistenceHandler(name, obj, dirty)));
  });
};

export function clear_persistent(value) {
  for (let k in value) {
    delete value[k];
  }
};

export function getValue(key, default_value) {
  let val = CliqzUtils.getPref("attrack." + key, default_value);
  return val;
};

export function setValue(key, value) {
  CliqzUtils.setPref("attrack." + key, value);
};

export { loadRecord, saveRecord };

export class LazyPersistentObject {

  constructor(name) {
    this.name = name;
    this.value = {};
    this.dirty = false;
  }

  load() {
    return new Promise(function(resolve, reject) {
      loadRecord(this.name, function(value) {
        try {
          this.value = JSON.parse(value || '{}');
        } catch(e) {
          this.value = {};
          this.dirty = true;
        }
        resolve(this.value);
      }.bind(this));
    }.bind(this));
  }

  save() {
    if (this.dirty) {
      saveRecord(this.name, JSON.stringify(this.value));
      this.dirty = false;
    }
  }

  setValue(v) {
    this.value = v;
    this.dirty = true;
    this.save();
  }

  setDirty() {
    this.dirty = true;
  }

  isDirty() {
    return this.dirty;
  }

  clear() {
    this.value = {};
    this.dirty = true;
    this.save();
  }
}

export class PersistentObject {

  constructor(name, setter) {
    this.name = name;
    this.value = {};
    this.dirty = false;
    this.setter = setter;
    this.setter(this.value);
    this.load();
  }

  load() {
    loadRecord(this.name, function(value) {
      try {
        this.value = JSON.parse(value || '{}');
      } catch(e) {
        this.value = {};
        this.dirty = true;
      }
      this.setter(this.value);
    }.bind(this));
  }

  setValue(v) {
    this.value = v;
    this.dirty = true;
    this.setter(v);
    this.save();
  }

  save() {
    if (this.dirty) {
      saveRecord(this.name, JSON.stringify(this.value));
      this.dirty = false;
    }
  }

  setDirty() {
    this.dirty = true;
  }

  isDirty() {
    return this.dirty;
  }

  clear() {
    this.value = {};
    this.dirty = true;
    this.save();
    this.setter(this.value);
  }

};

export class AutoPersistentObject extends PersistentObject {

  constructor(name, setter, saveInterval) {
    super(name, setter);
    pacemaker.register(this.save.bind(this), saveInterval, this.isDirty.bind(this));
  }

};
