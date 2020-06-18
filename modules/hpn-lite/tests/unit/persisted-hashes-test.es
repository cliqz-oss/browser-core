/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable no-await-in-loop */

/* global chai */
/* global sinon */
/* global describeModule */

const expect = chai.expect;
const fc = require('fast-check');

const VERBOSE = false;
function wrapLog(log) {
  return VERBOSE ? log : (() => {});
}

const NEVER_EXPIRES = Number.MAX_SAFE_INTEGER;

export default describeModule('hpn-lite/persisted-hashes',
  () => ({
    'platform/globals': {
      default: {}
    },
    'core/logger': {
      default: {
        get() {
          return {
            debug: wrapLog(console.debug),
            log: wrapLog(console.log),
            info: wrapLog(console.log),
            warn: wrapLog(console.warn),
            error: wrapLog(console.error),
          };
        },
      },
    },
  }),
  () => {
    describe('#PersistedHashes', function () {
      let MemoryPersistentMap;
      let PersistedHashes;
      let storage;
      let uut;
      let clock;

      const assumeExistingHashesOnDisk = async (existingHashes) => {
        const dummyTTL = Date.now() + 1;
        await storage.set('dummy-key', {
          hashes: existingHashes.map(key => [key, dummyTTL]),
          nextPrune: dummyTTL,
        });
      };

      const initMocks = () => {
        if (clock) {
          clock.restore();
        }
        clock = sinon.useFakeTimers(new Date('2020-01-17'));
        storage = new MemoryPersistentMap();
        uut = new PersistedHashes({ storage, storageKey: 'dummy-key' });
      };


      beforeEach(async function () {
        // in-memory implementation of storage
        MemoryPersistentMap = (await this.system.import('core/helpers/memory-map')).default;
        PersistedHashes = this.module().default;

        initMocks();
      });

      afterEach(function () {
        clock.restore();
        clock = null;
      });

      it('should allow adding and deleting keys (happy path)', async function () {
        expect(await uut.has('x')).to.be.false;
        expect(await uut.add('x', NEVER_EXPIRES)).to.be.true;

        // now the key should exist
        expect(await uut.has('x')).to.be.true;
        expect(await uut.add('x', NEVER_EXPIRES)).to.be.false; // not modified

        // now delete it
        expect(await uut.delete('x')).to.be.true;
        expect(await uut.has('x')).to.be.false;
        expect(await uut.delete('x')).to.be.false; // not modified
      });

      it('should load existing data from disk (happy path)', async function () {
        await assumeExistingHashesOnDisk(['old1', 'old2']);

        // then
        expect(await uut.has('old1')).to.be.true;
        expect(await uut.has('old2')).to.be.true;
        expect(await uut.has('new1')).to.be.false;

        // when a new key is added
        expect(await uut.add('new1', NEVER_EXPIRES)).to.be.true;

        // then
        expect(await uut.has('old1')).to.be.true;
        expect(await uut.has('old2')).to.be.true;
        expect(await uut.has('new1')).to.be.true;
      });

      it('should clean up keys with expired TTL', async function () {
        // given
        const ttl = 60;
        await uut.add('x', Date.now() + ttl);
        expect(await uut.has('x')).to.be.true;

        // when
        clock.tick(ttl + 1);

        // then
        expect(await uut.has('x')).to.be.false;
      });

      it('should have no false-negatives (i.e. hashes being added must never be forgotten)', async function () {
        await fc.assert(fc.asyncProperty(fc.array(fc.string()), async (keys) => {
          // given
          await Promise.all(keys.map(key => uut.add(key, NEVER_EXPIRES)));

          // then
          for (const key of keys) {
            expect(await uut.has(key)).to.equal(true, `key <${key}> not found by "has"`);
          }
          for (const key of keys) {
            expect(await uut.add(key, NEVER_EXPIRES)).to.equal(false, `key <${key}> not found by "add"`);
          }
        }).beforeEach(() => {
          initMocks();
        }));
      });

      it('should purge expired keys', async function () {
        let countWrites = 0;
        let lastWritten = null;
        storage.set = async (key, value) => {
          lastWritten = value;
          countWrites += 1;
        };
        const ttl = 60;

        await uut.add('x', Date.now() + ttl);
        await uut.add('y', Date.now() + ttl);
        await uut.flush();
        expect(lastWritten.hashes.map(x => x[0])).to.have.same.members(['x', 'y']);
        expect(countWrites).to.equal(1);

        await uut.add('z', Date.now() + ttl);
        await uut.flush();
        expect(lastWritten.hashes.map(x => x[0])).to.have.same.members(['x', 'y', 'z']);
        expect(countWrites).to.equal(2);

        // make sure the default pruning interval has expired
        clock.tick(365 * 24 * 60 * 60 * 1000);

        // now all entries should have been purged
        await uut.flush();
        expect(lastWritten.hashes.map(x => x[0])).to.have.same.members([]);
        expect(countWrites).to.equal(3);
      });

      it('should persist all written keys', async function () {
        let countWrites = 0;
        let lastWritten = null;
        storage.set = async (key, value) => {
          lastWritten = value;
          countWrites += 1;
        };
        const keys = [...new Array(1000)].map((_, i) => `key${i}`);
        await Promise.all(keys.map(key => uut.add(key, NEVER_EXPIRES)));

        await uut.flush();
        expect(lastWritten.hashes.map(x => x[0])).to.have.same.members(keys);
        expect(countWrites).to.equal(1);
      });
    });
  });
