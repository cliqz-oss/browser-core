/* global chai, describeModule */
/* eslint no-param-reassign : off */

const jsonData = require('../../../antitracking/prob.json');
const Rx = require('rxjs');
const fastUrlParser = require('fast-url-parser');
const tldts = require('tldts');
const encoding = require('text-encoding');
const mockDexie = require('../../core/unit/utils/dexie');

const testPages = require('./attrack-test-data');

const resources = {
  'prob.json': jsonData,
  'ipv4_btree_packed.json': {
    tree: [],
    countries: [],
    width: 1,
  }
};

class MockResourceStorage {
  constructor(path) {
    this.name = path[path.length - 1];
  }

  load() {
    if (resources[this.name]) {
      return Promise.resolve(JSON.stringify(resources[this.name]));
    }
    return Promise.reject(`load rejected for ${this.name}`);
  }

  save() {}
}

const THIRD_PARTY_HOST1 = '127.0.0.1:60508';
const THIRD_PARTY_HOST2 = 'cliqztest2.de:60508';

const mockRequestHeaders = [
  { name: 'Cookie', value: 'uid=234239gjvbadsfdsaf' },
  { name: 'Referer', value: '' },
];

const mockResponseHeaders = [
  { name: 'Content-Length', value: '0' },
];

function isThirdParty(url) {
  return url.indexOf(THIRD_PARTY_HOST1) > -1 || url.indexOf(THIRD_PARTY_HOST2) > -1;
}

function expectNoModification(resp) {
  if (resp.response) {
    chai.expect(resp.response).not.have.property('cancel');
    chai.expect(resp.response).not.have.property('redirectUrl');
    chai.expect(resp.response).not.have.property('requestHeaders');
  } else {
    chai.expect(resp.response).to.be.undefined;
  }
}

const listenerStub = {
  addListener() {},
  removeListener() {},
};

