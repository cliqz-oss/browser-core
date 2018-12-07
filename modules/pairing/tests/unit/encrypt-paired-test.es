/* eslint no-undef: 'off' */
/* global chai */

const WebCrypto = require('node-webcrypto-ossl');

const crypto = new WebCrypto();
const zlib = require('zlib');

function makeDeviceID() {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex');
}

export default describeModule('pairing/shared',
  function () {
    return {
      'platform/crypto': {
        default: crypto
      },
      'platform/text-encoder': {
        default: function () {
          return {
            encode(s) {
              const buf = Buffer.from(s, 'utf8');
              return buf;
            }
          };
        },
      },
      'platform/text-decoder': {
        default: function () {
          return {
            decode(s) {
              return Buffer.from(s).toString();
            }
          };
        },
      },
      'platform/lib/zlib': {
        deflate: x => zlib.deflateSync(Buffer.from(x)),
        inflate: x => zlib.inflateSync(Buffer.from(x)),
      },
    };
  },
  () => {
    describe('encrypt/decrypt', function () {
      let shared;

      beforeEach(function () {
        shared = this.module();
      });

      it('encrypted', function () {
        const a = makeDeviceID();
        const b = makeDeviceID();
        const publicKey = shared.dummyKeypair[0];
        const privateKey = shared.dummyKeypair[1];

        const targets = [{ id: b, publicKey }];
        return shared.encryptPairedMessage({ msg: 'hello', type: 'test', source: a }, targets)
          .then(data => shared.decryptPairedMessage(data, b, privateKey))
          .then(data => chai.expect(data.msg).to.equal('hello'))
          .then(() => shared.encryptPairedMessage({ msg: 'hello', type: 'test', source: a }, targets))
          .then(data => shared.decryptPairedMessage(data, b, 'abcd'))
          .catch(() => 'expected')
          .then(x => chai.expect(x).to.equal('expected'));
      });

      it('compressed', function () {
        const a = makeDeviceID();
        const b = makeDeviceID();

        const targets = [{ id: b }];
        return shared.encryptPairedMessage({ msg: 'hello', type: 'test', source: a }, targets, true)
          .then(data => shared.decryptPairedMessage(data, b))
          .then(data => chai.expect(data.msg).to.equal('hello'));
      });
    });
  });
