/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai, describeModule */
const moment = require('moment');
const pako = require('pako');

const mockStorage = new Map();

class MockStorage {
  constructor(filePath) {
    this.key = [
      'resource-loader',
      ...filePath,
    ].join(':');
  }

  load() {
    return Promise.resolve(mockStorage.get(this.key));
  }

  save(data) {
    mockStorage.set(this.key, data);
    return Promise.resolve();
  }
}

const mockFetchResults = new Map();

function mockFetch(url) {
  if (mockFetchResults.has(url)) {
    const response = mockFetchResults.get(url);
    mockFetchResults.delete(url);
    return response;
  }
  return Promise.resolve({
    ok: false,
  });
}

function mockUpdateFile(version, useDiff = true) {
  return {
    ok: true,
    json: () => ({
      version,
      useDiff,
    })
  };
}

function testWhitelist(whitelist) {
  chai.expect(whitelist.isTrackerDomain('example.com')).to.be.true;
  chai.expect(whitelist.isTrackerDomain('cliqz.com')).to.be.false;
  chai.expect(whitelist.shouldCheckDomainTokens('facebook.com')).to.be.true;
  chai.expect(whitelist.shouldCheckDomainTokens('cliqz.com')).to.be.false;

  chai.expect(whitelist.isSafeToken('', 'api-key')).to.be.true;
  chai.expect(whitelist.isSafeToken('', '1928x234')).to.be.false;

  chai.expect(whitelist.isSafeKey('facebook.com', ':vp')).to.be.true;
  chai.expect(whitelist.isSafeKey('facebook.com', 'uid')).to.be.false;
}

let momentMock = false;

