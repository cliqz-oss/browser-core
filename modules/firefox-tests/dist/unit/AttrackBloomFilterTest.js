DEPS.AttrackBloomFilterTest = ["core/utils"];
TESTS.AttrackBloomFilterTest = function (CliqzUtils) {
  var CLIQZ = CliqzUtils.getWindow().CLIQZ
  if (!CLIQZ.app.modules.antitracking) {
    return;
  }
  var { AttrackBloomFilter, BloomFilter } = getModule('antitracking/bloom-filter'),
    md5 = getModule('core/helpers/md5').default;

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

      const mock_bloom_filter_major = '{"bkt": [1, 2, 3, 4, 5], "k": 5}';
      const mock_bloom_filter_minor = '{"bkt": [1, 0, 0, 0, 0], "k": 5}';
      const mock_bloom_filter_config = (day) => `{"major": "${day}", "minor": "1"}`;

      function mockFilterUpdate(day) {
        return Promise.all([
          testServer.registerPathHandler(`/bloom_filter/${day}/0.gz`, function(request, response) {
            response.write(mock_bloom_filter_major);
          }),
          testServer.registerPathHandler(`/bloom_filter/${day}/1.gz`, function(request, response) {
            response.write(mock_bloom_filter_minor);
          }),
          testServer.registerPathHandler('/bloom_filter/config', function(request, response) {
            response.write(mock_bloom_filter_config(day));
          }),
        ]).then(() => {
          whitelist = new AttrackBloomFilter(
            null,
            `http://localhost:${testServer.port}/bloom_filter/config`,
            `http://localhost:${testServer.port}/bloom_filter/`
          );

          return whitelist.update();
        });
      }

      it('returns false if lists have not been updated', function() {
        chai.expect(whitelist.isUpToDate()).to.be.false;
      });

      describe('list updating', function() {
        const today = (new Date()).toISOString().substring(0, 10);

        beforeEach(function() {
          return mockFilterUpdate(today);
        });

        it('returns true', function() {
          chai.expect(whitelist.isUpToDate()).to.be.true;
          chai.expect(whitelist.version.major).to.equal(today);
          chai.expect(whitelist.bloomFilter.k).to.equal(5);
        });
      });

      describe('update to an older list', () => {
        const day = new Date();
        day.setDate(day.getDate() - 1);
        const yesterday = day.toISOString().substring(0, 10);

        beforeEach(function() {
          return mockFilterUpdate(yesterday);
        });

        it('returns true', function() {
          chai.expect(whitelist.isUpToDate()).to.be.true;
          chai.expect(whitelist.version.major).to.equal(yesterday);
        });
      });

      describe('update to an out of date list', () => {
        const day = new Date();
        day.setDate(day.getDate() - 3);
        const yester3day = day.toISOString().substring(0, 10);

        beforeEach(function() {
          return mockFilterUpdate(yester3day);
        });

        it('returns false', function() {
          chai.expect(whitelist.isUpToDate()).to.be.false;
          chai.expect(whitelist.version.major).to.equal(yester3day);
        });
      });
    });
  });
};
