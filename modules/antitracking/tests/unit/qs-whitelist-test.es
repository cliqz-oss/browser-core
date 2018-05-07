
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

export default describeModule('antitracking/qs-whitelists',
() => ({
  'core/console': {
    default: console,
  },
  'core/resource-loader': {
    Resource: MockResource,
  },
  'core/utils': {
    default: {
      getWindow() {
        return null;
      }
    }
  },
  'antitracking/telemetry': {},
  'antitracking/utils': {},
  'platform/antitracking/storage': {
    default: {
      getItem() {
        return Promise.resolve();
      },
      setItem() {},
    }
  },
}), function() {
  let whitelist;
  let md5;

  beforeEach(function() {
    const QSWhitelist = this.module().default;
    whitelist = new QSWhitelist();
    return this.system.import('core/helpers/md5').then((mod) => {
      md5 = mod.default;
    });
  });

  it('token whitelist URL is correct', function () {
    chai.expect(whitelist.TOKEN_WHITELIST_URL).to.equal('https://cdn.cliqz.com/anti-tracking/whitelist/whitelist_tokens.json');
  });

  it('tracer domain list URL is correct', function () {
    chai.expect(whitelist.TRACKER_DM_URL).to.equal('https://cdn.cliqz.com/anti-tracking/whitelist/tracker_domains.json');
  });

  it('safekey list URL is correct', function () {
    chai.expect(whitelist.SAFE_KEY_URL).to.equal('https://cdn.cliqz.com/anti-tracking/whitelist/domain_safe_key.json');
  });

  it('unsafekey list URL is correct', function () {
    chai.expect(whitelist.UNSAFE_KEY_URL).to.equal('https://cdn.cliqz.com/anti-tracking/whitelist/domain_unsafe_key.json');
  });

  describe('isTrackerDomain', function () {
    let domain;

    beforeEach(() => {
      domain = md5('example.com');
    });

    it('returns false if domain not in tokens list', function () {
      chai.expect(whitelist.isTrackerDomain(domain)).to.be.false;
    });

    it('returns true if domain in tokens list', function () {
      whitelist.addSafeToken(domain, '');
      chai.expect(whitelist.isTrackerDomain(domain)).to.be.true;
    });

    it('returns false if domain is only in safe key list', function () {
      whitelist.addSafeKey(domain, '');
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
      whitelist.addSafeToken(domain, '');
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

});