export default describeModule('antitracking/qs-whitelist2',
  () => ({
    'core/services/pacemaker': {
      default: {
        everyHour() { },
        clearTimeout() {},
      },
    },
    'core/console': {
      default: console,
    },
    'platform/globals': {
      chrome: {},
    },
    'platform/lib/zlib': pako,
    'platform/resource-loader-storage': {
      default: MockStorage,
    },
    'core/http': {
      fetch: mockFetch,
      fetchArrayBuffer: mockFetch,
    },
    'platform/lib/moment': {
      default: (...args) => {
        if (momentMock) {
          return momentMock(...args);
        }
        return moment(...args);
      },
    },
    'core/logger': {
      default: {
        get: () => {},
      },
    },
    'antitracking/logger': {
      default: {
        info: () => {},
        debug: () => {},
        error: () => {},
      }
    },
  }), function () {
    let whitelist;
    let fromBase64;
    const MOCK_CDN = 'https://cdn';
    const MOCK_BF_B64 = 'AAAAAgrdwUcnN1113w==';
    const MOCK_BF_DIFF_B64 = 'AAAAAgp4yhHUIy5ERA==';

    beforeEach(async function () {
      const QSWhitelist = this.module().default;
      whitelist = new QSWhitelist(MOCK_CDN);
      fromBase64 = (await this.system.import('core/encoding')).fromBase64;
    });

    afterEach(() => {
      mockStorage.clear();
      mockFetchResults.clear();
    });

    context('loading', () => {
      afterEach(() => whitelist.destroy());

      it('no local or remote bf', async () => {
        await whitelist.init();
        // bloom filter is an empty one
        chai.expect(whitelist.bloomFilter).to.be.not.null;
        chai.expect(whitelist.isTrackerDomain('example.com')).to.be.false;
      });

      it('missing remote bloom filter file', async () => {
        const version = '2018-10-08';
        mockFetchResults.set(`${MOCK_CDN}/update.json.gz`, mockUpdateFile(version));
        mockFetchResults.set(`${MOCK_CDN}/${version}/bloom_filter.gz`, {
          ok: false,
        });
        await whitelist.init();
        chai.expect(whitelist.bloomFilter).to.not.be.null;
        chai.expect(whitelist.isTrackerDomain('example.com')).to.be.false;
      });

      it('full load from remote', async () => {
        const version = '2018-10-08';
        mockFetchResults.set(`${MOCK_CDN}/update.json.gz`, mockUpdateFile(version));
        mockFetchResults.set(`${MOCK_CDN}/${version}/bloom_filter.gz`, {
          ok: true,
          arrayBuffer: () => fromBase64(MOCK_BF_B64).buffer,
        });
        await whitelist.init();
        chai.expect(whitelist.bloomFilter).to.not.be.null;
        chai.expect(whitelist.getVersion()).to.eql({ day: version });
        testWhitelist(whitelist);
      });

      it('persists state for subsequent loads', async () => {
        const version = '2018-10-08';
        mockFetchResults.set(`${MOCK_CDN}/update.json.gz`, mockUpdateFile(version));
        mockFetchResults.set(`${MOCK_CDN}/${version}/bloom_filter.gz`, {
          ok: true,
          arrayBuffer: () => fromBase64(MOCK_BF_B64).buffer,
        });
        await whitelist.init();
        mockFetchResults.clear();
        await whitelist.destroy();
        whitelist.bloomFilter = null;
        await whitelist.init();
        chai.expect(whitelist.bloomFilter).to.not.be.null;
        chai.expect(whitelist.getVersion()).to.eql({ day: version });
        testWhitelist(whitelist);
      });

      it('loads diff when available', async () => {
        // do first load
        let version = '2018-10-08';
        mockFetchResults.set(`${MOCK_CDN}/update.json.gz`, mockUpdateFile(version));
        mockFetchResults.set(`${MOCK_CDN}/${version}/bloom_filter.gz`, {
          ok: true,
          arrayBuffer: () => fromBase64(MOCK_BF_B64).buffer,
        });
        await whitelist.init();
        mockFetchResults.clear();
        await whitelist.destroy();

        // mock next day with a diff file
        version = '2018-10-09';
        mockFetchResults.set(`${MOCK_CDN}/update.json.gz`, mockUpdateFile(version));
        mockFetchResults.set(`${MOCK_CDN}/${version}/bf_diff_1.gz`, {
          ok: true,
          arrayBuffer: () => fromBase64(MOCK_BF_DIFF_B64).buffer,
        });
        await whitelist.init();

        chai.expect(whitelist.getVersion()).to.eql({ day: version });
        // all previous entries should be there
        testWhitelist(whitelist);
        // also new ones
        chai.expect(whitelist.isTrackerDomain('example.org')).to.be.true;
        chai.expect(whitelist.shouldCheckDomainTokens('example.org')).to.be.true;
        chai.expect(whitelist.isSafeToken('', '1234567879')).to.be.true;
      });

      it('does not load diff when useDiff is false', async () => {
        // do first load
        let version = '2018-10-08';
        mockFetchResults.set(`${MOCK_CDN}/update.json.gz`, mockUpdateFile(version));
        mockFetchResults.set(`${MOCK_CDN}/${version}/bloom_filter.gz`, {
          ok: true,
          arrayBuffer: () => fromBase64(MOCK_BF_B64).buffer,
        });
        await whitelist.init();
        mockFetchResults.clear();
        await whitelist.destroy();

        // mock next day with a diff file
        version = '2018-10-09';
        mockFetchResults.set(`${MOCK_CDN}/update.json.gz`, mockUpdateFile(version, false));
        mockFetchResults.set(`${MOCK_CDN}/${version}/bf_diff_1.gz`, {
          ok: true,
          arrayBuffer: () => fromBase64(MOCK_BF_DIFF_B64).buffer,
        });
        mockFetchResults.set(`${MOCK_CDN}/${version}/bloom_filter.gz`, {
          ok: true,
          arrayBuffer: () => fromBase64(MOCK_BF_B64).buffer,
        });
        await whitelist.init();

        chai.expect(whitelist.getVersion()).to.eql({ day: version });
        // all previous entries should be there
        testWhitelist(whitelist);
        // no new ones (because we loaded a fresh version)
        chai.expect(whitelist.isTrackerDomain('example.org')).to.be.false;
        chai.expect(whitelist.shouldCheckDomainTokens('example.org')).to.be.false;
        chai.expect(whitelist.isSafeToken('', '1234567879')).to.be.false;
      });
    });

    context('local safekey', () => {
      beforeEach(async () => {
        const version = '2018-10-08';
        mockFetchResults.set(`${MOCK_CDN}/update.json.gz`, mockUpdateFile(version));
        mockFetchResults.set(`${MOCK_CDN}/${version}/bloom_filter.gz`, {
          ok: true,
          arrayBuffer: () => fromBase64(MOCK_BF_B64).buffer,
        });
        await whitelist.init();
      });

      afterEach(() => {
        momentMock = false;
        return whitelist.destroy();
      });

      it('#addSafeKey adds a safekey for a domain', () => {
        const d = 'example.com';
        const k = 'test';
        chai.expect(whitelist.isSafeKey(d, k)).to.be.false;
        whitelist.addSafeKey(d, k);
        chai.expect(whitelist.isSafeKey(d, k)).to.be.true;
      });

      it('#cleanLocalSafekey removes safekeys after 7 days', () => {
        const d = 'example.com';
        const k = 'test';
        momentMock = () => moment().subtract(8, 'days');
        whitelist.addSafeKey(d, k);
        whitelist._cleanLocalSafekey();
        chai.expect(whitelist.isSafeKey(d, k)).to.be.true;
        momentMock = false;
        whitelist._cleanLocalSafekey();
        chai.expect(whitelist.isSafeKey(d, k)).to.be.false;
      });

      it('localSafekeys are persisted', async () => {
        const d = 'example.com';
        const k = 'test';
        whitelist.addSafeKey(d, k);
        await whitelist.destroy();
        whitelist.localSafeKey = {};
        await whitelist.init();
        chai.expect(whitelist.isSafeKey(d, k)).to.be.true;
      });
    });
  });
