/* global chai, describeModule */

const expect = chai.expect;
const tldjs = require('tldjs');

const MOCK = {
  'core/events': {
    default: {},
  },
  'human-web/bloom-filter': {
    default: {},
  },
  'core/platform': {
  },
  'core/utils': {
    utils: {
      extensionVersion: null,
    },
  },
  'core/crypto/random': {
    default: Math.random.bind(Math),
  },
  'core/http': {
    fetch: {},
  },
  'core/inject': {
    default: {},
  },
  'platform/human-web/storage': {
    default: {},
  },
  'core/config': {
    default: {
      settings: {
        ALLOWED_COUNTRY_CODES: [],
      },
    },
  },
  'core/prefs': {
    default: {
      get(n, v) { return v; },
    }
  },
  'platform/human-web/opentabs': {
    getAllOpenPages: {},
  },
  'core/fast-url-parser': {
    default: {},
  },
  'platform/browser': {
    getActiveTab: {},
  },
  'human-web/doublefetch-handler': {
    default: class {},
  },
  'human-web/content-extraction-patterns-loader': {
    default: class {},
  },
  'platform/human-web/tabInfo': {
    getTabInfo: {},
  },
  'human-web/logger': {
    default: {
      debug() {},
      log() {},
      error() {},
    }
  },
  'human-web/html-helpers': {
    default: {}
  },

  // transitive dependencies: core/url
  'platform/url': {
    default: {}
  },

  'platform/globals': {
    default: {}
  },

  // transitive dependencies: human-web/network
  'platform/human-web/dns': {
    Dns: class {
      resolveHost() {
        // non-resolvable address, which will appear
        // as a public address to human-web
        return Promise.resolve('203.0.113.0');
      }

      cacheDnsResolution() {}
      flushExpiredCacheEntries() {}
    }
  },
  'platform/lib/tldjs': {
    default: tldjs,
  },
};

export default describeModule('human-web/human-web',
  () => MOCK,
  () => {
    describe('#sanitizeResultTelemetry', function () {
      let HumanWeb;
      let sanitizeResultTelemetry;
      let data;

      beforeEach(function () {
        HumanWeb = this.module().default;

        HumanWeb.counter = 1;
        HumanWeb.bloomFilter = {
          testSingle: () => false,
        };

        sanitizeResultTelemetry = HumanWeb.sanitizeResultTelemetry;
        data = {
          q: 'a query',
          msg: {
            u: 'https://www.cliqz.de',
          },
        };
      });

      // This is not a real test. It merely verifies that the mocking
      // works as expected. For now, I leave it in.
      //
      // If it creates problems, feel free to delete it.
      //
      it('assume that "getDetailsFromUrl" in the tests works as expected', function () {
        return this.system.import('core/url').then((mod) => {
          const result = mod.getDetailsFromUrl('http://www.abc.test?0123456789');
          expect(result).to.include({
            host: 'www.abc.test',
            query: '0123456789',
          });
        });
      });

      it('rejects if HumanWeb is not initialized', function () {
        HumanWeb.counter = 0;
        return chai.expect(sanitizeResultTelemetry(data)).to.be.rejected;
      });

      it('rejects `null` query', function () {
        data.q = null;
        return chai.expect(sanitizeResultTelemetry(data)).to.be.rejected;
      });

      it('rejects empty query', function () {
        data.q = '';
        return chai.expect(sanitizeResultTelemetry(data)).to.be.rejected;
      });

      // TODO: test `isSuspiciousQuery` separately
      it('overwrites suspicious query', function () {
        data.q = 'hw@cliqz.com';
        return sanitizeResultTelemetry(data)
          .then(({ query }) => chai.expect(query).to.equal('(PROTECTED)'));
      });

      // TODO: test `isSuspiciousURL` and `dropLongURL` separately
      it('overwrites dangerous query', function () {
        data.q = 'http://www.abc.de?0123456789';
        return sanitizeResultTelemetry(data)
          .then(({ query }) => chai.expect(query).to.equal('(PROTECTED)'));
      });

      // TODO: test if `bloomFilter` was used

      // TODO: test `isSuspiciousURL` separately
      it('overwrites suspicious URL', function () {
        data.msg.u = 'http://www.abc.de?0123456789';
        return sanitizeResultTelemetry(data)
          .then(({ url }) => chai.expect(url).to.equal('(PROTECTED)'));
      });

      // TODO: test `dropLongURL` separately
      it('overwrites dangerous URL', function () {
        data.msg.u = 'hw@cliqz.com';
        return sanitizeResultTelemetry(data)
          .then(({ url }) => chai.expect(url).to.equal('(PROTECTED)'));
      });

      it('does not change unsuspicous query and URL', function () {
        data.q = 'cliqz';
        data.msg.u = 'https://www.cliqz.com';
        return sanitizeResultTelemetry(data)
          .then(({ query, url }) => chai.expect({ query, url }).to.eql({
            query: 'cliqz',
            url: 'https://www.cliqz.com',
          }));
      });

      // TODO: test `checkSearchURL` and `maskURL` separately
      // TODO: initialize `HumanWeb.rArray` somehow for this to work
      // it('overwrites dangerous URL', () => {
      //   data.msg.u = 'https://www.google.com/aclk?sa=l&ai=DChcSEwjpp9b-1eXVAhXFlRsKHXgAA9gYABAHGgJ3bA';
      //   return sanitizeResultTelemetry(data)
      //     .then(({ url }) => chai.expect(url).to.equal('https://www.google.com (PROTECTED)'));
      // });
    });
  }
);
