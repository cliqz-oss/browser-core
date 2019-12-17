/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai */
/* global describeModule */
const Rx = require('rxjs');
const operators = require('rxjs/operators');
const rxSandbox = require('rx-sandbox').rxSandbox;
const mockDexie = require('../../core/unit/utils/dexie');
// const rxSandbox = require('rx-sandbox').rxSandbox;
const { Subject } = Rx;

const mockDb = async () => {
  const Dexie = await mockDexie['platform/lib/dexie'].default();
  const db = new Dexie('antitracking');
  db.version(2).stores({
    tokens: 'token, lastSent, created',
    keys: 'hash, lastSent, created',
  });
  return db;
};

const mockDate = '20180820';

class MockQsWhitelist {
  constructor(md5) {
    this.trackers = ['tracker.com'].map(t => md5(t).substring(0, 16));
    this.safeKeys = ['safe'].map(md5);
    this.safeTokens = ['callback'].map(md5);
  }

  isTrackerDomain(domain) {
    return this.trackers.indexOf(domain) > -1;
  }

  isSafeKey(domain, key) {
    return this.isTrackerDomain(domain) && this.safeKeys.indexOf(key) > -1;
  }

  isSafeToken(domain, token) {
    return this.isTrackerDomain(domain) && this.safeTokens.indexOf(token) > -1;
  }
}

const tick = () => new Promise(resolve => setTimeout(resolve, 10));

const mockConfig = {
  telemetryMode: 2,
};

let mockInterval;
let mockTimer;

