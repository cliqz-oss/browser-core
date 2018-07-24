/* global expect, TESTS */
/* eslint max-len: 'off' */
/* eslint func-names: 'off' */
/* eslint prefer-arrow-callback: 'off' */
/* eslint no-param-reassign: 'off' */

const sampleMessage = '{"action": "alive", "type": "humanweb", "ver": "1.5", "payload": {"status": true, "ctry": "de", "t": "2015110909"}, "ts": "20151109"}';
// Set test PK, else signatures will fail
const pk = 'MIIEowIBAAKCAQEAhq3VXODlZXqNHVKuKEPzXZy5H/DhXC0QhzUozMASWK5Px2MQRYrpFlkE81KYUYoBLjSqabY2dBz9nMrnn2B9qEFTDWioZ0co2aHMvEiw72uacmBisOMchV0/Vj7hCh0rDu1NbJM6739u6VFhVX7KfUPecaH7aUfAj1seoRyNyKqWmHovk8SMJDpDwJQwYdQQ6e+r4B6bCOeiahsADO0qXVoC16hEGlPLIDBZexuKf1a2WO7ZPy5b95B9DsXpHbsUXJrAO/1DDVM6i7YH2XJv/b1fGYI9creok5ZJmgAndnJcXPIhMYFvvIz+Z0qBJNYWaHJkMAWfFG7HN34jzZjJUwIDAQABAoIBAHhSGUpPCeJtaGEIGtuSSXwapjFpDI1DHX8N+RNjjYB4yoGBeWoHvlHe2dNguQAv4PocxxqGVYPK2rEXfXMfy2NkaQSTuc/6/P3h1X1pG9nqMiN5BPKvFC35rroolvhoMq21R/R2XLLXEImV0PWGvvTGi5bNdkUKe3gXmfeqAOmCU1E6gScdE7j1SqWes0N10SrDZEbmcCFAt8EamzrukOYrAYnP46DzPThC1emdWwZpwxv8rheI5vuKaTjmGZ20D0k/s6dfBuhkcaC9hbnm9rEjqBtgP8qvoMMTyMVuudLExuF8cPrTgpxe0XIpnPgUxfxbSkdeC4E5JsppEDFNR6ECgYEA+glZO7WzutZJB5z35S/x6g6hfgBKHQs0kVCMdhzoGeQSbQ0zeUOGpwNRcU7C+g1nfgVJHP0NW8DD5dAnGGOzohZs9kC1pgml68mMUCS9UNUvu0QZDhQ+Opza8YfzsLV/S+N2vZAYtTL8lOP5PyjR/7kueiohqCLQzw4Pl6HFLgsCgYEAieQlJfwaRFTj0EdIaTtpDY5J6EG9rD4tzW81jTpDSseqzagrwCh9fDVs7aC/1f4L90AEPRVweFZp7iA32D08RMCgRSm1/vmAQ4irpwqED8I0SBSCxE3V9ZBvMjfhWx9u1D+3u+t5aD3qobOt9HkcB/0YkGejDJcN8dmg8L3xhtkCgYAoZyZSLbRTNpkqb8Tm9e5jYeXalHVlaBAggyGPXHBs7pvDn2R37d9uUWzxoEaFXXEhvfzogEOOVgHRuub2W/YE9Ra6XA5+PAThqvnPYYBt9WT3H7PkwISlt/7xFITeQxXEz4a6bvRvI0QJUyVNfW0ho2zNNM2ne6i+LIl8eRmBrQKBgEYKbdgqgwkceY9M9foF5GmvUdk4s2hvOQK1r2TqKE4ut5K5DmgP6RWTaZ4WXfsLjPZtPPnuDvABLNN46ATdreRaV85pznkSMNWc8Vvq2oPKqJXIXVfrFXgjgmfmvIB1qe0D5Ib+p++MK8cxJnYcomFobPbEvaxiegHUAozmXm2ZAoGBAOlNYDedZp4bRqe4bWxAzNz7a6V7zbwY3oAU3zGUrmJ5ZRWTAF/nGlZt42T8922/JppfmPCRs4UY4LUZiHZ2qplLlpuLuVaXLa5pSXgC53+h3WzLZtI8PAfUZVwhF8nx8XrM2n6DiQhpJbBIhg3Midb3lWzbjksZwHee0Yw4uDzl';