export default describeModule('antitracking/attrack',
  () => ({
    ...mockDexie,
    'platform/console': {
      default: console,
    },
    'core/http': {
      default: {},
      fetch: url => Promise.reject(`fetch rejected for ${url}`),
    },
    'core/fast-url-parser': {
      default: fastUrlParser
    },
    'core/zlib': {},
    'core/resource-manager': {
      default: {
        addResourceLoader() {},
      }
    },
    'core/gzip': {
      compress: false,
    },
    'platform/lib/tldts': tldts,
    'platform/lib/rxjs': {
      default: Rx,
    },
    'platform/addon-check': {
      checkInstalledPrivacyAddons() { return Promise.resolve([]); }
    },
    'platform/browser': {
      getBrowserMajorVersion() {
        return 60;
      }
    },
    'platform/url': {},
    'platform/crypto': {},
    'platform/database': {},
    'core/search-engines': {},
    'platform/environment': {
      default: {
        getWindow() { return null; },
        setInterval() {},
        setTimeout() {},
        clearInterval() {},
        clearTimeout() {},
      }
    },
    'core/prefs': {
      default: {
        get() { return null; },
        set() {},
      }
    },
    'core/services/telemetry': {
      default: {
        isEnabled: () => true,
        push: () => {},
      },
    },
    'platform/fetch': {
    },
    'platform/globals': {},
    'platform/platform': {
      default: {},
    },
    'platform/resource-loader-storage': {
      default: MockResourceStorage,
    },
    'platform/tabs': {
      default: {
        onCreated: listenerStub,
        onUpdated: listenerStub,
        onRemoved: listenerStub,
      }
    },
    'platform/text-encoder': {
      default: encoding.TextEncoder,
    },
    'platform/text-decoder': {
      default: encoding.TextDecoder,
    },
    'platform/webrequest': {
      default: {
        onBeforeRequest: listenerStub,
        onBeforeSendHeaders: listenerStub,
        onHeadersReceived: listenerStub,
      },
    },
    'platform/windows': { default: false },
    'platform/antitracking/storage': {
      default: {
        getItem() {
          return Promise.resolve();
        },
        setItem() {},
        removeItem() {},
      }
    },
    'antitracking/legacy/database': {
      default: () => {},
      migrateTokenDomain: () => Promise.resolve(),
      migrateRequestKeyValue: () => Promise.resolve(),
    },
    'core/services/pacemaker': {
      default: {
        register() {},
        deregister() {},
      },
    }
  }), function () {
    let attrack;
    let pipeline;
    let config;
    let md5;

    const globalSetTimeout = setTimeout;
    const globalSetInterval = setInterval;

    beforeEach(async function () {
      global.setTimeout = () => {};
      global.setInterval = () => {};

      const CliqzAttrack = this.module().default;
      attrack = new CliqzAttrack();

      pipeline = (await this.system.import('webrequest-pipeline/background')).default;
      await pipeline.init();
      const kord = await this.system.import('core/kord/inject');
      kord.setGlobal({
        modules: {
          'webrequest-pipeline': {
            background: pipeline,
            isReady: () => Promise.resolve(true),
          }
        }
      });
      md5 = (await this.system.import('core/helpers/md5')).default;
      const Config = (await this.system.import('antitracking/config')).default;
      config = new Config({});
      await attrack.init(config);
      const QSWhitelist = (await this.system.import('antitracking/qs-whitelists')).default;
      attrack.qs_whitelist = new QSWhitelist();
      attrack.qs_whitelist.isUpToDate = function () { return true; };
      attrack.qs_whitelist.isReady = function () { return true; };
      config.cookieEnabled = false;
      config.qsEnabled = false;
    });

    afterEach(() => {
      attrack.unload();
      pipeline.unload();

      global.setTimeout = globalSetTimeout;
      global.setInterval = globalSetInterval;
    });

    function simulatePageLoad(pageSpec) {
      return {
        onBeforeRequest: pageSpec.onBeforeRequest.map(function (reqData) {
          reqData.requestHeaders = mockRequestHeaders;
          const response = pipeline.onBeforeRequest(reqData);
          return { url: reqData.url, response };
        }),
        onBeforeSendHeaders: pageSpec.onBeforeSendHeaders.map(function (reqData) {
          reqData.requestHeaders = mockRequestHeaders;
          const response = pipeline.onBeforeSendHeaders(reqData);
          return { url: reqData.url, response };
        }),
        onHeadersReceived: pageSpec.onHeadersReceived.map(function (reqData) {
          reqData.requestHeaders = mockRequestHeaders;
          reqData.responseHeaders = mockResponseHeaders;
          const response = pipeline.onHeadersReceived(reqData);
          return { url: reqData.url, response };
        }),
      };
    }

    Object.keys(testPages).forEach(function (testPage) {
      const reqs = testPages[testPage];

      describe(testPage, function () {
        describe('cookie blocking', function () {
          describe('cookie blocking disabled', function () {
            beforeEach(function () {
              config.cookieEnabled = false;
            });

            it('allows all cookies', function () {
              const responses = simulatePageLoad(reqs);
              responses.onBeforeRequest.forEach(expectNoModification);
              responses.onBeforeSendHeaders.forEach(expectNoModification);
            });
          });

          describe('cookie blocking enabled', function () {
            beforeEach(function () {
              config.cookieEnabled = true;
            });

            it('blocks third party cookies', function () {
              const responses = simulatePageLoad(reqs);
              responses.onBeforeRequest.forEach(expectNoModification);
              responses.onBeforeSendHeaders.forEach(function (resp) {
                if (isThirdParty(resp.url)) {
                  chai.expect(resp.response).to.not.be.undefined;
                  chai.expect(resp.response).to.have.property('requestHeaders');
                } else {
                  expectNoModification(resp);
                }
              });
            });

            context('anti-tracking disabled for source domain', function () {
              beforeEach(function () {
                attrack.urlWhitelist.changeState('localhost', 'hostname', 'add');
              });

              afterEach(function () {
                attrack.urlWhitelist.changeState('localhost', 'hostname', 'remove');
              });

              it('allows all cookies on whitelisted site', function () {
                const responses = simulatePageLoad(reqs);
                responses.onBeforeRequest.forEach(expectNoModification);
                responses.onBeforeSendHeaders.forEach(expectNoModification);
              });
            });

            context('anti-tracking disabled for other domain', function () {
              beforeEach(function () {
                attrack.urlWhitelist.changeState('cliqztest2.de', 'hostname', 'add');
              });

              afterEach(function () {
                attrack.urlWhitelist.changeState('cliqztest2.de', 'hostname', 'remove');
              });

              it('still blocks cookies on other domains', function () {
                const responses = simulatePageLoad(reqs);
                responses.onBeforeRequest.forEach(expectNoModification);
                responses.onBeforeSendHeaders.forEach(function (resp) {
                  if (isThirdParty(resp.url)) {
                    chai.expect(resp.response).to.not.be.undefined;
                    chai.expect(resp.response).to.have.property('requestHeaders');
                  } else {
                    expectNoModification(resp);
                  }
                });
              });
            });
          });
        });

        context('QS blocking', function () {
          beforeEach(function () {
            config.qsEnabled = true;
          });

          it('allows query strings on domains not in the tracker list', function () {
            const responses = simulatePageLoad(reqs);
            responses.onBeforeRequest.forEach(expectNoModification);
            responses.onBeforeRequest.forEach(expectNoModification);
            responses.onBeforeSendHeaders.forEach(expectNoModification);
          });

          describe('when third party on tracker list', function () {
            let key;
            let trackerHash;

            beforeEach(function () {
              key = md5('uid');
              trackerHash = md5('127.0.0.1').substring(0, 16);
              attrack.qs_whitelist.addSafeToken(trackerHash, '');
              config.tokenDomainCountThreshold = 2;
              attrack.pipelineSteps.tokenChecker.tokenDomain.clear();
            });

            it('allows QS first time on tracker', function () {
              const responses = simulatePageLoad(reqs);
              responses.onBeforeRequest.forEach(expectNoModification);
              responses.onBeforeSendHeaders.forEach(expectNoModification);
            });

            context('when domain count exceeded', function () {
              const uid = '04C2EAD03BAB7F5E-2E85855CF4C75134';

              function expectThirdPartyBlock(req) {
                if (isThirdParty(req.url) && req.url.indexOf(uid) > -1) {
                  // request was already redirected
                } else {
                  expectNoModification(req);
                }
              }

              beforeEach(function () {
                config.tokenDomainCountThreshold = 0;
              });

              it('blocks long tokens on tracker domain', function () {
                const responses = simulatePageLoad(reqs);
                responses.onBeforeRequest.forEach(expectThirdPartyBlock);
                responses.onBeforeSendHeaders.forEach(function (req) {
                  if (isThirdParty(req.url) && req.url.indexOf(uid) > -1) {
                    // request was already redirected
                  } else {
                    expectNoModification(req);
                  }
                });
              });

              it('does not block if safekey', function () {
                attrack.qs_whitelist.addSafeKey(trackerHash, key);

                const responses = simulatePageLoad(reqs);
                responses.onBeforeRequest.forEach(expectNoModification);
                responses.onBeforeSendHeaders.forEach(expectNoModification);
              });

              it('blocks if key listed as unsafe', function () {
                attrack.qs_whitelist.addSafeKey(trackerHash, key);
                attrack.qs_whitelist.addUnsafeKey(trackerHash, key);

                const responses = simulatePageLoad(reqs);
                responses.onBeforeRequest.forEach(expectThirdPartyBlock);
                responses.onBeforeSendHeaders.forEach(function (req) {
                  if (isThirdParty(req.url) && req.url.indexOf(uid) > -1) {
                    // request was already redirected
                  } else {
                    expectNoModification(req);
                  }
                });
              });

              it('does not block if whitelisted token', function () {
                const tok = md5(uid);
                attrack.qs_whitelist.addSafeToken(trackerHash, tok);

                const responses = simulatePageLoad(reqs);
                responses.onBeforeRequest.forEach(expectNoModification);
                responses.onBeforeSendHeaders.forEach(expectNoModification);
              });

              context('anti-tracking disabled for source domain', function () {
                beforeEach(function () {
                  attrack.urlWhitelist.changeState('localhost', 'hostname', 'add');
                });

                afterEach(function () {
                  attrack.urlWhitelist.changeState('localhost', 'hostname', 'remove');
                });

                it('allows all tokens on whitelisted site', function () {
                  const responses = simulatePageLoad(reqs);
                  responses.onBeforeRequest.forEach(expectNoModification);
                  responses.onBeforeSendHeaders.forEach(expectNoModification);
                });
              });
            });
          });
        });
      });
    });

    describe('onBeforeRequest', function () {
      const uid = '04C2EAD03BAB7F5E-2E85855CF4C75134';

      beforeEach(function () {
        config.qsEnabled = true;
        attrack.qs_whitelist.addSafeToken(md5('tracker.com').substring(0, 16), '');
        config.tokenDomainCountThreshold = 0; // block first time
        return attrack.initPipeline();
      });

      it('removes all occurances of uid in the request', function () {
        const mainDoc = pipeline.onBeforeRequest({
          tabId: 34,
          frameId: 34,
          parentFrameId: 34,
          method: 'GET',
          type: 6,
          url: 'http://cliqztest.com/',
          requestHeaders: mockRequestHeaders,
          originUrl: '',
          sourceUrl: '',
        });
        chai.expect(mainDoc).to.not.have.property('cancel');
        chai.expect(mainDoc).to.not.have.property('redirectUrl');
        chai.expect(mainDoc).to.not.have.property('requestHeaders');
        const response = pipeline.onBeforeRequest({
          tabId: 34,
          frameId: 34,
          parentFrameId: 34,
          method: 'GET',
          type: 11,
          url: `http://tracker.com/track;uid=${uid}?uid2=${uid}&encuid=${encodeURIComponent(uid)}`,
          requestHeaders: mockRequestHeaders,
          originUrl: 'http://cliqztest.com',
          sourceUrl: 'http://cliqztest.com',
          isPrivate: false,
        });
        chai.expect(response).to.have.property('redirectUrl');
        chai.expect(response.redirectUrl).to.not.contain(uid);
        chai.expect(response.redirectUrl).to.not.contain(encodeURIComponent(uid));
      });

      it('removes also after subsequent redirect with same uid', function () {
        const mainDoc = pipeline.onBeforeRequest({
          tabId: 34,
          frameId: 34,
          parentFrameId: 34,
          method: 'GET',
          type: 6,
          url: 'http://cliqztest.com/',
          requestHeaders: mockRequestHeaders,
          originUrl: '',
          sourceUrl: '',
        });
        chai.expect(mainDoc).to.not.have.property('cancel');
        chai.expect(mainDoc).to.not.have.property('redirectUrl');
        chai.expect(mainDoc).to.not.have.property('requestHeaders');
        let response = pipeline.onBeforeRequest({
          tabId: 34,
          frameId: 34,
          parentFrameId: 34,
          method: 'GET',
          type: 11,
          url: `http://tracker.com/track;uid=${uid}?uid2=${uid}&encuid=${encodeURIComponent(uid)}`,
          requestHeaders: mockRequestHeaders,
          originUrl: 'http://cliqztest.com',
          sourceUrl: 'http://cliqztest.com',
          isPrivate: false,
        });
        chai.expect(response).to.have.property('redirectUrl');
        chai.expect(response.redirectUrl).to.not.contain(uid);
        chai.expect(response.redirectUrl).to.not.contain(encodeURIComponent(uid));

        response = pipeline.onBeforeRequest({
          tabId: 34,
          frameId: 34,
          parentFrameId: 34,
          method: 'GET',
          type: 11,
          url: `http://tracker.com/track;uid=cliqz.com/tracking&uid2=cliqz.com/tracking&uid=${uid}?uid2=${uid}&encuid=${encodeURIComponent(uid)}`,
          requestHeaders: mockRequestHeaders,
          originUrl: 'http://cliqztest.com',
          sourceUrl: 'http://cliqztest.com',
          isPrivate: false,
        });
        chai.expect(response).to.have.property('redirectUrl');
        chai.expect(response.redirectUrl).to.not.contain(uid);
        chai.expect(response.redirectUrl).to.not.contain(encodeURIComponent(uid));
      });
    });
  });
