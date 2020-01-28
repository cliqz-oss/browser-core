/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai, describeModule */

const expect = chai.expect;
const crypto = require('crypto');

const MOCK = {
  'core/services/pacemaker': {
    default: {
    },
  },
  'core/events': {
    default: {},
  },
  'human-web/cliqz-bloom-filter': {
    default: {},
  },
  'core/platform': {
  },
  'core/crypto/random': {
    default: Math.random.bind(Math),
  },
  'core/crypto/utils': {
    sha1: x => Promise.resolve(crypto.createHash('sha1').update(x).digest('hex')),
  },
  'core/http': {
    fetch: {},
  },
  'core/prefs': {
    default: {
      set() {},
      has() { return false; },
      get(_, def) { return def; },
    },
  },
  'core/kord/inject': {
    default: {
      app: {
        version: null,
      },
    },
  },
  'platform/human-web/storage': {
    default: {},
  },
  'core/config': {
    default: {
      settings: {
        ALLOWED_COUNTRY_CODES: [],
      },
    },
  },
  'platform/human-web/opentabs': {
    getAllOpenPages: {},
  },
  'platform/browser': {
    getActiveTab: {},
  },
  'human-web/doublefetch-handler': {
    default: class {},
  },
  'human-web/content-extraction-patterns-loader': {
    default: class {},
  },
  'human-web/human-web-patterns-loader': {
    default: class {},
  },
  'platform/platform': {
    default: {
      isBetaVersion: false,
    },
  },
  'human-web/safebrowsing-endpoint': {
    default: class {},
  },
  'platform/crypto': {
    default: {},
  },
  'platform/fetch': {
    default: {},
  },
  'platform/text-encoder': {
    default: function () {
      return {
        encode: function (s) {
          const buf = Buffer.from(s, 'utf8');
          return buf;
        }
      };
    },
  },
  'platform/text-decoder': {
    default: function () {
      return {
        decode: function (s) {
          return Buffer.from(s).toString();
        }
      };
    },
  },
  'human-web/logger': {
    default: {
      debug() {},
      log() {},
      error() {},
    }
  },
  'human-web/html-helpers': {
    default: {}
  },

  // transitive dependencies: human-web/network
  'human-web/fallback-dns': {
    default: class {
      resolveHost() {
        // non-resolvable address, which will appear
        // as a public address to human-web
        return Promise.resolve('203.0.113.0');
      }

      cacheDnsResolution() {}

      flushExpiredCacheEntries() {}
    }
  },
};

