/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const Dexie = require('@cliqz-oss/dexie');
const IDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange');
const indexedDB = require('fake-indexeddb');

global.indexedDB = indexedDB;
global.IDBKeyRange = IDBKeyRange;

function initDexie(name) {
  return new Dexie(name, {
    indexedDB,
    IDBKeyRange,
  });
}

initDexie.__proto__.delete = Dexie.delete; // eslint-disable-line no-proto
initDexie.__proto__.exists = Dexie.exists; // eslint-disable-line no-proto

module.exports = {
  'platform/lib/dexie': {
    default: () => Promise.resolve(initDexie),
  },
};
