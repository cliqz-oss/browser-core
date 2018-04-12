/* eslint prefer-arrow-callback: 'off' */
/* eslint func-names: 'off' */
/* eslint no-param-reassign: 'off' */
/* eslint no-unused-expressions: 'off' */

/* global chai */
/* global testServer */

import { AttrackBloomFilter, BloomFilter } from '../antitracking/bloom-filter';
import md5 from '../core/helpers/md5';


describe('AttrackBloomFilter', function () {
  let whitelist;

  beforeEach(function () {
    whitelist = new AttrackBloomFilter();
    whitelist.bloomFilter = new BloomFilter('0000000000000000000', 5);
  });

  it('config url is correct', function () {
    chai.expect(whitelist.configURL).to.equal('https://cdn.cliqz.com/anti-tracking/bloom_filter/config');
  });

  it('base update url is correct', function () {
    chai.expect(whitelist.baseURL).to.equal('https://cdn.cliqz.com/anti-tracking/bloom_filter/');
  });

  describe('isTrackerDomain', function () {
    const domain = md5('example.com');

    it('returns false if domain not in tokens list', function () {
      chai.expect(whitelist.isTrackerDomain(domain)).to.be.false;
    });

    it('returns true if domain has been added to bloom filter', function () {
      whitelist.addSafeToken(domain, '');
      chai.expect(whitelist.isTrackerDomain(domain)).to.be.true;
    });

    it('returns false if domain is only in safe key list', function () {
      whitelist.addSafeKey(domain, md5('test'));
      chai.expect(whitelist.isTrackerDomain(domain)).to.be.false;
    });
  });

  describe('addSafeKey', function () {
    const domain = md5('example.com');
    const key = md5('callback');

    it('adds a key to the safekey list', function () {
      whitelist.addSafeKey(domain, key);
      chai.expect(whitelist.isSafeKey(domain, key)).to.be.true;
    });
  });

  describe('addUnsafeKey', function () {
    const domain = md5('example.com');
    const key = md5('callback');

    it('adds a key to the unsafekey list', function () {
      whitelist.addUnsafeKey(domain, key);
      chai.expect(whitelist.isUnsafeKey(domain, key)).to.be.true;
    });
  });

  describe('addSafeToken', function () {
    const domain = md5('example.com');
    const token = md5('safe');

    it('adds a key to the token list', function () {
      whitelist.addSafeToken(domain, token);
      chai.expect(whitelist.isSafeToken(domain, token)).to.be.true;
    });
  });

  describe('isUpToDate', function () {
    const mockBloomFilterMajor = '{"bkt": [1, 2, 3, 4, 5], "k": 5}';
    const mockBloomFilterMinor = '{"bkt": [1, 0, 0, 0, 0], "k": 5}';
    const mockBloomFilterConfig = day => `{"major": "${day}", "minor": "1"}`;

    function mockFilterUpdate(day) {
      return Promise.all([
        testServer.registerPathHandler(`/bloomFilter/${day}/0.gz`, mockBloomFilterMajor),
        testServer.registerPathHandler(`/bloomFilter/${day}/1.gz`, mockBloomFilterMinor),
        testServer.registerPathHandler('/bloomFilter/config', mockBloomFilterConfig(day)),
      ]).then(() => {
        whitelist = new AttrackBloomFilter(
          null,
          testServer.getBaseUrl('bloomFilter/config'),
          testServer.getBaseUrl('bloomFilter/')
        );

        return whitelist.update();
      });
    }

    it('returns false if lists have not been updated', function () {
      chai.expect(whitelist.isUpToDate()).to.be.false;
    });

    describe('list updating', function () {
      const today = (new Date()).toISOString().substring(0, 10);

      beforeEach(function () {
        return mockFilterUpdate(today);
      });

      it('returns true', function () {
        chai.expect(whitelist.isUpToDate()).to.be.true;
        chai.expect(whitelist.version.major).to.equal(today);
        chai.expect(whitelist.bloomFilter.k).to.equal(5);
      });
    });

    describe('update to an older list', () => {
      const day = new Date();
      day.setDate(day.getDate() - 1);
      const yesterday = day.toISOString().substring(0, 10);

      beforeEach(function () {
        return mockFilterUpdate(yesterday);
      });

      it('returns true', function () {
        chai.expect(whitelist.isUpToDate()).to.be.true;
        chai.expect(whitelist.version.major).to.equal(yesterday);
      });
    });

    describe('update to an out of date list', () => {
      const day = new Date();
      day.setDate(day.getDate() - 3);
      const yester3day = day.toISOString().substring(0, 10);

      beforeEach(function () {
        return mockFilterUpdate(yester3day);
      });

      it('returns false', function () {
        chai.expect(whitelist.isUpToDate()).to.be.false;
        chai.expect(whitelist.version.major).to.equal(yester3day);
      });
    });
  });
});
