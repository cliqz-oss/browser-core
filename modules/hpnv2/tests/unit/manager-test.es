/* global chai */
/* global describeModule */
/* global require */

const expect = chai.expect;

const crypto = require('crypto');
const { TextDecoder, TextEncoder } = require('text-encoding');

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
    'platform/crypto': {
      default: {},
    },
    'platform/text-decoder': {
      default: TextDecoder,
    },
    'platform/text-encoder': {
      default: TextEncoder,
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
    'core/gzip': {
      default: {},
    },
  }),
  () => {
    describe('#Manager', () => {
      let Manager;

      beforeEach(function () {
        Manager = this.module().default;
      });

      describe('#checkGroupPublicKeys', () => {

        function setupOldKeys(dates) {
          const keys = {};
          for (const date of dates) {
            keys[date] = {
              groupPubKey: Buffer.from(makeFakeGroupPublicKey(date), 'base64'),
              date,
            };
          }
          return keys;
        }

        function setupNewKeys(dates) {
          const keys = {};
          for (const date of dates) {
            keys[date] = makeFakeGroupPublicKey(date);
          }
          return keys;
        }

        it('should pass when initializing keys for the first time', function () {
          const newKeys = setupNewKeys(['20180722', '20180723', '20180724', '20180725']);

          expect(Manager.checkGroupPublicKeys(newKeys, undefined)).to.be.true;
          expect(Manager.checkGroupPublicKeys(newKeys, {})).to.be.true;
        });

        it('should pass if none of the keys changed', function () {
          const oldKeys = setupOldKeys(['20180722', '20180723', '20180724', '20180725']);
          const newKeys = setupNewKeys(['20180722', '20180723', '20180724', '20180725']);

          expect(Manager.checkGroupPublicKeys(newKeys, oldKeys)).to.be.true;
        });

        it('should pass if keys are rotated by one day', function () {
          const oldKeys = setupOldKeys(['20180722', '20180723', '20180724', '20180725']);
          const newKeys = setupNewKeys(['20180723', '20180724', '20180725', '20180726']);

          expect(Manager.checkGroupPublicKeys(newKeys, oldKeys)).to.be.true;
        });

        it('should pass if keys are rotated by one week', function () {
          const oldKeys = setupOldKeys(['20180722', '20180723', '20180724', '20180725']);
          const newKeys = setupNewKeys(['20180729', '20180730', '20180731', '20180801']);

          expect(Manager.checkGroupPublicKeys(newKeys, oldKeys)).to.be.true;
        });

        it('should permit the server to send keys that are in the past', function () {
          const oldKeys = setupOldKeys(['20180724', '20180725', '20180726']);
          const newKeys = setupNewKeys(['20180723', '20180724', '20180725', '20180726']);

          expect(Manager.checkGroupPublicKeys(newKeys, oldKeys)).to.be.true;
        });

        it('should fail if existing keys do not match', function () {
          const oldKeys = setupOldKeys(['20180722', '20180723', '20180724', '20180725']);
          const newKeys = setupNewKeys(['20180722', '20180723', '20180724', '20180725']);

          const maliciousKey = makeFakeGroupPublicKey('20180722-malicious-key');
          expect(maliciousKey !== newKeys['20180722']);
          newKeys['20180722'] = maliciousKey;

          expect(Manager.checkGroupPublicKeys(newKeys, oldKeys)).to.be.false;
        });
      });
    });
  }
);
