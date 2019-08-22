/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable no-shadow, no-param-reassign */
import prefs from '../core/prefs';
import pacemaker from '../core/services/pacemaker';
import sto from '../platform/antitracking/storage';

/** Load data from the attrack sqlite table.
    From CliqzAttrack.loadRecord
 */
function loadRecord(id, callback) {
  sto.getItem(`cliqz.dbattrack.${id}`).then(callback);
}

/** Save data to the attrack sqlite table.
    From CliqzAttrack.saveRecord
 */
function saveRecord(id, data) {
  sto.setItem(`cliqz.dbattrack.${id}`, data);
}

function deleteRecord(id) {
  return sto.removeItem(`cliqz.dbattrack.${id}`);
}

class PersistenceHandler {
  constructor(name, target, dirty) {
    this.name = name;
    this.target = target;
    this.dirty = dirty || false;
    // write dirty pages every minute
    pacemaker.register(this.persistState.bind(this), { timeout: 60000 });

    // propegate proxy down object leaves
    Object.keys(this.target).forEach((k) => {
      this.target[k] = this.proxyBranch(this.target[k]);
    });

    // trap for set operations
    this.set = function set(target, property, value) {
      // propegate proxy down object tree
      target[property] = this.proxyBranch(value);
      this.dirty = true;
      return true;
    };
    // trap for delete operations
    this.deleteProperty = function deleteProperty(target, property) {
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
      Object.keys(obj).forEach((k) => {
        obj[k] = this.proxyBranch(obj[k]);
      });
      return new Proxy(obj, this);
    }
    return obj;
  }

  isDirty() {
    return this.dirty;
  }
}

export function createPersistent(name, setter) {
  loadRecord(name, (value) => {
    let obj = {};
    let dirty = false;
    try {
      obj = JSON.parse(value || '{}');
    } catch (e) {
      obj = {};
      dirty = true;
    }
    setter(new Proxy(obj, new PersistenceHandler(name, obj, dirty)));
  });
}

export function clearPersistent(value) {
  Object.keys(value).forEach(k => delete value[k]);
}

export function getValue(key, defaultValue) {
  return prefs.get(`attrack.${key}`, defaultValue);
}

export function setValue(key, value) {
  prefs.set(`attrack.${key}`, value);
}

export { loadRecord, saveRecord };

export class LazyPersistentObject {
  constructor(name) {
    this.name = name;
    this.value = {};
    this.dirty = false;
  }

  load() {
    return new Promise((resolve) => {
      loadRecord(this.name, (value) => {
        try {
          this.value = JSON.parse(value || '{}');
        } catch (e) {
          this.value = {};
          this.dirty = true;
        }
        resolve(this.value);
      });
    });
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

export function deletePersistantObject(name) {
  return deleteRecord(name);
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
    loadRecord(this.name, (value) => {
      try {
        this.value = JSON.parse(value || '{}');
      } catch (e) {
        this.value = {};
        this.dirty = true;
      }
      this.setter(this.value);
    });
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
}

export class AutoPersistentObject extends PersistentObject {
  constructor(name, setter, saveInterval) {
    super(name, setter);
    pacemaker.register(this.save.bind(this), { interval: saveInterval });
  }
}
