
let mockRemoteResources = {};

class MockResource {
  constructor(path, { remoteURL }) {
    this.name = remoteURL;
  }

  updateFromRemote() {
    if (mockRemoteResources[this.name]) {
      return Promise.resolve(mockRemoteResources[this.name]);
    }
    return Promise.reject(`not found: ${this.name}`);
  }
}

const CONFIG_URL = 'https://cdn.cliqz.com/anti-tracking/bloom_filter/config';

export default describeModule('antitracking/bloom-filter',
() => ({
  'platform/antitracking/storage': {
    default: {
      getItem() {
        return Promise.resolve();
      },
      setItem() {},
    }
  },
  'core/resource-loader': {
    Resource: MockResource,
  },
  'core/resource-manager': {},
  'core/pacemaker': {
    default: {
      register() {},
    }
  },
  'core/utils': {
    default: {

    }
  },
  'core/console': {
    default: console,
  },
  'antitracking/telemetry': {},
  'antitracking/utils': {},
}),  function() {
  let whitelist;
  let md5;

  beforeEach(function() {
    const { AttrackBloomFilter, BloomFilter } = this.module();
    whitelist = new AttrackBloomFilter();
    whitelist.bloomFilter = new BloomFilter('0000000000000000000', 5);
    mockRemoteResources = {};
    return this.system.import('core/helpers/md5').then((mod) => {
      md5 = mod.default;
    });
  });

  it('config url is correct', function () {
    chai.expect(whitelist.configURL).to.equal(CONFIG_URL);
  });

  it('base update url is correct', function () {
    chai.expect(whitelist.baseURL).to.equal('https://cdn.cliqz.com/anti-tracking/bloom_filter/');
  });

  describe('isTrackerDomain', function () {

    it('returns false if domain not in tokens list', function () {
      const domain = md5('example.com');
      chai.expect(whitelist.isTrackerDomain(domain)).to.be.false;
    });

    it('returns true if domain has been added to bloom filter', function () {
      const domain = md5('example.com');
      whitelist.addSafeToken(domain, '');
      chai.expect(whitelist.isTrackerDomain(domain)).to.be.true;
    });

    it('returns false if domain is only in safe key list', function () {
      const domain = md5('example.com');
      whitelist.addSafeKey(domain, md5('test'));
      chai.expect(whitelist.isTrackerDomain(domain)).to.be.false;
    });

  });

  describe('addSafeKey', function () {
    it('adds a key to the safekey list', function () {
      const domain = md5('example.com');
      const key = md5('callback');

      whitelist.addSafeKey(domain, key);
      chai.expect(whitelist.isSafeKey(domain, key)).to.be.true;
    });
  });

  describe('addUnsafeKey', function () {
    it('adds a key to the unsafekey list', function () {
      const domain = md5('example.com');
      const key = md5('callback');

      whitelist.addUnsafeKey(domain, key);
      chai.expect(whitelist.isUnsafeKey(domain, key)).to.be.true;
    });
  });

  describe('addSafeToken', function () {
    it('adds a key to the token list', function () {
      const domain = md5('example.com');
      const token = md5('safe');


      whitelist.addSafeToken(domain, token);
      chai.expect(whitelist.isSafeToken(domain, token)).to.be.true;
    });
  });

  describe('isUpToDate', function () {
    const mockBloomFilterMajor = {bkt: [1, 2, 3, 4, 5], k: 5};
    const mockBloomFilterMinor = '{"bkt": [1, 0, 0, 0, 0], "k": 5}';
    const mockBloomFilterConfig = day => ({major: day, minor: 1});

    function mockFilterUpdate(day) {
      whitelist.baseURL = '';
      mockRemoteResources[CONFIG_URL] = mockBloomFilterConfig(day);
      mockRemoteResources[`${day}/0.gz`] = mockBloomFilterMajor;
      return whitelist.update();
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