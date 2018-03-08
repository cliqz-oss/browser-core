const MOCK = {
  'core/console': {
    default: {
      debug() {},
      log() {},
      error() {},
    },
  },
  'core/cliqz': {
    utils: {
      extensionVersion: null,
    },
  },
  'core/config': {
    default: {
      settings: {
        ALLOWED_COUNTRY_CODES: [],
      },
    },
  },
  'core/crypto/random': {
    default: {},
  },
  'core/events': {
    default: {},
  },
  'core/fast-url-parser': {
    default: {},
  },
  'core/helpers/md5': {
    default: () => null,
  },
  'core/http': {
    fetch: {},
  },
  'core/inject': {
    default: {},
  },
  'core/utils': {
    default: {
      getDetailsFromUrl: () => { notUndefined: true },
    },
  },
  'core/window-api': {
    default: {},
  },
  'human-web/ad-detection': {
    normalizeAclkUrl: {},
  },
  'human-web/bloom-filter': {
    default: {},
  },
  'human-web/doublefetch-handler': {
    default: class {},
  },
  'human-web/content-extraction-patterns-loader': {
    default: class {},
  },
  'platform/browser': {
    getActiveTab: {},
  },
  'platform/human-web/dns': {
    default: {},
  },
  'platform/human-web/opentabs': {
    getAllOpenPages: {},
  },
  'platform/human-web/storage': {
    default: {},
  },
  'platform/human-web/tabInfo': {
    getTabInfo: {},
  },
  'platform/url': {
    default: {},
    isURI: {},
    URI: {},
  },
};

export default describeModule('human-web/human-web',
  () => MOCK,
  () => {
    describe('#sanitizeResultTelemetry', () => {
      let HumanWeb;
      let sanitizeResultTelemetry;
      let data;
      let isSuspiciousQuerySpy;


      beforeEach(function () {
        HumanWeb = this.module().default;

        // TODO: how to properly mock this?
        HumanWeb.counter = 1;
        HumanWeb.bloomFilter = {
          testSingle: () => false,
        };
        HumanWeb.dns = {
          getDNS: () => Promise.resolve(''),
        };

        sanitizeResultTelemetry = HumanWeb.sanitizeResultTelemetry;
        data = {
          q: 'a query',
          msg: {
            u: 'https://www.cliqz.de',
          },
        };
      });

      it('rejects if HumanWeb is not initialized', () => {
        HumanWeb.counter = 0;
        return chai.expect(sanitizeResultTelemetry(data)).to.be.rejected;
      });

      it('rejects `null` query', () => {
        data.q = null;
        return chai.expect(sanitizeResultTelemetry(data)).to.be.rejected;
      });

      it('rejects empty query', () => {
        data.q = '';
        return chai.expect(sanitizeResultTelemetry(data)).to.be.rejected;
      });

      // TODO: test `isSuspiciousQuery` separately
      it('overwrites suspicious query', () => {
        data.q = 'hw@cliqz.com';
        return sanitizeResultTelemetry(data)
          .then(({ query }) => chai.expect(query).to.equal('(PROTECTED)'));
      });

      // TODO: test `isSuspiciousURL` and `dropLongURL` separately
      it('overwrites dangerous query', () => {
        data.q = 'http://www.abc.de?0123456789';
        return sanitizeResultTelemetry(data)
          .then(({ query }) => chai.expect(query).to.equal('(PROTECTED)'));
      });

      // TODO: test if `bloomFilter` was used

      // TODO: test `isSuspiciousURL` separately
      it('overwrites suspicious URL', () => {
        data.msg.u = 'http://www.abc.de?0123456789';
        return sanitizeResultTelemetry(data)
          .then(({ url }) => chai.expect(url).to.equal('(PROTECTED)'));
      });

      // TODO: test `dropLongURL` separately
      it('overwrites dangerous URL', () => {
        data.msg.u = 'hw@cliqz.com';
        return sanitizeResultTelemetry(data)
          .then(({ url }) => chai.expect(url).to.equal('(PROTECTED)'));
      });

      it('does not change unsuspicous query and URL', () => {
        data.q = 'cliqz'
        data.msg.u = 'https://www.cliqz.com';
        return sanitizeResultTelemetry(data)
          .then(({ query, url }) => chai.expect({ query, url }).to.deep.equal({
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
