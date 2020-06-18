/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable no-await-in-loop */

/* global chai */
/* global describeModule */

const expect = chai.expect;

const VERBOSE = false;
function wrapLog(log) {
  return VERBOSE ? log : (() => {});
}

async function mockedResponse({ body = '', error = false } = {}) {
  return {
    ok: !error,
    statusText: error ? 500 : 200,
    async json() {
      return JSON.parse(body);
    },
  };
}

const MOCKS = {
  reset() {
    this.dates = ['20200101', '20200102', '20200103', '20200104'];
    this.today = '20200102';
    this.fakeKey = 'BARClm1SExH0+0gDAVZzuo0h13y433m5aiLcOdD0EZ5Gpvh1MNqQO86NncHM75pQiosg4629b2Pqst5VG6jAY6M=';
    this.fakeImportedKey = 'faked-imported-key';
    this.fetch = async () => {
      this.fetch._numCalls += 1;
      const pubKeys = {};
      this.dates.forEach((d) => { pubKeys[d] = this.fakeKey; });
      const body = JSON.stringify({ pubKeys });
      return mockedResponse({ body });
    };
    this.fetch._numCalls = 0;
    this.importKey = async () => this.fakeImportedKey;
  },
};

export default describeModule('hpn-lite/server-public-key-accessor',
  () => ({
    'platform/globals': {
      default: {}
    },
    'platform/crypto': {
      default: {
        subtle: {
          importKey(...args) {
            return MOCKS.importKey(...args);
          },
        },
      },
    },
    'core/http': {
      fetch(...args) { return MOCKS.fetch(...args); }
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
    describe('#ServerPublicKeyAccessor', function () {
      let ServerPublicKeyAccessor;
      let MemoryPersistentMap;
      let storage;
      let uut;
      const someStorageKey = 'test-storage-key';

      const assumeKeysOnDisk = async (storedKeys) => {
        const entry = storedKeys.map(({ date, key }) => [date, Buffer.from(key, 'base64')]);
        await storage.set(someStorageKey, entry);
      };

      const oldCrypto = global.crypto;
      beforeEach(async function () {
        /* eslint-disable-next-line global-require */
        global.crypto = global.crypto || {
          subtle: {
            importKey(...args) {
              return MOCKS.importKey(...args);
            },
          }
        };

        // in-memory implementation of storage
        MemoryPersistentMap = (await this.system.import('core/helpers/memory-map')).default;
        ServerPublicKeyAccessor = this.module().default;
        storage = new MemoryPersistentMap();
        const config = {
          HUMAN_WEB_LITE_COLLECTOR_DIRECT: '192.0.2.0' // TEST-NET-1 address
        };
        uut = new ServerPublicKeyAccessor({
          config,
          storage,
          storageKey: someStorageKey,
        });
        MOCKS.reset();
      });

      afterEach(function () {
        global.crypto = oldCrypto;
      });

      it('should be able to retrieve a key and cache it (happy path)', async function () {
        expect(await uut.getKey(MOCKS.today)).to.deep.equal({
          date: MOCKS.today,
          publicKey: MOCKS.fakeImportedKey,
        });
      });

      it('should be able to retrieve a key and cache it (race during initialization)', async function () {
        const results = await Promise.all([
          uut.getKey(MOCKS.today),
          uut.getKey(MOCKS.today),
          Promise.resolve().then(() => uut.getKey(MOCKS.today)),
          uut.getKey(MOCKS.today),
        ]);

        for (const result of results) {
          expect(result).to.deep.equal({
            date: MOCKS.today,
            publicKey: MOCKS.fakeImportedKey,
          });
        }
        expect(MOCKS.fetch._numCalls).to.equal(1);
      });

      it('should persist loaded keys to disk', async function () {
        await assumeKeysOnDisk([
          { date: MOCKS.today, key: MOCKS.fakeKey }
        ]);

        expect(await uut.getKey(MOCKS.today)).to.deep.equal({
          date: MOCKS.today,
          publicKey: MOCKS.fakeImportedKey,
        });
        expect(MOCKS.fetch._numCalls).to.equal(0);
      });
    });
  });