export default describeModule('antitracking/steps/token-telemetry', () => ({
  'platform/globals': {
    chrome: {},
  },
  'platform/runtime': {
    default: {},
  },
  rxjs: {
    ...Rx,
    interval: i => mockInterval(i),
    timer: (a, b) => mockTimer(a, b),
  },
  'rxjs/operators': operators,
  'antitracking/time': {
    getConfigTs() {
      return mockDate;
    },
  },
  'antitracking/config': {
    TELEMETRY: {
      DISABLED: 0,
      TRACKERS_ONLY: 1,
    },
  },
  'core/kord/inject': {
    default: {
      service() {
        return {
          push() {}
        };
      }
    }
  },
}), () => {
  describe('TokenTelemetry', () => {
    let TokenTelemetry;
    let telemetry;
    let whitelist;
    let db;
    let parse;
    let md5;

    beforeEach(async function () {
      parse = (await this.system.import('core/url')).parse;
      md5 = (await this.system.import('core/helpers/md5')).default;
      TokenTelemetry = this.module().default;
      whitelist = new MockQsWhitelist(md5);
      db = await mockDb();
      telemetry = new TokenTelemetry(() => {}, // telemetry
        whitelist,
        mockConfig,
        db,
        s => s.length > 6,
        {
          TOKEN_MESSAGE_SIZE: 2,
        });
    });

    afterEach(async () => {
      await db.delete();
    });

    describe('#extractKeyTokens', () => {
      let emitted;
      const testUrls = [{
        url: 'https://track.tracker.com/tracker?safe=helloworld&other=callback&bad=2349023jnfdsa&short=hi',
        tabUrl: 'https://cliqz.com',
      }, {
        url: 'https://cdn.notatracker.com/tracker?safe=helloworld&other=callback&bad=2349023jnfdsa&short=hi',
        tabUrl: 'https://www.cliqz.com',
      }];
      const expectedEmitted = [{
        key: 'safe',
        token: 'helloworld',
        safe: true,
      }, {
        key: 'other',
        token: 'callback',
        safe: true,
      }, {
        key: 'bad',
        token: '2349023jnfdsa',
        safe: false,
      }];

      function mockRequests(isPrivate = false) {
        emitted = [];
        telemetry.subjectTokens.subscribe(obj => emitted.push(obj));

        testUrls.map(({ url, tabUrl }) => ({
          isPrivate,
          url,
          tabUrl,
          urlParts: parse(url),
          tabUrlParts: parse(tabUrl),
        })).forEach(telemetry.extractKeyTokens.bind(telemetry));
      }

      context('telemetry enabled', () => {
        beforeEach(() => {
          mockRequests();
        });

        it('emits tokens to subjectTokens', () => {
          chai.expect(emitted).to.have.length(6);
          const expected = expectedEmitted.map(({ key, token, safe }) => ({
            day: mockDate,
            key: md5(key),
            token: md5(token),
            tp: md5('tracker.com').substring(0, 16),
            fp: md5('cliqz.com').substring(0, 16),
            safe,
            isTracker: true,
          })).concat(expectedEmitted.map(({ key, token }) => ({
            day: mockDate,
            key: md5(key),
            token: md5(token),
            tp: md5('notatracker.com').substring(0, 16),
            fp: md5('cliqz.com').substring(0, 16),
            safe: true,
            isTracker: false,
          })));
          chai.expect(emitted).to.eql(expected);
        });
      });

      context('telemetry trackers only', () => {
        beforeEach(() => {
          mockConfig.telemetryMode = 1;
          mockRequests();
        });

        afterEach(() => {
          mockConfig.telemetryMode = 2;
        });

        it('emits only tracker tokens to subjectTokens', () => {
          chai.expect(emitted).to.have.length(3);
          const expected = expectedEmitted.map(({ key, token, safe }) => ({
            day: mockDate,
            key: md5(key),
            token: md5(token),
            tp: md5('tracker.com').substring(0, 16),
            fp: md5('cliqz.com').substring(0, 16),
            safe,
            isTracker: true,
          }));
          chai.expect(emitted).to.eql(expected);
        });
      });

      context('telemetry disabled', () => {
        beforeEach(() => {
          mockConfig.telemetryMode = 0;
          mockRequests();
        });

        afterEach(() => {
          mockConfig.telemetryMode = 2;
        });

        it('emits no tokens to subjectTokens', () => {
          chai.expect(emitted).to.have.length(0);
        });
      });
    }); // extractKeyTokens

    context('token filtering pipeline', () => {
      let sandbox;
      const tokenMessages = {
        a: {
          day: mockDate,
          key: 'test',
          token: 'test',
          tp: 'tracker.com',
          fp: 'cliqz.com',
          safe: false,
          isTracker: true,
        },
        b: {
          day: mockDate,
          key: 'test2',
          token: 'test2',
          tp: 'tracker.com',
          fp: 'cliqz.com',
          safe: false,
          isTracker: true,
        },
        c: {
          day: mockDate,
          key: 'test',
          token: 'test',
          tp: 'tracker.com',
          fp: 'ghostery.com',
          safe: false,
          isTracker: true,
        },
        d: {
          day: mockDate,
          key: 'test',
          token: 'test2',
          tp: 'tracker.com',
          fp: 'ghostery.com',
          safe: false,
          isTracker: true,
        }
      };
      const tokenKeys = {
        a: 'test',
        b: 'test2',
      };
      const keyKeys = {
        a: 'tracker.com:test',
        b: 'tracker.com:test2',
      };

      beforeEach(() => {
        sandbox = rxSandbox.create(false, 1);
        mockInterval = () => sandbox.cold('---x---x---x');
        mockTimer = () => sandbox.hot('   -------x');
      });

      afterEach(() => {
        telemetry.unload();
      });

      async function testTokenBatching({ tokens, tokQue, keyQue }, runLoop) {
        telemetry.subjectTokens = sandbox.hot(tokens, tokenMessages);
        const expectedTokens = sandbox.e(tokQue, tokenKeys);
        const tokenSendmessages = sandbox.getMessages(telemetry.tokenSendQueue);
        const expectedKeys = sandbox.e(keyQue, keyKeys);
        const keySendMessages = sandbox.getMessages(telemetry.keySendQueue);
        telemetry.init();
        // disable token and key pipelines
        telemetry.tokens.unload();
        telemetry.keys.unload();
        if (runLoop) {
          runLoop();
        } else {
          sandbox.flush();
        }
        await tick();
        chai.expect(tokenSendmessages).to.deep.equal(expectedTokens);
        chai.expect(keySendMessages).to.deep.equal(expectedKeys);
      }

      it('With a single message: does not emit', () =>
        testTokenBatching({
          tokens: 'a---',
          tokQue: '----',
          keyQue: '----',
        }));

      it('When token only seen on single site: does not emit', () =>
        testTokenBatching({
          tokens: 'ab--',
          tokQue: '----',
          keyQue: '----',
        }));

      it('When token/key is cross site: emit', () =>
        testTokenBatching({
          tokens: 'ac--',
          tokQue: '---a',
          keyQue: '---a',
        }));

      it('Emits token/key only after buffer time', () =>
        testTokenBatching({
          tokens: 'aa-- c---',
          tokQue: '---- ---a',
          keyQue: '---- ---a',
        }));

      it('Only cross site keys will be emitted', () =>
        testTokenBatching({
          tokens: 'bda- --',
          tokQue: '---b --',
          keyQue: '---- -a', // emission is later because a's token is on a later batch
        }));

      it('Emits non-cross site tokens/keys after max-age criteria is exceeded', () =>
        testTokenBatching({
          tokens: 'ab-- ---- ab-- -',
          tokQue: '---- ---- ---- b',
          keyQue: '---- ---- ---a -',
        }, () => {
          // go to first tick
          sandbox.advanceTo(5);
          // manually reset token and key times in the cache
          const preCutoffTime = Date.now() - telemetry.NEW_ENTRY_MIN_AGE - 1;
          telemetry.tokens.get('test2').created = preCutoffTime;
          telemetry.keys.get('tracker.com:test').created = preCutoffTime;
          // complete rest of pipeline
          sandbox.flush();
        }));

      it('Cache stats can be persisted and reloaded', async () => {
        await testTokenBatching({
          tokens: 'abcd -',
          tokQue: '---a b',
          keyQue: '---a a',
        });
        const testToken = 'test2';
        const testKey = 'tracker.com:test';
        const expectedToken = telemetry.tokens.get(testToken);
        const expectedKey = telemetry.keys.get(testKey);
        // save to db
        await telemetry.tokens.saveBatchToDb([testToken]);
        await telemetry.keys.saveBatchToDb([testKey]);
        // after saving cache is not dirty
        chai.expect(expectedToken.dirty).to.be.false;
        chai.expect(expectedKey.dirty).to.be.false;
        // clear cache
        telemetry.tokens.cache.clear();
        telemetry.keys.cache.clear();
        // reload from db
        await telemetry.tokens.loadBatchIntoCache([testToken]);
        await telemetry.keys.loadBatchIntoCache([testKey]);
        // only change after loading is that dirty is now false and lastSent is set to ''
        expectedToken.dirty = true;
        expectedToken.lastSent = '';
        expectedToken.count = 3;
        expectedKey.dirty = true;
        expectedKey.lastSent = '';

        chai.expect(telemetry.tokens.get(testToken)).to.deep.equal(expectedToken);

        const actualKey = telemetry.keys.get(testKey);
        ['created', 'dirty', 'lastSent', 'key', 'tracker'].forEach((k) => {
          chai.expect(actualKey[k]).to.equal(expectedKey[k]);
        });
        chai.expect([...actualKey.sitesTokens.keys()]).to.eql([...expectedKey.sitesTokens.keys()]);
      });
    });

    context('TokenPipeline', () => {
      let sandbox;

      beforeEach(() => {
        sandbox = rxSandbox.create(false, 1);
        mockInterval = () => sandbox.hot('----x----x----x');
        mockTimer = () => sandbox.hot('----x');
      });

      afterEach(() => {
        telemetry.tokens.unload();
      });

      async function simulateTokenSending({ inp, batchSize }) {
        const messages = new Subject();
        const output = [];
        const input = sandbox.hot(inp);
        messages.subscribe(m => output.push(m));
        telemetry.tokens.init(input, messages, 1, batchSize || 10);
        return output;
      }

      it('emits message payloads for tokens and sets lastSent', async () => {
        const token = telemetry.tokens.get('a');
        token.sites.add('cliqz.com');
        token.trackers.add('tracker.com');
        token.safe = false;

        const output = await simulateTokenSending({
          inp: 'a----',
        });
        sandbox.flush();
        await tick();
        chai.expect(output).to.have.length(1);
        chai.expect(output[0]).to.eql([{
          ts: mockDate,
          token: 'a',
          safe: false,
          sites: 1,
          trackers: 1,
        }]);
        chai.expect(telemetry.tokens.get('a').lastSent).to.equal(mockDate);
      });

      it('fetches token data from db', async () => {
        const token = telemetry.tokens.get('a');
        token.sites.add('cliqz.com');
        token.trackers.add('tracker.com');
        token.safe = false;
        await telemetry.tokens.saveBatchToDb(['a']);
        telemetry.tokens.cache.clear();
        const output = await simulateTokenSending({
          inp: 'a----',
        });
        sandbox.flush();
        await tick();
        chai.expect(output).to.have.length(1);
        chai.expect(output[0]).to.eql([{
          ts: mockDate,
          token: 'a',
          safe: false,
          sites: 1,
          trackers: 1,
        }]);
        chai.expect(telemetry.tokens.get('a').lastSent).to.equal(mockDate);
      });

      it('emits the token once', async () => {
        const token = telemetry.tokens.get('a');
        token.sites.add('cliqz.com');
        token.trackers.add('tracker.com');
        token.safe = false;

        const output = await simulateTokenSending({
          inp: 'aaaa- aaa--',
        });
        sandbox.advanceTo(5);
        await tick();
        chai.expect(output).to.have.length(1);
        chai.expect(output[0]).to.eql([{
          ts: mockDate,
          token: 'a',
          safe: false,
          sites: 1,
          trackers: 1,
        }]);
        sandbox.flush();
        chai.expect(output).to.have.length(1);
      });

      it('emits the token once - cache cleared', async () => {
        const token = telemetry.tokens.get('a');
        token.sites.add('cliqz.com');
        token.trackers.add('tracker.com');
        token.safe = false;

        const output = await simulateTokenSending({
          inp: 'aaaa- aaa--',
        });
        sandbox.advanceTo(6);
        await tick();
        chai.expect(output).to.have.length(1);
        chai.expect(output[0]).to.eql([{
          ts: mockDate,
          token: 'a',
          safe: false,
          sites: 1,
          trackers: 1,
        }]);
        telemetry.tokens.cache.clear();
        sandbox.flush();
        await tick();
        chai.expect(output).to.have.length(1);
      });

      it('re-emits once lastSent is older than today', async () => {
        const token = telemetry.tokens.get('a');
        token.sites.add('cliqz.com');
        token.trackers.add('tracker.com');
        token.safe = false;

        const output = await simulateTokenSending({
          inp: 'aaaa- aaa--',
        });
        sandbox.advanceTo(5);
        await tick();
        chai.expect(output).to.have.length(1);
        chai.expect(output[0]).to.eql([{
          ts: mockDate,
          token: 'a',
          safe: false,
          sites: 1,
          trackers: 1,
        }]);
        telemetry.tokens.get('a').lastSent = '20180819';
        await telemetry.tokens.saveBatchToDb(['a']);
        sandbox.flush();
        await tick();
        chai.expect(output).to.have.length(2);
        chai.expect(output[1]).to.eql([{
          ts: mockDate,
          token: 'a',
          safe: false,
          sites: 0,
          trackers: 0,
        }]);
      });

      it('does not send more than batchSize messages per interval', async () => {
        const tokens = ['a', 'b', 'c', 'd', 'e'];
        tokens.forEach((name) => {
          const token = telemetry.tokens.get(name);
          token.sites.add('cliqz.com');
          token.trackers.add('tracker.com');
          token.safe = false;
        });

        const batchSize = 3;
        const output = await simulateTokenSending({
          inp: '(abcde)---- -----',
          batchSize,
        });
        sandbox.advanceTo(5);
        await tick();
        chai.expect(output).to.have.length(batchSize);
        sandbox.flush();
        await tick();
        chai.expect(output).to.have.length(Math.ceil(tokens.length / 2));
      });
    });

    context('KeyPipeline', () => {
      let sandbox;
      const values = {
        a: 'tracker.com:a',
        b: 'tracker.com:b',
      };

      beforeEach(() => {
        sandbox = rxSandbox.create(false, 1);
        mockInterval = () => sandbox.hot('----x----x----x');
        mockTimer = () => sandbox.hot('----x');
      });

      afterEach(() => {
        telemetry.keys.unload();
      });

      async function simulateKeySending({ inp, batchSize }) {
        const messages = new Subject();
        const output = [];
        const input = sandbox.hot(inp, values);
        messages.subscribe(m => output.push(m));
        telemetry.keys.init(input, messages, 1, batchSize || 10);
        return output;
      }

      it('emits message payloads for keys and sets lastSent', async () => {
        const key = 'tracker.com:a';
        const token = telemetry.keys.get(key);
        token.key = 'a';
        token.tracker = 'tracker.com';
        token.sitesTokens.get('cliqz.com').set('test', false);

        const output = await simulateKeySending({
          inp: 'a----',
        });
        sandbox.flush();
        await tick();
        chai.expect(output).to.have.length(1);
        // key messages are an array
        chai.expect(output[0]).to.have.length(1);
        chai.expect(output[0][0]).to.deep.eql({
          ts: mockDate,
          key: 'a',
          tracker: token.tracker,
          site: 'cliqz.com',
          tokens: [['test', false]],
        });
        chai.expect(telemetry.keys.get(key).lastSent).to.equal(mockDate);
      });

      it('sends separate messages for each site', async () => {
        const key = 'tracker.com:a';
        const token = telemetry.keys.get(key);
        token.key = 'a';
        token.tracker = 'tracker.com';
        token.sitesTokens.get('cliqz.com').set('test', false);
        token.sitesTokens.get('ghostery.com').set('test', false);

        const output = await simulateKeySending({
          inp: 'a----',
        });
        sandbox.flush();
        await tick();
        chai.expect(output).to.have.length(2);
        // key messages are an array
        chai.expect(output[0]).to.have.length(1);
        chai.expect(output[1]).to.have.length(1);
      });

      it('groups keys when the values are safe', async () => {
        ['a', 'b'].forEach((key) => {
          const token = telemetry.keys.get(`tracker.com:${key}`);
          token.key = key;
          token.tracker = 'tracker.com';
          token.sitesTokens.get('cliqz.com').set('test', true);
          token.sitesTokens.get('cliqz.com').set('test2', true);
          token.sitesTokens.get('ghostery.com').set('test', true);
        });

        const output = await simulateKeySending({
          inp: 'ab---',
        });
        sandbox.flush();
        await tick();
        chai.expect(output).to.have.length(2);
        console.log(output);
        // key messages are an array and grouped on site
        chai.expect(output[0]).to.deep.equal([
          {
            ts: mockDate,
            tracker: 'tracker.com',
            key: 'a',
            site: 'cliqz.com',
            tokens: [['test', true], ['test2', true]],
          }, {
            ts: mockDate,
            tracker: 'tracker.com',
            key: 'b',
            site: 'cliqz.com',
            tokens: [['test', true], ['test2', true]],
          }
        ]);
        chai.expect(output[1]).to.deep.equal([
          {
            ts: mockDate,
            tracker: 'tracker.com',
            key: 'a',
            site: 'ghostery.com',
            tokens: [['test', true]]
          }, {
            ts: mockDate,
            tracker: 'tracker.com',
            key: 'b',
            site: 'ghostery.com',
            tokens: [['test', true]]
          }
        ]);
      });

      it('does not groups keys when the values are unsafe', async () => {
        ['a', 'b'].forEach((key) => {
          const token = telemetry.keys.get(`tracker.com:${key}`);
          token.key = key;
          token.tracker = 'tracker.com';
          token.sitesTokens.get('cliqz.com').set('test', true);
          token.sitesTokens.get('cliqz.com').set('test2', false);
          token.sitesTokens.get('ghostery.com').set('test', false);
        });

        const output = await simulateKeySending({
          inp: 'ab---',
        });
        sandbox.flush();
        await tick();
        chai.expect(output).to.have.length(4);
      });
    });

    context('cleaning', () => {
      it('pushes entries from the cache to db', async () => {
        const token = '0089af9e6319ca82eabb65b1d571faae';
        telemetry.tokens.get(token);
        await telemetry.tokens.clean();
        const dbItems = await telemetry.tokens.db.toArray();
        chai.expect(dbItems).to.have.length(1);
        chai.expect(dbItems[0].token).to.eql(token);
        chai.expect(telemetry.tokens.cache.has(token)).to.be.true;
      });

      it('cleans cache for send entries', async () => {
        const token = '0089af9e6319ca82eabb65b1d571faae';
        telemetry.tokens.get(token).lastSent = mockDate;
        await telemetry.tokens.clean();
        const dbItems = await telemetry.tokens.db.toArray();
        chai.expect(dbItems).to.have.length(1);
        chai.expect(dbItems[0].token).to.eql(token);
        chai.expect(telemetry.tokens.cache.has(token)).to.be.true;
        // now cache is clean, next clean will clear cache
        await telemetry.tokens.clean();
        chai.expect(telemetry.tokens.cache.has(token)).to.be.false;
      });

      it('cleans old entries from the db', async () => {
        const token = '0089af9e6319ca82eabb65b1d571faae';
        Object.assign(telemetry.tokens.get(token), {
          lastSent: '20180819',
          created: 1530000007023,
        });
        // put it into the db
        await telemetry.tokens.saveBatchToDb([token]);
        // trigger cleaning of old db records
        await telemetry.tokens.clean();
        chai.expect(await telemetry.tokens.db.toArray()).to.have.length(0);
      });

      it('pushes due-for-sending entries to the send queue', async () => {
        const token = '0089af9e6319ca82eabb65b1d571faae';
        Object.assign(telemetry.tokens.get(token), {
          lastSent: '20180819',
          created: 1538120007023,
          sites: ['example.com'],
          trackers: ['cliqz.com'],
          count: 2,
        });
        const testEmitted = new Promise((resolve, reject) => {
          telemetry.tokens.input = {
            next: (t) => {
              if (t === token) {
                resolve();
              } else {
                reject();
              }
            }
          };
        });
        // put it into the db
        await telemetry.tokens.saveBatchToDb([token]);
        // trigger pulling of to-be-sent entries
        await telemetry.tokens.clean();
        chai.expect(await telemetry.tokens.db.toArray()).to.have.length(1);
        await testEmitted;
      });
    });
  });
});
