/* global chai, describeModule */
/* eslint no-param-reassign: off */

const tldts = require('tldts');
const punycode = require('punycode');

class MockPersistantObject {
  load() {
    return Promise.resolve({});
  }

  setValue() {}
}

export default describeModule('core/url-whitelist',
  () => ({
    'core/prefs': {
      default: {
        get() {},
      },
    },
    'core/persistent-state': {
      LazyPersistentObject: MockPersistantObject,
    },
    'platform/environment': {},
    'platform/lib/tldts': tldts,
    'platform/lib/punycode': {
      default: punycode,
    },
    'platform/platform': {
      default: {},
      isBetaVersion: () => false,
      isOnionModeFactory: () => (() => false),
    }
  }), function () {
    let urlWhitelist;

    beforeEach(function () {
      const UrlWhitelist = this.module().default;
      urlWhitelist = new UrlWhitelist('test');
      return urlWhitelist.init();
    });

    it('returns false for non whitelisted domain', function () {
      chai.expect(urlWhitelist.isWhitelisted('https://example.com')).to.be.false;
    });

    describe('add domain to url whitelist', function () {
      afterEach(function () {
        urlWhitelist.changeState('https://example.com', 'hostname', 'remove');
      });

      it('adds a source domain to the whitelist', function () {
        urlWhitelist.changeState('https://example.com', 'hostname', 'add');
        chai.expect(urlWhitelist.isWhitelisted('https://example.com')).to.be.true;
      });

      it('does not add any other domains to the whitelist', function () {
        urlWhitelist.changeState('https://example.com', 'hostname', 'add');
        chai.expect(urlWhitelist.isWhitelisted('https://another.example.com')).to.be.false;
      });
    });

    describe('remove domain from url whitelist', function () {
      afterEach(function () {
        urlWhitelist.changeState('https://example.com', 'hostname', 'remove');
        urlWhitelist.changeState('https://another.example.com', 'hostname', 'remove');
      });

      it('removes a domain from the whitelist', function () {
        urlWhitelist.changeState('https://example.com', 'hostname', 'add');
        urlWhitelist.changeState('https://example.com', 'hostname', 'remove');
        chai.expect(urlWhitelist.isWhitelisted('https://example.com')).to.be.false;
      });

      it('does not remove other domains', function () {
        urlWhitelist.changeState('https://example.com', 'hostname', 'add');
        urlWhitelist.changeState('https://another.example.com', 'hostname', 'add');
        urlWhitelist.changeState('https://example.com', 'hostname', 'remove');

        chai.expect(urlWhitelist.isWhitelisted('https://example.com')).to.be.false;
        chai.expect(urlWhitelist.isWhitelisted('https://another.example.com')).to.be.true;
      });
    });
  });
