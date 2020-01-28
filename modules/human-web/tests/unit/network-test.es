/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai */
/* global describeModule */
/* eslint camelcase: off */
const expect = chai.expect;

/**
 * Dumped out "page" message.
 *
 * Note: Most of the values are not relevant for the test, except
 * the ones that are passed in and the message type "action: 'page'".
 */
function mkPageMessage({ url, canonical_url, ref, redirects }) {
  return {
    type: 'humanweb',
    action: 'page',
    payload: {
      url,
      a: 24,
      x: {
        lh: 119432,
        lt: 57315,
        t: 'Test Titel',
        nl: 317,
        ni: 5,
        ninh: 2,
        nip: 0,
        nf: 1,
        pagel: 'de',
        ctry: 'de',
        iall: true,
        canonical_url,
        nfsh: 0,
        nifsh: 0,
        nifshmatch: false,
        nfshmatch: true,
        nifshbf: 2,
        nfshbf: 2
      },
      e: {
        cp: 0,
        mm: 3,
        kp: 0,
        sc: 0,
        md: 0
      },
      st: 200,
      c: null,
      ref,
      red: redirects,
      dur: null
    },
    ver: '2.7',
    channel: 'cliqz-test',
    ts: 20180727,
    'anti-duplicates': 4990908
  };
}

