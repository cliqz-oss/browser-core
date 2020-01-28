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

const SOME_PUBLIC_KEY_PEM = `
-----BEGIN PUBLIC KEY-----
example////qhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAumSB8BGZHPyRcu1pcbdf
fFNCxxOSrGsZ/VawPt9fOUEAQXJVbBvkpJXkOyA//wQeep1YP9zx42b6brDE3Z9S
xYwMqBbDX6pT2exdzEmOOo0ON8/61+JUEZyxZd2QKeUMK8q295JaX4Q7zKjHYgVa
kACtM1oY1+gvwKOSIIv86LCrFR1tOWF69t2pVD31cLHkrS4qABdAzKHuGQdGOhtJ
4+yMJQG42m5bNXMw0F9wAgDa0SqBPkmWHJBMe6tc/MwLwoEMJydclATCRLBnIklO
si9ZOjKjUR9ORWd5DAgzEsqlQPJcFpPDn8wcMx7EGxocJuol9PfHIx6iCk78tRz8
AwIDAQAB
-----END PUBLIC KEY-----
`;

// In NodeJs, crypto.subtle is not available, which limits the
// scope of what you can test in Node. This setup allows to
// simulate the happy path and a error paths.
const CRYPTO_MOCK = {
  message: new Uint8Array(Buffer.from('some test message')),
  goodSignature: Buffer.from('this signature will be accepted').toString('base64'),
  badSignature: Buffer.from('this signature will be rejected').toString('base64'),

  key: {
    name: 'dummy-key',
    pem: SOME_PUBLIC_KEY_PEM,
  },

  reset() {
    const dummyKey = {};
    this.subtle = {
      async importKey(format, key, options, extractable, usages) {
        expect(format).to.equal('spki');
        expect(extractable).to.equal(false, 'no need to extract the key');
        expect(usages).to.deep.equal(['verify']);

        await new Promise(resolve => setTimeout(resolve, 0));
        return dummyKey;
      },
      async verify(algorithm, key, signature, data) {
        expect(key).to.equal(dummyKey, 'not the key that was imported');
        expect(data).to.deep.equal(CRYPTO_MOCK.message);

        return Buffer.from(signature).toString('base64') === CRYPTO_MOCK.goodSignature;
      }
    };
  },
};

const VERBOSE = false;
export default describeModule('human-web/signature-verifier',
  () => ({
    'core/logger': {
      default: {
        get() {
          return {
            debug() {},
            log() {},
            info() {},
            warn(...args) {
              if (VERBOSE) {
                console.warn(...args);
              }
            },
            error(...args) {
              if (VERBOSE) {
                console.error(...args);
              }
            },
          };
        },
      },
    },
    'platform/crypto': {
      default: CRYPTO_MOCK,
    },
  }),
  () => {
    describe('#SignatureVerifier', function () {
      let SignatureVerifier;

      function newSignatureVerifier(overrideArgs = {}) {
        const defaultArgs = {
          resourceUrl: 'https://example.test/dummy',
          publicKeyName: CRYPTO_MOCK.key.name,
          publicKeyPem: CRYPTO_MOCK.key.pem,
          insecure: false,
        };

        return new SignatureVerifier({
          ...defaultArgs,
          ...overrideArgs,
        });
      }

      beforeEach(function () {
        SignatureVerifier = this.module().default;
        CRYPTO_MOCK.reset();
      });

      afterEach(function () {
        CRYPTO_MOCK.reset();
      });

      it('should export a valid URL in "signatureUrl"', function () {
        const resourceUrl = 'https://domain.test/patterns.gz';
        const uut = newSignatureVerifier({
          resourceUrl,
          publicKeyName: '2019-10-17-test-key.pub',
        });

        // the signature URLs is derived from the resource URL and the key name:
        // it has to follow the same convention as the server
        expect(uut.resourceUrl).to.equal(resourceUrl);
        expect(uut.signatureUrl).to.equal(
          'https://domain.test/patterns.gz.signed-with-2019-10-17-test-key.pub'
        );
      });

      it('should accept good signature', async function () {
        const uut = newSignatureVerifier();

        const isValid = await uut.checkSignature(CRYPTO_MOCK.message,
          CRYPTO_MOCK.goodSignature);

        expect(isValid).to.equal(true, 'Expected signature to be good');
      });

      it('should reject bad signature', async function () {
        const uut = newSignatureVerifier();

        const isValid = await uut.checkSignature(CRYPTO_MOCK.message,
          CRYPTO_MOCK.badSignature);

        expect(isValid).to.equal(false, 'Expected signature to be rejected');
      });

      it('should ignore signature verification errors if "insecure" is set', async function () {
        const uut = newSignatureVerifier({ insecure: true });
        {
          const isValid = await uut.checkSignature(CRYPTO_MOCK.message,
            CRYPTO_MOCK.badSignature);
          expect(isValid).to.equal(true, 'Expected verification error to be ignored');
        }
        {
          const isValid = await uut.checkSignature(CRYPTO_MOCK.message,
            CRYPTO_MOCK.goodSignature);
          expect(isValid).to.equal(true, 'Good signatures should always be accepted');
        }
      });
    });

    describe('#parsePublicKeyPem', function () {
      let parsePublicKeyPem;

      beforeEach(function () {
        parsePublicKeyPem = this.module().parsePublicKeyPem;
      });

      it('should parse a well-formed key', function () {
        const pem = `
    -----BEGIN PUBLIC KEY-----
    example////qhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAumSB8BGZHPyRcu1pcbdf
    fFNCxxOSrGsZ/VawPt9fOUEAQXJVbBvkpJXkOyA//wQeep1YP9zx42b6brDE3Z9S
    xYwMqBbDX6pT2exdzEmOOo0ON8/61+JUEZyxZd2QKeUMK8q295JaX4Q7zKjHYgVa
    kACtM1oY1+gvwKOSIIv86LCrFR1tOWF69t2pVD31cLHkrS4qABdAzKHuGQdGOhtJ
    4+yMJQG42m5bNXMw0F9wAgDa0SqBPkmWHJBMe6tc/MwLwoEMJydclATCRLBnIklO
    si9ZOjKjUR9ORWd5DAgzEsqlQPJcFpPDn8wcMx7EGxocJuol9PfHIx6iCk78tRz8
    AwIDAQAB
    -----END PUBLIC KEY-----
`;
        const key = 'example////qhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAumSB8BGZHPyRcu1pcbdffFNCxxOSrGsZ/VawPt9fOUEAQXJVbBvkpJXkOyA//wQeep1YP9zx42b6brDE3Z9SxYwMqBbDX6pT2exdzEmOOo0ON8/61+JUEZyxZd2QKeUMK8q295JaX4Q7zKjHYgVakACtM1oY1+gvwKOSIIv86LCrFR1tOWF69t2pVD31cLHkrS4qABdAzKHuGQdGOhtJ4+yMJQG42m5bNXMw0F9wAgDa0SqBPkmWHJBMe6tc/MwLwoEMJydclATCRLBnIklOsi9ZOjKjUR9ORWd5DAgzEsqlQPJcFpPDn8wcMx7EGxocJuol9PfHIx6iCk78tRz8AwIDAQAB';

        expect(parsePublicKeyPem(pem)).to.equal(key);
      });

      it('should fail for non well-formed keys', function () {
        expect(() => parsePublicKeyPem('')).to.throw();
        expect(() => parsePublicKeyPem('dummy text')).to.throw();
        expect(() => parsePublicKeyPem('-----BEGIN PUBLIC KEY-----')).to.throw();
      });
    });
  });
