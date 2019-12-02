/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai */
/* global describeModule */

const expect = chai.expect;

const pako = require('pako');
const crypto = require('crypto');
const mockDexie = require('../../core/unit/utils/dexie');

function hash512(x) {
  return crypto.createHash('sha512').update(x).digest();
}

function makeFakeGroupPublicKey(str) {
  return Buffer.concat([
    hash512(str),
    hash512(str),
    hash512(str),
    hash512(str),
    hash512(str),
    hash512(str),
  ]).toString('base64');
}

export default describeModule('hpnv2/manager',
  () => ({
    ...mockDexie,
    'platform/lib/zlib': pako,
    'platform/crypto': {
      default: {},
    },
    'core/http': {
      default: {},
    },
    'platform/fetch': {
      default: {},
    },
    'platform/prefs': {
      setPref: () => {},
    },
    'platform/globals-components': {
      default: {},
    },
    'platform/globals': {
      default: {},
    },
    'platform/console': {
      default: {},
    },
    'core/console': {
      isLoggingEnabled: () => false,
      default: {},
    },
    'core/gzip': {
      default: {},
    },
    'core/services/pacemaker': {
      default: {
        setTimeout() {},
        clearTimeout() {},
      },
    },
  }),
  () => {
    describe('#Manager', () => {
      let Manager;

      beforeEach(function () {
        Manager = this.module().default;
      });

      describe('#checkGroupPublicKeys', () => {
        function setupOldKeys(dates, seed = '') {
          const keys = {};
          for (const date of dates) {
            keys[date] = {
              groupPubKey: Buffer.from(makeFakeGroupPublicKey(date), 'base64'),
              pubKey: Buffer.from(makeFakeGroupPublicKey(`${date}${seed}`), 'base64'),
              date,
            };
          }
          return keys;
        }

        function setupNewKeys(dates, seed = '') {
          const keys = {};
          for (const date of dates) {
            keys[date] = makeFakeGroupPublicKey(date + seed);
          }
          return keys;
        }

        it('should pass when initializing keys for the first time', function () {
          const newKeys = setupNewKeys(['20180722', '20180723', '20180724', '20180725']);

          expect(Manager.checkGroupPublicKeys(newKeys, newKeys, undefined)).to.be.true;
          expect(Manager.checkGroupPublicKeys(newKeys, newKeys, {})).to.be.true;
        });

        it('should pass if none of the keys changed', function () {
          const oldKeys = setupOldKeys(['20180722', '20180723', '20180724', '20180725']);
          const newKeys = setupNewKeys(['20180722', '20180723', '20180724', '20180725']);

          expect(Manager.checkGroupPublicKeys(newKeys, newKeys, oldKeys)).to.be.true;
        });

        it('should pass if keys are rotated by one day', function () {
          const oldKeys = setupOldKeys(['20180722', '20180723', '20180724', '20180725']);
          const newKeys = setupNewKeys(['20180723', '20180724', '20180725', '20180726']);

          expect(Manager.checkGroupPublicKeys(newKeys, newKeys, oldKeys)).to.be.true;
        });

        it('should pass if keys are rotated by one week', function () {
          const oldKeys = setupOldKeys(['20180722', '20180723', '20180724', '20180725']);
          const newKeys = setupNewKeys(['20180729', '20180730', '20180731', '20180801']);

          expect(Manager.checkGroupPublicKeys(newKeys, newKeys, oldKeys)).to.be.true;
        });

        it('should permit the server to send keys that are in the past', function () {
          const oldKeys = setupOldKeys(['20180724', '20180725', '20180726']);
          const newKeys = setupNewKeys(['20180723', '20180724', '20180725', '20180726']);

          expect(Manager.checkGroupPublicKeys(newKeys, newKeys, oldKeys)).to.be.true;
        });

        it('should fail if existing keys do not match', function () {
          const oldKeys = setupOldKeys(['20180722', '20180723', '20180724', '20180725']);
          const newKeys = setupNewKeys(['20180722', '20180723', '20180724', '20180725']);

          const maliciousKey = makeFakeGroupPublicKey('20180722-malicious-key');
          expect(maliciousKey !== newKeys['20180722']);
          newKeys['20180722'] = maliciousKey;

          expect(Manager.checkGroupPublicKeys(newKeys, newKeys, oldKeys)).to.be.false;
        });

        it('should fail if ecdh do not match group pub keys dates', function () {
          const oldKeys = setupOldKeys(['20180722', '20180723', '20180724', '20180725']);
          const newKeys = setupNewKeys(['20180722', '20180723', '20180724', '20180725']);
          const newKeys2 = setupNewKeys(['20180722', '20180723', '20180724']);
          const newKeys3 = setupNewKeys(['20180722', '20180723', '20180724', '20180725']);
          const maliciousKey = makeFakeGroupPublicKey('20180722-malicious-key');
          expect(maliciousKey !== newKeys3['20180722']);
          newKeys3['20180722'] = maliciousKey;
          expect(Manager.checkGroupPublicKeys(newKeys, newKeys2, oldKeys)).to.be.false;
          expect(Manager.checkGroupPublicKeys(newKeys, newKeys3, oldKeys)).to.be.false;
        });

        it('should pass if ecdh were not set', function () {
          const oldKeys = setupOldKeys(['20180722', '20180723', '20180724', '20180725']);
          delete oldKeys['20180722'].pubKey;
          delete oldKeys['20180723'].pubKey;
          delete oldKeys['20180724'].pubKey;
          delete oldKeys['20180725'].pubKey;
          const newKeys = setupNewKeys(['20180722', '20180723', '20180724', '20180725']);
          const newKeys2 = setupNewKeys(['20180722', '20180723', '20180724', '20180725']);
          const maliciousKey = makeFakeGroupPublicKey('20180722-malicious-key');
          expect(maliciousKey !== newKeys2['20180722']);
          newKeys2['20180722'] = maliciousKey;
          expect(Manager.checkGroupPublicKeys(newKeys, newKeys2, oldKeys)).to.be.true;
        });
      });
    });

    describe('#InitState', () => {
      let InitState;
      let uut;

      beforeEach(function () {
        InitState = this.module().InitState;
        uut = new InitState();
      });

      it('should start in UNINITIALIZED state', function () {
        expect(uut.isUninitialized()).to.be.true;
      });

      it('should support "happy path" state transitions', function () {
        expect(uut.isUninitialized()).to.be.true;
        expect(uut.isUnloaded()).to.be.true;
        expect(uut.isReady()).to.be.false;

        uut.updateState(InitState.INIT_PENDING);
        expect(uut.isUninitialized()).to.be.false;
        expect(uut.isUnloaded()).to.be.false;
        expect(uut.isReady()).to.be.false;

        uut.updateState(InitState.READY);
        expect(uut.isUninitialized()).to.be.false;
        expect(uut.isUnloaded()).to.be.false;
        expect(uut.isReady()).to.be.true;


        uut.updateState(InitState.DESTROYED);
        expect(uut.isUninitialized()).to.be.false;
        expect(uut.isUnloaded()).to.be.true;
        expect(uut.isReady()).to.be.false;
      });

      it('should support staying in destroyed state', function () {
        uut.updateState(InitState.DESTROYED);
        uut.updateState(InitState.DESTROYED);
      });

      [0, 1, 30000].forEach((timeoutInMs) => {
        it(`during initialization should allow to wait for state READY (timeout: ${timeoutInMs})`, function (done) {
          uut.updateState(InitState.INIT_PENDING);
          uut.waitUntilReady(timeoutInMs).then(() => {
            done();
          });

          uut.updateState(InitState.READY);
        });

        it(`should give up if the state gets destroyed (timeout: ${timeoutInMs})`, function (done) {
          uut.waitUntilReady(timeoutInMs).catch(() => {
            // immediate error is expected
            done();
          });

          uut.updateState(InitState.DESTROYED);
        });
      });
    });
  });