TESTS.HPNSecureMessageTest = function (CliqzUtils) {
  const CliqzSecureMessage = CliqzUtils.getWindow().CliqzSecureMessage;
  describe('HPN tests', function () {
    let mc = null;
    CliqzSecureMessage.routeTable = null;
    CliqzSecureMessage.sourceMap = null;

    before(function () {
      return fetch('https://hpn-collector.cliqz.com/v2/lookuptable')
        .then(data => data.json())
        .then((data) => {
          CliqzSecureMessage.routeTable = data.cliqz;
        }).then(() => fetch('https://hpn-collector.cliqz.com/sourcemapjson'))
        .then(data => data.json())
        .then((data) => {
          CliqzSecureMessage.sourceMap = data;
        });
    });

    beforeEach(function (done) {
      // Pass the message to the web-worker.
      const testWCrypto = new Worker('chrome://cliqz/content/hpn/worker.bundle.js');

      testWCrypto.postMessage({
        msg: JSON.parse(sampleMessage),
        type: 'test',
        sourcemap: CliqzSecureMessage.sourceMap,
        upk: CliqzSecureMessage.uPK,
        dspk: CliqzSecureMessage.dsPK,
        routetable: CliqzSecureMessage.routeTable,
        localTemporalUniq: CliqzSecureMessage.localTemporalUniq
      });

      testWCrypto.onmessage = function (e) {
        if (e.data.type === 'test') {
          mc = e.data.mc;
        }
        testWCrypto.terminate();
        done();
      };
    });

    describe('SecureMessage', function () {
      describe('HPN-cryptoJS loaded correctly', function () {
        it('MD5-test', function () {
          expect(mc.md5Hash).to.equal('7bd3d5f5b3cdb13aed632121206e729c');
        });
      });

      describe('HPN-secure-message context', function () {
        it('dmC rightly calculated', function () {
          expect(mc.dmC).to.equal('0101101101011');
        });

        it('action', function () {
          expect(mc.action).to.equal('alive');
        });
      });

      describe('HPN-SHA-1', function () {
        it('SHA-1', function () {
          expect(mc.sha1).to.equal('5b586ea87017e719a0de87a798c4a2765f90f9bc');
        });
      });
    });

    describe('secure-message-utils', function () {
      it('HPN-utils-sha1', function (done) {
        // Pass the message to the web-worker.
        const testWCrypto = new Worker('chrome://cliqz/content/hpn/worker.bundle.js');

        testWCrypto.onmessage = function (e) {
          const result = e.data.result;
          expect(result).to.equal('aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d');
          testWCrypto.terminate();
          done();
        };

        testWCrypto.postMessage({
          msg: 'hello',
          type: 'test-sha1'
        });
      });

      it('HPN-utils-sha1-with-accents', function (done) {
        // Pass the message to the web-worker.
        const testWCrypto = new Worker('chrome://cliqz/content/hpn/worker.bundle.js');

        testWCrypto.onmessage = function (e) {
          const result = e.data.result;
          expect(result).to.equal('133d5d8ecc7c377501a41dba28fb70a0a1577a38');
          testWCrypto.terminate();
          done();
        };

        testWCrypto.postMessage({
          msg: 'çéë',
          type: 'test-sha1'
        });
      });
    });

    describe('secure-message-RSA', function () {
      it('HPN-RSA-sign', function (done) {
        // Pass the message to the web-worker.
        const testWCrypto = new Worker('chrome://cliqz/content/hpn/worker.bundle.js');

        testWCrypto.onmessage = function (e) {
          const result = e.data.result;
          expect(result).to.equal('2be67d16d64c93f55af6db28dd83f48ff92761e459e61dab161f475aea010208b3a8437e8acec0f15d463f762e64e00033cbcab1b6017d541b88dbb1258c98cfe9c70436caf6d62effa8edc9f5a54d17e77724ae2864a34a0c6b0877f00f2fa8e5d583b02bafa8f72eadf16b2edd844fdca9440aa93ec6dd88d280831becdeb363ca69ecf4e6d82bdd9a18de3034b3bdc23c557847503924c45dcb3e8ed4d164725068109109fd5ffc3727e41c73e246e9017f497603d6261ffcd0c939857f11b9a2e49bf34e9ab31aaa1d82ba420a8d09517a97c98b176bebeb3b8c97f5bfe148258b268eb95b3916c328584f9b7975a0265198a919e89e507ddb6c9e51f025');
          testWCrypto.terminate();
          done();
        };

        testWCrypto.postMessage({
          msg: sampleMessage,
          type: 'test-rsa-sign',
          upk: pk
        });
      });

      it('HPN-RSA-verify', function (done) {
        // Pass the message to the web-worker.
        const testWCrypto = new Worker('chrome://cliqz/content/hpn/worker.bundle.js');

        testWCrypto.onmessage = function (e) {
          const result = e.data.result;
          expect(result).to.equal(true);
          testWCrypto.terminate();
          done();
        };

        testWCrypto.postMessage({
          sig: '2be67d16d64c93f55af6db28dd83f48ff92761e459e61dab161f475aea010208b3a8437e8acec0f15d463f762e64e00033cbcab1b6017d541b88dbb1258c98cfe9c70436caf6d62effa8edc9f5a54d17e77724ae2864a34a0c6b0877f00f2fa8e5d583b02bafa8f72eadf16b2edd844fdca9440aa93ec6dd88d280831becdeb363ca69ecf4e6d82bdd9a18de3034b3bdc23c557847503924c45dcb3e8ed4d164725068109109fd5ffc3727e41c73e246e9017f497603d6261ffcd0c939857f11b9a2e49bf34e9ab31aaa1d82ba420a8d09517a97c98b176bebeb3b8c97f5bfe148258b268eb95b3916c328584f9b7975a0265198a919e89e507ddb6c9e51f025',
          msg: sampleMessage,
          type: 'test-rsa-verify',
          upk: pk
        });
      });
    });
  });
};

TESTS.HPNSecureMessageTest.MIN_BROWSER_VERSION = 48;
