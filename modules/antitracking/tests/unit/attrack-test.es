/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai, describeModule */
/* eslint no-param-reassign : off */

const Rx = require('rxjs');
const operators = require('rxjs/operators');
const moment = require('moment');
const jsonData = require('../../../antitracking/prob.json');
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
    return Promise.reject(new Error(`load rejected for ${this.name}`));
  }

  save() {}

  delete() {}
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
    rxjs: Rx,
    'rxjs/operators': operators,
    'platform/console': {
      default: console,
    },
    'core/http': {
      default: {},
      fetch: (url) => {
        if (url.endsWith('/prob.json')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(resources['prob.json']),
          });
        }
        return Promise.reject(new Error(`fetch rejected for ${url}`));
      },
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
    'platform/addon-check': {
      checkInstalledPrivacyAddons() { return Promise.resolve([]); }
    },
    'platform/browser': {
      getBrowserMajorVersion() {
        return 60;
      },
      checkIsWindowActive() {
        return Promise.resolve(false);
      },
    },
    'platform/url': {},
    'platform/crypto': {},
    'core/services/pacemaker': {
      default: {
        register() {},
        everyFewMinutes() {},
        setTimeout() {},
        clearTimeout() {},
        everyHour() {},
        nextIdle() {},
      },
    },
    'core/search-engines': {},
    'core/prefs': {
      default: {
        get() { return null; },
        set() {},
      }
    },
    'platform/fetch': {
    },
    'platform/globals': {
      chrome: {},
    },
    'platform/platform': {
      default: {},
      isBetaVersion: () => false,
    },
    'platform/resource-loader-storage': {
      default: MockResourceStorage,
    },
    'platform/tabs': {
      default: {
        onCreated: listenerStub,
        onUpdated: listenerStub,
        onRemoved: listenerStub,
        onActivated: listenerStub,
        query: () => Promise.resolve([]),
      }
    },
    'platform/webnavigation': {
      default: {
        onBeforeNavigate: listenerStub,
        onCommitted: listenerStub,
        onDOMContentLoaded: listenerStub,
        onCompleted: listenerStub,
      }
    },
    'platform/webrequest': {
      VALID_RESPONSE_PROPERTIES: {
        onBeforeRequest: [
          'cancel',
          'redirectUrl',
        ],
        onBeforeSendHeaders: [
          'cancel',
          'requestHeaders',
        ],
        onSendHeaders: [
        ],
        onHeadersReceived: [
          'cancel',
          'redirectUrl',
          'responseHeaders',
        ],
        onAuthRequired: [
          'cancel',
        ],
        onResponseStarted: [
        ],
        onBeforeRedirect: [
        ],
        onCompleted: [
        ],
        onErrorOccurred: [
        ],
      },
      default: {
        onBeforeRequest: listenerStub,
        onBeforeSendHeaders: listenerStub,
        onHeadersReceived: listenerStub,
        onCompleted: listenerStub,
        onErrorOccurred: listenerStub,
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
      },
    },
    'antitracking/legacy/database': {
      default: () => {},
      migrateTokenDomain: () => Promise.resolve(),
      migrateRequestKeyValue: () => Promise.resolve(),
    },
    'platform/lib/moment': {
      default: moment,
    },
    'core/services/telemetry': {
      default: {
        isEnabled: () => false,
        register: () => {},
        unregister: () => {},
      }
    },
  }), function () {
    let attrack;
    let pipeline;
    let config;
    let md5;
    let truncatedHash;

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
        },
        services: {
          telemetry: {
            api: {
              isEnabled: () => true,
              push: () => {},
            },
          },
        },
      });
      const md5Module = await this.system.import('core/helpers/md5');
      md5 = md5Module.default;
      truncatedHash = md5Module.truncatedHash;
      const Config = (await this.system.import('antitracking/config')).default;
      config = new Config({});
      await attrack.init(config);
      // const QSWhitelist = (await this.system.import('antitracking/qs-whitelist2')).default;
      // attrack.qs_whitelist = new QSWhitelist();
      attrack.qs_whitelist.isUpToDate = function () { return true; };
      attrack.qs_whitelist.isReady = function () { return true; };
      config.cookieEnabled = false;
      config.qsEnabled = false;
      config.placeHolder = '<removed>';
    });

    afterEach(() => {
      attrack.unload();
      pipeline.unload();

      global.setTimeout = globalSetTimeout;
      global.setInterval = globalSetInterval;
    });

    function simulatePageLoad(pageSpec) {
      pipeline.pageStore.onTabCreated({
        ...pageSpec.tab
      });
      return {
        onBeforeRequest: pageSpec.onBeforeRequest.map(function (reqData) {
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
              trackerHash = truncatedHash('127.0.0.1');
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
        attrack.qs_whitelist.addSafeToken(truncatedHash('tracker.com'), '');
        config.tokenDomainCountThreshold = 0; // block first time
        return attrack.initPipeline();
      });

      it('removes all occurances of uid in the request', function () {
        const mainDoc = pipeline.onBeforeRequest({
          tabId: 34,
          frameId: 0,
          parentFrameId: -1,
          method: 'GET',
          type: 'main_frame',
          url: 'http://cliqztest.com/',
          requestHeaders: mockRequestHeaders,
          frameAncestors: [],
        });
        chai.expect(mainDoc).to.not.have.property('cancel');
        chai.expect(mainDoc).to.not.have.property('redirectUrl');
        chai.expect(mainDoc).to.not.have.property('requestHeaders');
        const response = pipeline.onBeforeRequest({
          tabId: 34,
          frameId: 0,
          parentFrameId: -1,
          method: 'GET',
          type: 'xmlhttprequest',
          url: `http://tracker.com/track;uid=${uid}?uid2=${uid}&encuid=${encodeURIComponent(uid)}`,
          requestHeaders: mockRequestHeaders,
          initiator: 'http://cliqztest.com',
          isPrivate: false,
          frameAncestors: [],
        });
        chai.expect(response).to.have.property('redirectUrl');
        chai.expect(response.redirectUrl).to.not.contain(uid);
        chai.expect(response.redirectUrl).to.not.contain(encodeURIComponent(uid));
      });

      it('removes also after subsequent redirect with same uid', function () {
        const mainDoc = pipeline.onBeforeRequest({
          tabId: 34,
          frameId: 0,
          parentFrameId: -1,
          method: 'GET',
          type: 'main_frame',
          url: 'http://cliqztest.com/',
          requestHeaders: mockRequestHeaders,
          originUrl: '',
          tabUrl: '',
          frameAncestors: [],
        });
        chai.expect(mainDoc).to.not.have.property('cancel');
        chai.expect(mainDoc).to.not.have.property('redirectUrl');
        chai.expect(mainDoc).to.not.have.property('requestHeaders');
        let response = pipeline.onBeforeRequest({
          tabId: 34,
          frameId: 0,
          parentFrameId: -1,
          method: 'GET',
          type: 'xmlhttprequest',
          url: `http://tracker.com/track;uid=${uid}?uid2=${uid}&encuid=${encodeURIComponent(uid)}`,
          requestHeaders: mockRequestHeaders,
          originUrl: 'http://cliqztest.com',
          tabUrl: 'http://cliqztest.com',
          isPrivate: false,
          frameAncestors: [],
        });
        chai.expect(response).to.have.property('redirectUrl');
        chai.expect(response.redirectUrl).to.not.contain(uid);
        chai.expect(response.redirectUrl).to.not.contain(encodeURIComponent(uid));

        response = pipeline.onBeforeRequest({
          tabId: 34,
          frameId: 0,
          parentFrameId: -1,
          method: 'GET',
          type: 'xmlhttprequest',
          url: `http://tracker.com/track;uid=cliqz.com/tracking&uid2=cliqz.com/tracking&uid=${uid}?uid2=${uid}&encuid=${encodeURIComponent(uid)}`,
          requestHeaders: mockRequestHeaders,
          originUrl: 'http://cliqztest.com',
          tabUrl: 'http://cliqztest.com',
          isPrivate: false,
          frameAncestors: [],
        });
        chai.expect(response).to.have.property('redirectUrl');
        chai.expect(response.redirectUrl).to.not.contain(uid);
        chai.expect(response.redirectUrl).to.not.contain(encodeURIComponent(uid));
      });
    });
  });