export default describeModule('human-web/human-web',
  () => MOCK,
  () => {
    describe('#HumanWeb', function () {
      let HumanWeb;

      beforeEach(function () {
        HumanWeb = this.module().default;

        HumanWeb.httpCache = {};
        HumanWeb.counter = 1;
        HumanWeb.bloomFilter = {
          testSingle: () => false,
        };
      });

      describe('#sanitizeResultTelemetry', function () {
        let sanitizeResultTelemetry;
        let data;

        beforeEach(function () {
          sanitizeResultTelemetry = HumanWeb.sanitizeResultTelemetry;
          data = {
            q: 'a query',
            msg: {
              u: 'https://www.cliqz.de',
            },
          };
        });

        // This is not a real test. It merely verifies that the mocking
        // works as expected. For now, I leave it in.
        //
        // If it creates problems, feel free to delete it.
        //
        it('assume that "parse" in the tests works as expected', function () {
          return this.system.import('core/url').then((mod) => {
            const result = mod.parse('http://www.abc.test?0123456789');
            expect(result).to.include({
              host: 'www.abc.test',
              search: '?0123456789',
            });
          });
        });

        it('should be able to resolve the redirect chain: A -> B -> C', function () {
          HumanWeb.httpCache = {
            'https://a.test/': {
              status: 301,
              location: 'https://b.test/',
              time: 1,
            },
            'https://b.test/': {
              status: 301,
              location: 'https://c.test/',
              time: 2,
            },
            'https://c.test/': {
              status: 301,
              location: 'https://d.test/',
              time: 2,
            },
          };

          let redirects = [];
          const maxLength = 3;
          redirects = HumanWeb.getRedirects('https://d.test/', redirects, maxLength);
          expect(redirects).to.deep.equals(['https://a.test/', 'https://b.test/', 'https://c.test/']);
        });

        it('should stop when the desired number of redirects is exceeded', function () {
          HumanWeb.httpCache = {
            'https://a.test/': {
              status: 301,
              location: 'https://b.test/',
              time: 1,
            },
            'https://b.test/': {
              status: 301,
              location: 'https://c.test/',
              time: 2,
            },
            'https://c.test/': {
              status: 301,
              location: 'https://d.test/',
              time: 2,
            },
          };

          let redirects = [];
          const maxLength = 1;
          redirects = HumanWeb.getRedirects('https://d.test/', redirects, maxLength);
          expect(redirects).to.deep.equals(['https://c.test/']);
        });

        it('should not enter an infinite loop when resolving redirects', function () {
          HumanWeb.httpCache = {
            'https://example.test/': {
              status: 301,
              location: 'https://example.test/redirected',
              time: 1,
            },
            'https://example.test/redirected': {
              status: 200,
              time: 2
            }
          };

          let redirects = [];
          redirects = HumanWeb.getRedirects('https://example.test/redirected', redirects);
          expect(redirects).to.deep.equals(['https://example.test/']);
        });

        it('should not find redirects to itself', function () {
          HumanWeb.httpCache = {
            'https://example.test/': {
              status: 301,
              location: 'https://example.test',
              time: 1,
            },
            'https://example.test': {
              status: 200,
              time: 2
            }
          };

          let redirects = [];
          redirects = HumanWeb.getRedirects('https://example.test/', redirects);
          expect(redirects).to.deep.equals([]);
        });

        it('should handle httpCache entries with many unrelated entries', function () {
          HumanWeb.httpCache = {
            'https://example.test/': {
              status: 301,
              location: 'https://example.test/redirected',
              time: 1,
            },
            'https://example.test/redirected': {
              status: 200,
              time: 2
            }
          };
          for (let i = 0; i < 10000; i += 1) {
            HumanWeb.httpCache[`https://dummy-url${i}.test/`] = {
              status: 301,
              location: `https://other-dummy-url${i}.test/`,
              time: i,
            };
          }

          let redirects = [];
          redirects = HumanWeb.getRedirects('https://example.test/redirected', redirects);
          expect(redirects).to.deep.equals(['https://example.test/']);
        });

        it('should handle redirect cycles', function () {
          HumanWeb.httpCache = {
            'https://foo.test/': {
              status: 301,
              location: 'https://bar.test/',
              time: 1,
            },
            'https://bar.test/': {
              status: 301,
              location: 'https://foo.test/',
              time: 2,
            }
          };

          // set it high enough that it would hang if it does not detect the cycle
          const maxLength = 10000000;

          let redirects1 = [];
          redirects1 = HumanWeb.getRedirects('https://foo.test/', redirects1, maxLength);
          expect(redirects1).to.deep.equals(['https://foo.test/', 'https://bar.test/']);

          let redirects2 = [];
          redirects2 = HumanWeb.getRedirects('https://bar.test/', redirects2, maxLength);
          expect(redirects2).to.deep.equals(['https://bar.test/', 'https://foo.test/']);
        });

        it('rejects if HumanWeb is not initialized', function () {
          HumanWeb.counter = 0;
          return chai.expect(sanitizeResultTelemetry(data)).to.be.rejected;
        });

        it('rejects `null` query', function () {
          data.q = null;
          return chai.expect(sanitizeResultTelemetry(data)).to.be.rejected;
        });

        it('rejects empty query', function () {
          data.q = '';
          return chai.expect(sanitizeResultTelemetry(data)).to.be.rejected;
        });

        // TODO: test `isSuspiciousQuery` separately
        it('overwrites suspicious query', function () {
          data.q = 'hw@cliqz.com';
          return sanitizeResultTelemetry(data)
            .then(({ query }) => chai.expect(query).to.equal('(PROTECTED)'));
        });

        // TODO: test `isSuspiciousURL` and `dropLongURL` separately
        it('overwrites dangerous query', function () {
          data.q = 'http://www.abc.de?0123456789';
          return sanitizeResultTelemetry(data)
            .then(({ query }) => chai.expect(query).to.equal('(PROTECTED)'));
        });

        // TODO: test if `bloomFilter` was used

        // TODO: test `isSuspiciousURL` separately
        it('overwrites suspicious URL', function () {
          data.msg.u = 'http://www.abc.de?0123456789';
          return sanitizeResultTelemetry(data)
            .then(({ url }) => chai.expect(url).to.equal('(PROTECTED)'));
        });

        // TODO: test `dropLongURL` separately
        it('overwrites dangerous URL', function () {
          data.msg.u = 'hw@cliqz.com';
          return sanitizeResultTelemetry(data)
            .then(({ url }) => chai.expect(url).to.equal('(PROTECTED)'));
        });

        it('does not change unsuspicous query and URL', function () {
          data.q = 'cliqz';
          data.msg.u = 'https://www.cliqz.com';
          return sanitizeResultTelemetry(data)
            .then(({ query, url }) => chai.expect({ query, url }).to.eql({
              query: 'cliqz',
              url: 'https://www.cliqz.com',
            }));
        });

        it('#checkForEmail should detect email addresses', function () {
          // examples:
          expect(HumanWeb.checkForEmail('some.email@domain.test')).to.be.true;
          expect(HumanWeb.checkForEmail('text with email@dummy.test address')).to.be.true;
          expect(HumanWeb.checkForEmail('AnotherEmail@domain123.test')).to.be.true;

          // counter examples:
          expect(HumanWeb.checkForEmail('')).to.be.false;
          expect(HumanWeb.checkForEmail('123456')).to.be.false;
          expect(HumanWeb.checkForEmail('some text without an email address')).to.be.false;
        });
      });

      describe('#allowDoublefetch', function () {
        let safe;
        let notSafe;
        let pageDoc;
        let assumeFailsUrlChecks;
        let assumePassesUrlChecks;
        const someSafeUrl = 'https://example.test/';

        beforeEach(function () {
          pageDoc = {
            x: {
              ctry: 'de',
              iall: true,
              lh: 0,
              lt: 0,
              nf: 0,
              nfsh: 0,
              ni: 0,
              nifsh: 0,
              ninh: 0,
              nip: 0,
              nl: 0,
              pagel: 'de',
              t: 'Dummy page'
            },
          };

          safe = (url, pageDoc_) => {
            expect(HumanWeb.allowDoublefetch(url, pageDoc_).accepted).to.be.true;
          };
          notSafe = (url, pageDoc_) => {
            expect(HumanWeb.allowDoublefetch(url, pageDoc_).accepted).to.be.false;
          };

          const failsDropLongURL = url => HumanWeb.dropLongURL(url, { strict: false })
              || HumanWeb.dropLongURL(url, { strict: true });
          assumeFailsUrlChecks = (url) => {
            if (!failsDropLongURL(url)) {
              expect.fail(`Assumption in the tests are outdated: It assumes ${url} is sensitive`);
            }
          };
          assumePassesUrlChecks = (url) => {
            if (failsDropLongURL(url)) {
              expect.fail(`Assumption in the tests are outdated: It assumes ${url} is non-sensitive`);
            }
          };
          assumePassesUrlChecks(someSafeUrl);
        });

        it('should allow non-sensitive pages to be fetched', function () {
          safe(someSafeUrl, pageDoc);
        });

        it('should always reject pages with problematic URL', function () {
          const badUrl = 'https://example.test/this-is-an-unsafe-url/with/params/like?password=secret&sid=123456789012345678';
          assumeFailsUrlChecks(badUrl);

          notSafe(badUrl, pageDoc);
        });

        it('should reject pages with a long URL and no canonical URL', function () {
          const longUrl = 'https://example.test/this/is/a/very/long/url/with/ids/like/123456789012345678';
          assumeFailsUrlChecks(longUrl);

          delete pageDoc.x.canonical_url;
          notSafe(longUrl, pageDoc);
        });

        it('should reject pages with a long URL and a long canonical URL', function () {
          const longUrl = 'https://example.test/this/is/a/very/long/url/with/ids/like/123456789012345678';
          assumeFailsUrlChecks(longUrl);

          pageDoc.x.canonical_url = longUrl;
          notSafe(longUrl, pageDoc);
        });

        it('should accept pages with a long URL, but a short canonical URL', function () {
          const longUrl = 'https://example.test/this/is/a/very/long/url/with/ids/like/123456789012345678';
          assumeFailsUrlChecks(longUrl);

          const shortUrl = 'https://example.test/short-link';
          pageDoc.x.canonical_url = shortUrl;
          assumePassesUrlChecks(pageDoc.x.canonical_url);

          safe(longUrl, pageDoc);
        });

        it('should reject pages that the site owner has marked as "noindex"', function () {
          pageDoc.x.iall = false;
          notSafe(someSafeUrl, pageDoc);
        });

        it('should allow a safe page with dumped out stats from a real page', function () {
          const pageDocDump = {
            url: 'https://en.wikipedia.org/wiki/Munich',
            a: 4,
            x: {
              lh: 975478,
              lt: 465837,
              t: 'Munich - Wikipedia',
              nl: 2833,
              ni: 9,
              ninh: 8,
              nip: 0,
              nf: 1,
              pagel: 'en',
              ctry: 'de',
              iall: true,
              canonical_url: 'https://en.wikipedia.org/wiki/Munich',
              nfsh: 0,
              nifsh: 0
            },
            tin: 1566396865556,
            e: {
              cp: 0,
              mm: 0,
              kp: 0,
              sc: 0,
              md: 0
            },
            st: 200,
            c: [],
            ref: null,
            red: null,
            qr: {
              d: 1,
              q: 'munich wikipedia',
              t: 'cl',
              pt: ''
            }
          };
          safe('https://en.wikipedia.org/wiki/Munich', pageDocDump);
        });
      });
    });
  });
