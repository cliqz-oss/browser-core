/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai, describeModule */
/* eslint no-param-reassign: off */

function checkList(list, template) {
  const arrayList = [];
  while (list !== null) {
    arrayList.push(list);
    list = list.next;
  }

  chai.expect(arrayList.length).to.equal(template.length);

  for (let i = 0; i < template.length; i += 1) {
    const n1 = template[i];
    const n2 = arrayList[i];

    // Check next value
    if (i < (arrayList.length - 1)) {
      chai.expect(n2.next.value).to.equal(arrayList[i + 1].value);
      chai.expect(n2.next.key).to.equal(arrayList[i + 1].key);
    }

    // Check previous value
    if (i > 0) {
      chai.expect(n2.prev.value).to.equal(arrayList[i - 1].value);
      chai.expect(n2.prev.key).to.equal(arrayList[i - 1].key);
    }

    Object.keys(n1).forEach((key) => {
      chai.expect(n1[key]).to.equal(n2[key]);
    });
  }
}


export default describeModule('core/helpers/fixed-size-cache',
  function () {
    return {
    };
  },
  function () {
    describe('#get', function () {
      let MapCached;

      context('on new cache object', function () {
        beforeEach(function () {
          MapCached = this.module().default;
        });

        it('is an empty cache', function () {
          const buildValue = k => `${k}>>>`;
          const maxSize = 7777;
          const lru = new MapCached(buildValue, maxSize);
          // Statistics
          chai.expect(lru._missCounter).to.equal(0);
          chai.expect(lru._hitCounter).to.equal(0);

          // LRU cache
          chai.expect(lru.lru.maxSize).to.equal(maxSize);
          chai.expect(lru.lru.head).to.equal(null);
          chai.expect(lru.lru.tail).to.equal(null);
          chai.expect(lru.lru.size).to.equal(0);
        });

        it('handles cache miss properly', function () {
          const key = 'somekey';
          const buildValue = () => key;
          const lru = new MapCached(buildValue, 1);
          lru.get(key);
          chai.expect(lru.lru.size).to.equal(1);
          chai.expect(lru._missCounter).to.equal(1);
          chai.expect(lru._hitCounter).to.equal(0);
        });

        it('calls buildValue on cache miss', function (done) {
          const buildValue = () => done();
          const lru = new MapCached(buildValue, 1);
          lru.get('somekey');
        });

        it('calls buildKey on cache miss', function (done) {
          const buildValue = key => `${key}<<<`;
          const buildKey = () => done();
          const lru = new MapCached(buildValue, 1, buildKey);
          lru.get('somekey');
        });

        it('gives full argument to buildValue instead of result of buildKey', function (done) {
          const argument = { key: 'somekey' };
          const buildKey = arg => arg.key;
          const buildValue = (k) => {
            chai.expect(k).to.deep.equal(argument);
            done();
          };
          const lru = new MapCached(buildValue, 1, buildKey);
          lru.get(argument);
        });

        it('returns the return value of buildValue', function () {
          const buildValue = key => `${key}---`;
          const key = 'somekey';
          const lru = new MapCached(buildValue, 1);
          chai.expect(lru.get(key)).to.equal(buildValue(key));
        });
      });

      context('on cache of size 1', function () {
        it('properly maintains linked list with size 1', function () {
          const buildValue = key => `>>>${key}<<<`;
          const lru = new MapCached(buildValue, 1);
          ['k1', 'k2', 'k3'].forEach((key) => {
            const value = buildValue(key);
            chai.expect(lru.get(key)).to.equal(value);
            chai.expect(lru.lru.size).to.equal(1);
            chai.expect(lru.lru.head.prev).to.equal(null);
            chai.expect(lru.lru.tail.next).to.equal(null);
            chai.expect(lru.lru.tail.key).to.equal(key);
            chai.expect(lru.lru.tail.value).to.equal(value);
          });

          chai.expect(lru._hitCounter).to.equal(0);
          chai.expect(lru._missCounter).to.equal(3);
        });
      });

      context('on cache of size 2', function () {
        it('properly maintains linked list with size 2', function () {
          let buildCount = 0;
          const buildValue = (key) => {
            buildCount += 1;
            return `>>>${key}<<<`;
          };
          const lru = new MapCached(buildValue, 2);

          chai.expect(lru._missCounter).to.equal(0);
          chai.expect(lru._hitCounter).to.equal(0);
          chai.expect(buildCount).to.equal(0);

          // Insert keys
          const keys = ['k1', 'k2', 'k3', 'k4', 'k5', 'k6'];
          for (let i = 0; i < keys.length; i += 1) {
            const key = keys[i];
            lru.get(key);
            chai.expect(lru._missCounter).to.equal(i + 1);
            chai.expect(lru._hitCounter).to.equal(0);
            chai.expect(buildCount).to.equal(i + 1);
          }

          // Check final list
          checkList(lru.lru.head, [
            { prev: null, key: 'k6', value: buildValue('k6') },
            { next: null, key: 'k5', value: buildValue('k5') },
          ]);
        });

        it('retrieves values from cache', function () {
          const buildValue = key => `>>>${key}<<<`;
          const lru = new MapCached(buildValue, 2);

          // Insert keys
          ['k1', 'k2', 'k3', 'k4', 'k5', 'k6'].forEach((key) => {
            lru.get(key);
          });

          const cacheMiss = lru._missCounter;
          const cacheHit = lru._hitCounter;

          lru.get('k6');
          chai.expect(lru._hitCounter).to.equal(cacheHit + 1);
          chai.expect(lru._missCounter).to.equal(cacheMiss);

          lru.get('k5');
          chai.expect(lru._hitCounter).to.equal(cacheHit + 2);
          chai.expect(lru._missCounter).to.equal(cacheMiss);
        });
      });

      context('on cache of size 3', function () {
        it('properly maintains linked list with size 2', function () {
          let buildCount = 0;
          const buildValue = (key) => {
            buildCount += 1;
            return `>>>${key}<<<`;
          };
          const lru = new MapCached(buildValue, 3);

          chai.expect(lru._missCounter).to.equal(0);
          chai.expect(lru._hitCounter).to.equal(0);
          chai.expect(buildCount).to.equal(0);

          // Insert keys
          const keys = ['k1', 'k2', 'k3', 'k4', 'k5', 'k6'];
          for (let i = 0; i < keys.length; i += 1) {
            const key = keys[i];
            lru.get(key);
            chai.expect(lru._missCounter).to.equal(i + 1);
            chai.expect(lru._hitCounter).to.equal(0);
            chai.expect(buildCount).to.equal(i + 1);
          }

          // Check final list
          checkList(lru.lru.head, [
            { prev: null, key: 'k6', value: buildValue('k6') },
            { key: 'k5', value: buildValue('k5') },
            { next: null, key: 'k4', value: buildValue('k4') },
          ]);
        });
      });
    });
  });
