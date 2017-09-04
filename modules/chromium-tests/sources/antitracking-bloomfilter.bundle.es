/* global chai */
/* global testServer */
/* global waitFor */

import { AttrackBloomFilter, BloomFilter } from '../antitracking/bloom-filter';
import md5 from '../antitracking/md5';


describe('AttrackBloomFilter', function() {
  var whitelist;

  beforeEach(function() {
    whitelist = new AttrackBloomFilter();
    whitelist.bloomFilter = new BloomFilter('0000000000000000000', 5);
  });

  it('config url is correct', function() {
    chai.expect(whitelist.configURL).to.equal('https://cdn.cliqz.com/anti-tracking/bloom_filter/config');
  });

  it('base update url is correct', function() {
    chai.expect(whitelist.baseURL).to.equal('https://cdn.cliqz.com/anti-tracking/bloom_filter/');
  });

  describe('isTrackerDomain', function() {

    var domain = md5('example.com');

    it('returns false if domain not in tokens list', function() {
      chai.expect(whitelist.isTrackerDomain(domain)).to.be.false;
    });

    it('returns true if domain has been added to bloom filter', function() {
      whitelist.addSafeToken(domain, "");
      chai.expect(whitelist.isTrackerDomain(domain)).to.be.true;
    });

    it('returns false if domain is only in safe key list', function() {
      whitelist.addSafeKey(domain, md5('test'));
      chai.expect(whitelist.isTrackerDomain(domain)).to.be.false;
    });

  });

  describe('addSafeKey', function() {
    var domain = md5('example.com'),
        key = md5('callback');

    it('adds a key to the safekey list', function() {
      whitelist.addSafeKey(domain, key);
      chai.expect(whitelist.isSafeKey(domain, key)).to.be.true;
    });

  });

  describe('addUnsafeKey', function() {
    var domain = md5('example.com'),
        key = md5('callback');

    it('adds a key to the unsafekey list', function() {
      whitelist.addUnsafeKey(domain, key);
      chai.expect(whitelist.isUnsafeKey(domain, key)).to.be.true;
    });
  });

  describe('addSafeToken', function() {
    var domain = md5('example.com'),
        token = md5('safe');

    it('adds a key to the token list', function() {
      whitelist.addSafeToken(domain, token);
      chai.expect(whitelist.isSafeToken(domain, token)).to.be.true;
    });
  });

  describe('isUpToDate', function() {

    it('returns false if lists have not been updated', function() {
      chai.expect(whitelist.isUpToDate()).to.be.false;
    });

    describe('list update', function() {
      var mock_bloom_filter_major = "{\"bkt\": [1, 2, 3, 4, 5], \"k\": 5}",
          mock_bloom_filter_minor = "{\"bkt\": [1, 0, 0, 0, 0], \"k\": 5}",
          mock_bloom_filter_config = '{"major": "0", "minor": "1"}';

      beforeEach(function() {
        return Promise.all([
          testServer.registerPathHandler('/bloom_filter/0/0.gz', mock_bloom_filter_major),
          testServer.registerPathHandler('/bloom_filter/0/1.gz', mock_bloom_filter_minor),
          testServer.registerPathHandler('/bloom_filter/config', mock_bloom_filter_config),
        ]).then(() => {
          whitelist = new AttrackBloomFilter(
            testServer.getBaseUrl('bloom_filter/config'),
            testServer.getBaseUrl('bloom_filter/')
          );

          return whitelist.update();
        });
      });

      it('returns true', function() {
        chai.expect(whitelist.isUpToDate()).to.be.true;
        chai.expect(whitelist.version.major).to.equal('0');
        chai.expect(whitelist.bloomFilter.k).to.equal(5);
      });
    });
  });
});
