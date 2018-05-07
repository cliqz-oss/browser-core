const tldjs = require('tldjs');

class MockPersistantObject {
  constructor() {}
  load() {
    return Promise.resolve({});
  }
  setValue() {}
}

export default describeModule('core/url-whitelist',
() => ({
  'core/console': {
    default: {
      debug() {},
      log() {},
      error(...args) { console.log('ERROR', ...args); },
    },
  },
  'core/prefs': {},
  'core/persistent-state': {
    LazyPersistentObject: MockPersistantObject,
  },
  'core/utils': {
    default: {
      // just putting the implementation here because I shouldn't have to mock everything for utils
      // just to import such a basic function.
      cleanUrlProtocol: (url) => {
        const urlLowered = url.toLowerCase();
        if (urlLowered.startsWith('http://')) {
          url = url.slice(7);
        }
        if (urlLowered.startsWith('https://')) {
          url = url.slice(8);
        }
        return url;
      }
    }
  },
  'platform/environment': {},
  'platform/prefs': {},
  'platform/lib/tldjs': {
    default: tldjs,
  },
}), function() {
  let urlWhitelist;

  beforeEach(function() {
    const UrlWhitelist = this.module().default;
    urlWhitelist = new UrlWhitelist('test');
    return urlWhitelist.init();
  });

  it('returns false for non whitelisted domain', function () {
    chai.expect(urlWhitelist.isWhitelisted('example.com')).to.be.false;
  });

  describe('add domain to url whitelist', function () {
    afterEach(function () {
      urlWhitelist.changeState('example.com', 'hostname', 'remove');
    });

    it('adds a source domain to the whitelist', function () {
      urlWhitelist.changeState('example.com', 'hostname', 'add');
      chai.expect(urlWhitelist.isWhitelisted('example.com')).to.be.true;
    });

    it('does not add any other domains to the whitelist', function () {
      urlWhitelist.changeState('example.com', 'hostname', 'add');
      chai.expect(urlWhitelist.isWhitelisted('another.example.com')).to.be.false;
    });
  });

  describe('remove domain from url whitelist', function () {
    afterEach(function () {
      urlWhitelist.changeState('example.com', 'hostname', 'remove');
      urlWhitelist.changeState('another.example.com', 'hostname', 'remove');
    });

    it('removes a domain from the whitelist', function () {
      urlWhitelist.changeState('example.com', 'hostname', 'add');
      urlWhitelist.changeState('example.com', 'hostname', 'remove');
      chai.expect(urlWhitelist.isWhitelisted('example.com')).to.be.false;
    });

    it('does not remove other domains', function () {
      urlWhitelist.changeState('example.com', 'hostname', 'add');
      urlWhitelist.changeState('another.example.com', 'hostname', 'add');
      urlWhitelist.changeState('example.com', 'hostname', 'remove');

      chai.expect(urlWhitelist.isWhitelisted('example.com')).to.be.false;
      chai.expect(urlWhitelist.isWhitelisted('another.example.com')).to.be.true;
    });
  });
});
