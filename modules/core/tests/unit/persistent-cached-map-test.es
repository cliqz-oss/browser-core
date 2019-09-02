/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai */
/* global describeModule */

const expect = chai.expect;

const persistence = {};

function delay(fn) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      Promise.resolve()
        .then(fn)
        .then(resolve)
        .catch(reject);
    }, 100);
  });
}

class MockMap {
  constructor(dbName) {
    persistence[dbName] = (persistence[dbName] || new Map());
    this.db = persistence[dbName];
  }

  init() {
    return Promise.resolve();
  }

  unload() {
    return Promise.resolve();
  }

  get(key) {
    return delay(() => this.db.get(key));
  }

  set(key, value) {
    return delay(() => this.db.set(key, value));
  }

  has(key) {
    return delay(() => this.db.has(key));
  }

  delete(key) {
    return delay(() => this.db.delete(key));
  }

  clear() {
    return delay(() => this.db.clear());
  }

  size() {
    return delay(() => this.db.size());
  }

  keys() {
    return delay(() => [...this.db.keys()]);
  }

  entries() {
    return delay(() => [...this.db.entries()]);
  }
}

export default describeModule('core/persistence/cached-map',
  () => ({
    'core/persistence/map': {
      default: () => MockMap,
    },
  }),
  () => {
    describe('PersistentCachedMapTest', function () {
      this.timeout(5000);
      let PersistentCachedMap;
      beforeEach(function () {
        PersistentCachedMap = this.module().default;
      });

      it('PersistentCachedMap - simple', function () {
        let map1 = new PersistentCachedMap('first');
        return map1.init().then(() => {
          expect(map1.size()).to.equal(0);
          return map1.set('what', 1714);
        })
          .then(() => {
            expect(map1.size()).to.equal(1);
            expect(map1.get('what')).to.equal(1714);
            return Promise.all([map1.set('how', 'lala'), map1.set('bla', 'ble')]);
          })
          .then(() => {
            expect(map1.size()).to.equal(3);
            const entries = map1.entries().sort((a, b) => (a[0] > b[0]) - (a[0] < b[0]));
            expect(JSON.stringify(entries)).to.equal('[["bla","ble"],["how","lala"],["what",1714]]');
            return map1.set('what', { is: 'different' });
          })
          .then(() => {
            expect(map1.size()).to.equal(3);
            expect(map1.get('what').is).to.equal('different');
            return map1.unload();
          })
          .then(() => {
            expect(map1.size()).to.equal(0);
            map1 = new PersistentCachedMap('first');
            expect(map1.size()).to.equal(0);
            return map1.init();
          })
          .then(() => {
            expect(map1.size()).to.equal(3);
            const entries = map1.entries().sort((a, b) => (a[0] > b[0]) - (a[0] < b[0]));
            const keys = map1.keys().sort();
            expect(JSON.stringify(entries)).to.equal('[["bla","ble"],["how","lala"],["what",{"is":"different"}]]');
            expect(JSON.stringify(keys)).to.equal('["bla","how","what"]');
            expect(map1.has('bla')).to.equal(true);
            expect(map1.has('ble')).to.equal(false);
            return map1.delete('bla');
          })
          .then(() => {
            expect(map1.has('bla')).to.equal(false);
            expect(map1.has('how')).to.equal(true);
            return map1.unload();
          })
          .then(() => {
            map1 = new PersistentCachedMap('firstt');
            return map1.init();
          })
          .then(() => {
            expect(map1.size()).to.equal(0);
            map1 = new PersistentCachedMap('first');
            return map1.init();
          })
          .then(() => {
            expect(map1.size()).to.equal(2);
            return map1.clear();
          })
          .then(() => {
            expect(map1.size()).to.equal(0);
            return map1.unload();
          })
          .then(() => {
            map1 = new PersistentCachedMap('first');
            return map1.init();
          })
          .then(() => {
            expect(map1.size()).to.equal(0);
          });
      });
    });
  });