export default describeModule('human-web/network',
  () => ({
    'human-web/logger': {
      default: {
        debug() {},
        log() {},
        error() {},
      }
    },
  }),
  () => {
    describe('parseHostname', function () {
      let parseHostname;

      beforeEach(function () {
        parseHostname = this.module().parseHostname;
      });

      it('should parse a simple domain', function () {
        expect(parseHostname('www.example.test')).to.eql({
          hostname: 'www.example.test',
          username: '',
          password: '',
          port: 80,
        });
      });

      it('should parse a complex domain', function () {
        expect(parseHostname('myuser:mypassword@example.test:1000')).to.eql({
          hostname: 'example.test',
          username: 'myuser',
          password: 'mypassword',
          port: 1000,
        });
      });
    });

    describe('parseURL', function () {
      let parseURL;

      beforeEach(function () {
        parseURL = this.module().parseURL;
      });

      it('should parse a simple URL', function () {
        expect(parseURL('http://www.example.test/')).to.eql({
          protocol: 'http',
          hostname: 'www.example.test',
          port: 80,
          username: '',
          password: '',
          path: '/',
          query_string: null,
        });
      });

      it('should parse an URL with params', function () {
        expect(parseURL('http://www.example.test/abc/def?param1=1&param2=2')).to.eql({
          protocol: 'http',
          hostname: 'www.example.test',
          port: 80,
          username: '',
          password: '',
          path: '/abc/def',
          query_string: 'param1=1&param2=2',
        });
      });

      // TODO: currently defaults to port 80 for https, which is unexpected
      it.skip('should parse a https URL', function () {
        expect(parseURL('https://www.example.test/')).to.eql({
          protocol: 'https',
          hostname: 'www.example.test',
          port: 443,
          username: '',
          password: '',
          path: '/',
          query_string: null,
        });
      });

      it('should parse a https URL (explicit port)', function () {
        expect(parseURL('https://www.example.test:443/')).to.eql({
          protocol: 'https',
          hostname: 'www.example.test',
          port: 443,
          username: '',
          password: '',
          path: '/',
          query_string: null,
        });
      });

      it('should parse IPv4 addresses', function () {
        expect(parseURL('http://127.0.0.1/')).to.include({
          hostname: '127.0.0.1'
        });
        expect(parseURL('http://127.0.0.1:8080/')).to.include({
          hostname: '127.0.0.1',
          port: 8080,
        });
      });

      it('should reject invalid URLs', function () {
        expect(parseURL('')).to.be.null;
        expect(parseURL('corrupted with space')).to.be.null;

        // missing schema:
        expect(parseURL('test')).to.be.null;
        expect(parseURL('example.test')).to.be.null;
      });

      // human-web relies on the assumption that URLs
      // with unquoted characters are not rejected:
      it('should allow unquoted characters in URLs', function () {
        const url = 'https://www.example.test/ (PROTECTED)';
        expect(parseURL(url).hostname).to.equal('www.example.test');
      });
    });

    describe('#Network', function () {
      let Network;
      let uut;

      function setupDns({ publicDomains = [], privateDomains = [] }) {
        // Use knowledge about the real implementation to make sure that
        // the given domains resolve to public or private addresses.
        // Should the implementation change, replacing it by a
        // stub implementation is probably best.
        for (const domain of publicDomains) {
          uut.dns.cacheDnsResolution(domain, '198.51.100.0');
        }
        for (const domain of privateDomains) {
          uut.dns.cacheDnsResolution(domain, '127.0.0.1');
        }
      }

      beforeEach(function () {
        Network = this.module().Network;
        uut = new Network();
      });

      it(': #isHostNamePrivate should detect public host names', async function () {
        setupDns({ publicDomains: ['public.test'] });

        await expect(uut.isHostNamePrivate('https://public.test/')).to.eventually.equal(false);
        await expect(uut.isHostNamePrivate('https://public.test/some?dummy=param')).to.eventually.equal(false);
      });

      it(': #isHostNamePrivate should detect private host names', async function () {
        setupDns({ privateDomains: ['private.test'] });

        await expect(uut.isHostNamePrivate('https://private.test/')).to.eventually.equal(true);
        await expect(uut.isHostNamePrivate('https://private.test/some?dummy=param')).to.eventually.equal(true);
      });

      it('should pass without changing the message if all domains are public', async function () {
        setupDns({ publicDomains: ['public.test'] });

        const params = {
          url: 'http://public.test/1',
          canonical_url: 'http://public.test/2',
          ref: 'http://public.test/3',
          redirects: ['http://public.test/4', 'http://public.test/5'],
        };
        const msg = mkPageMessage(params);

        await expect(uut.sanitizeUrlsWithPrivateDomains(msg)).to.eventually
          .exist // == message not dropped
          .and.deep.equal(mkPageMessage(params)); // == payload unchanged
      });

      it('should reject if the url is non-public', async function () {
        setupDns({ privateDomains: ['private.test'] });

        const params = {
          url: 'http://private.test/1',
          canonical_url: null,
          ref: null,
          redirects: null,
        };
        const msg = mkPageMessage(params);

        await expect(uut.sanitizeUrlsWithPrivateDomains(msg)).to.eventually.equal(null);
      });

      it('should filter non-public domains from redirects', async function () {
        setupDns({
          publicDomains: ['public1.test', 'public2.test', 'public3.test'],
          privateDomains: ['private1.test']
        });

        const params = {
          url: 'http://public1.test/',
          canonical_url: 'http://public1.test/',
          ref: null,
          redirects: ['http://private1.test', 'http://public2.test/', 'http://public3.test/'],
        };
        const msg = mkPageMessage(params);

        // expectation: private URL in "ref" should be nulled out
        const expectedMessage = mkPageMessage({
          url: 'http://public1.test/',
          canonical_url: 'http://public1.test/',
          ref: null,
          redirects: [null, 'http://public2.test/', 'http://public3.test/'],
        });

        await expect(uut.sanitizeUrlsWithPrivateDomains(msg)).to.eventually
          .exist // == message not dropped
          .and.deep.equal(expectedMessage);
      });

      it('should filter non-public domains from canonical_url/ref/redirects', async function () {
        setupDns({
          publicDomains: ['public.test'],
          privateDomains: ['private.test']
        });

        const params = {
          url: 'http://public.test/',
          canonical_url: 'http://private.test/',
          ref: 'http://private.test/',
          redirects: ['https://private.test/1', 'https://private.test/2'],
        };
        const msg = mkPageMessage(params);

        const expectedMessage = mkPageMessage({
          url: 'http://public.test/',
          canonical_url: null,
          ref: null,
          redirects: [null, null],
        });

        await expect(uut.sanitizeUrlsWithPrivateDomains(msg)).to.eventually
          .exist // == message not dropped
          .and.deep.equal(expectedMessage);
      });
    });
  });
