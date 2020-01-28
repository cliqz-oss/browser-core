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
const jsc = require('jsverify');

// Cycles through the given text and returns the first
// "numChar" characters.
// Example: stringOfLength(7, '123') === '1231231'
function stringOfLength(numChars, text = 'a') {
  return [...new Array(numChars)].map(() => text).join('').substr(0, numChars);
}

// Returns all substrings when deleting up to "numChars"
// characters from the left.
function deleteFromFront({ numChars, query }) {
  chai.assert.exists(numChars, 'numChars missing');
  chai.assert.exists(query, 'query missing');

  const results = [query];
  for (let i = 0; i < numChars; i += 1) {
    const last = results[results.length - 1];
    if (last.length === 0) {
      break;
    }
    results.push(last.substr(1));
  }
  return results;
}

// Returns all substrings when deleting up to "numChars"
// characters from the right.
function deleteFromEnd({ numChars, query }) {
  chai.assert.exists(numChars, 'numChars missing');
  chai.assert.exists(query, 'query missing');

  const results = [query];
  for (let i = 0; i < numChars; i += 1) {
    const last = results[results.length - 1];
    if (last.length === 0) {
      break;
    }
    results.push(last.slice(0, -1));
  }
  return results;
}

function allPrefixes(query) {
  return deleteFromEnd({ query, numChars: query.length - 1 }).reverse();
}

/**
 * Specify the heuristics to classify safe and unsafe queries by example.
 *
 * There is no objective way to decide what is the best trade-off between
 * privacy (nothing passed to search) and convenience (everything passed
 * to search). If possible, the tests should not be too opinionated.
 */
export default describeModule('search/providers/cliqz/query-sanitizer',
  () => ({}),
  () => {
    describe('query-sanitizer module:', function () {
      let sanitizeSearchQuery;
      let QuerySanitizerWithHistory;
      let BoundedMap;

      beforeEach(function () {
        sanitizeSearchQuery = this.module().sanitizeSearchQuery;
        QuerySanitizerWithHistory = this.module().QuerySanitizerWithHistory;
        BoundedMap = this.module().BoundedMap;
      });

      const ok = (query) => {
        let result;
        try {
          result = sanitizeSearchQuery(query);
        } catch (e) {
          throw new Error(`Exception while processing query <<${query}>>: ${e}`, e);
        }

        chai.assert(result === query,
          `Expected query <<${query}>> to be allowed, but it was rejected (result is ${result})`);
      };

      const reject = (query) => {
        let result;
        try {
          result = sanitizeSearchQuery(query);
        } catch (e) {
          throw new Error(`Exception while processing query <<${query}>>: ${e}`, e);
        }

        chai.assert(!result,
          `Expected query <<${query}>> to be rejected, but it was allowed (result is ${result})`);
      };

      // Use them for documentation only, or if you have a test
      // where the heuristics are known to fail but it is not
      // realistic to detect this edge case.
      const unintendedOK = (query) => {
        try {
          ok(query);
        } catch (e) {
          throw new Error(`Harmless error, but it means the test is outdated now: ${e}`, e);
        }
      };
      const unintendedReject = (query) => {
        try {
          reject(query);
        } catch (e) {
          throw new Error(`Harmless error, but it means the test is outdated now: ${e}`, e);
        }
      };

      // Similar to "ok", but includes all prefixes as if you would type them.
      //
      // Instead of this:
      //
      //  ok('a');
      //  ok('ab');
      //  ok('abc');
      //
      // you can write this:
      //
      //  allPrefixesOK('abc');
      //
      const allPrefixesOK = (query) => {
        for (const prefix of allPrefixes(query)) {
          ok(prefix);
        }
      };

      describe('#query-sanitizer', function () {
        it('should allow simple queries', function () {
          ok('munich');
          ok('some harmless query');
        });

        it('should never filter common search terms', function () {
          // These are common queries taking from human web.
          // When you type them in, the queries should never be blocked.
          [
            'amazon',
            'bank of america',
            'bild',
            'craigslist',
            'ebay',
            'ebay kleinanzeigen',
            'facebook',
            'finance',
            'gmail',
            'gmx',
            'gmx.de',
            'google docs',
            'google drive',
            'google maps',
            'google translate',
            'maps',
            'netflix',
            'speed test',
            'paypal',
            'postbank',
            't-online',
            'translate',
            'weather',
            'yahoo mail',
            'youtube',
          ].forEach(allPrefixesOK);
        });

        it('should reject queries with huge amounts of texts', function () {
          reject(stringOfLength(150));
          reject(`${stringOfLength(50)} ${stringOfLength(50)} ${stringOfLength(50)}`);

          ok(stringOfLength(1));
          ok(stringOfLength(10));

          // URL detection is later. So, do not be accept everything
          // if the first seen URL looks harmless.
          ok('http://a');
          reject(`${stringOfLength(150)} http://a ${stringOfLength(150)}`);
        });

        it('should ignore blocks of white spaces when counting length', function () {
          // both these queries hold the same information even though the second is longer
          ok('test query');

          const w = stringOfLength(100, ' \t\n');
          ok(`${w}test${w}query${w}`);
        });

        it('should allow to search for copy/pasted error messages', function () {
          allPrefixesOK('CPU0: Core temperature above threshold, cpu clock throttled (total events = 340569');
          allPrefixesOK('segfault at 0 ip 00007fb3cdf2afad sp 00007fb3cc2d7ae0 error 6 in libxul.so');
          allPrefixesOK('Install error - 0x80248007');

          unintendedReject('Critical dependency: require function is used in a way in which dependencies cannot be statically extracted');
          unintendedReject("Error:Android Source Generator: Error: Can't find bundle for base name messages.AndroidJpsBundle, locale de_DEjava.util.MissingResourceException: Can't find bundle for base name messages.AndroidJpsBundle, locale de_DEat java.ut");
        });

        it('should allow to search for long texts', function () {
          allPrefixesOK('Intel NUC Kit Barebone NUC7I5BNH Intel Core i5-7260U, Intel Iris Plus Grafik 640, 2x DDR');

          // to get an impression, this will cover almost all film titles ...
          allPrefixesOK('Dr. Strangelove or: How I Learned to Stop Worrying and Love the Bomb');
          // ... there are only edge cases with we will miss
          unintendedReject('Those Magnificent Men in Their Flying Machines or How I Flew from London to Paris in 25 hours 11 minutes');

          // these, are examples of real queries that will be rejected as they are too long
          unintendedReject('Inplacement - neue Mitarbeiter erfolgreich einarbeiten und integrieren : wie sie das Potenzial neuer Mitarbeiter erschließen und für ihr Unternehmen nutzbar machen; eine Arbeitshilfe für Führungskräfte / von Doris Brenner; Frank Brenner');
          unintendedReject('Mehrere Mütter kommentieren und bewerten eine Arbeit im weißen Raum, im Atelier des Künstlers Jonathan Meese, das zur mehrdimensionalen Leinwand wird. In der ersten Virtual-Reality-Produktion des Künstlers verschwimmen Wirklichkeit und Künstlermythos.');
          unintendedReject('An open label, randomized, two arm phase III study of nivolumab incombination with ipilimumab versus extreme study regimen as first linetherapy in recurrent or metastatic squamous cell carcinoma of the headand neck');
          unintendedReject('Afflerbach, Patrick, Gergor Kastner, Felix Krause, and Maximilian Röglinger. 2014. The Business Value of Pro-cess Flexibility - An Optimization Model and its Application in the Service Sector.');
        });

        it('should reject full URLs', function () {
          reject('https://github.test/cliqz/navigation-extension/pull/6200/commits/74f65ce53e5e163c7ec2770ba51470eaa8d24ca4');
          reject('https://eu-central-1.console.aws.amazon.test/console/home?region=eu-central-1#');
          reject('http://www.spiegel.test/politik/ausland/carles-puigdemont-gericht-erklaert-auslieferung-wegen-veruntreuung-fuer-zulaessig-a-1218049.html');
          reject('https://www.amazon.de/Samsung-MLT-D101S-Toner-Cartridge-Black/dp/B006WARUYQ');
          reject('http://198.51.100.1/admin/foo/bar/?o=123456');
          reject('http://sinonjs.test/releases/v4.0.0/spies/');
        });

        /**
         * Interpreting queries as URL is sometimes useful, but it can
         * easily lead to false positives:
         *
         * For example:
         *
         *   "boris becker"  ==> "http://boris becker" is not valid, but
         *   "c# in 30 days" ==> "http://c# in 30 days" is accepted
         *
         * For that reason, we must not be too aggressive. Otherwise,
         * it is too easy to break the search. This test lists ??
         */
        it('should not reject valid queries if the could be extend to legal URLs', function () {
          ok('Fu?ball'); // "http://Fußball": valid URL where host is 'Fu' and url.search is "?ball"
          ok('ma? bier');
          ok('ma?krug');

          ok('c# book'); // "http://c# book": valid URL where host is 'c'
          ok('c# for dummies');
          ok('d#nisches bettenlager');
          ok('kleinanzeigen#');
          ok('to.be.true vs to.equal(true)');
        });

        /**
         * Be careful when blocking everything that looks like an URL.
         * There are queries which are difficult to distinguish, but
         * for which you would expect search results.
         */
        it('should not block legimate queries with dots', function () {
          ok('chrome.runtime.id');
          ok('Yandex.Kit');
          ok('Node.Js');
          ok('net.ipv4.tcp_tw_reuse');
          ok('org.apache.log4j.Logger upgrade');
        });

        /**
         * Warning: this test is opinionated.
         *
         * If URL detection is too strong, we also block legitimate queries like
         * in this test. Allowing them means that we will leak file names on
         * Linux and MacOS (unless prefixed with "file://").
         *
         * It is almost impossible to distinguish sensitive file names from
         * safe ones, so do not try but rather err on the side of convenience
         * and allow these queries.
         */
        it('should allow to search for Unix filenames', function () {
          ok('/etc/hosts');
          ok('/etc/password');
          ok('/etc/resolv.conf');
          ok('resolv.conf');

          ok('linux /etc/hosts');
          ok('/etc/hosts linux');
          ok('etc/hosts');
          ok('what is /etc/hosts?');

          // ... but at a certain size, it will be interpreted as an URL
          unintendedReject('/proc/sys/net/ipv4/tcp_tw_recycle');
          ok('linux /proc/sys/net/ipv4/tcp_tw_recycle');
          ok('/proc/sys/net/ipv4/tcp_tw_recycle linux');
        });

        describe('should be more conservative if queries are quoted:', function () {
          it('should skip URL guessing', function () {
            unintendedReject('/proc/sys/net/ipv4/tcp_tw_recycle');
            ok("'/proc/sys/net/ipv4/tcp_tw_recycle'");
            ok('"/proc/sys/net/ipv4/tcp_tw_recycle"');
            ok('linux "/proc/sys/net/ipv4/tcp_tw_recycle"');
            ok('"/proc/sys/net/ipv4/tcp_tw_recycle" linux');

            // However, this should only apply to the URL detection heuristic.
            // For instance, long texts should still be rejected independent
            // of whether they are quoted or not.
            reject(`"${stringOfLength(1000)}"`);
            reject(`'${stringOfLength(1000)}'`);
          });

          it('should still reject true URLs', function () {
            reject('"http://example.com/123456/abcdef?q=123"');
            reject('  "https://example.com/123456/abcdef?q=123" ');
            reject("  'https://example.com/123456/abcdef?q=123' ");
            reject("  'https://example.com/123456/abcdef?q=123");
          });

          it('should still reject shortener URLs', function () {
            reject('http://is.gd/PazNcR');
            reject('"http://is.gd/PazNcR"');
            reject("'http://is.gd/PazNcR'");
          });

          it('should still reject true URLs when they are edited', function () {
            const check = (query) => {
              for (const q of deleteFromFront({ numChars: 10, query })) {
                reject(q);
              }
              for (const q of deleteFromEnd({ numChars: 10, query })) {
                reject(q);
              }
            };
            [
              'http://eu-central-1.console.aws.amazon.test/console/home?region=eu-central-1#',
              'https://github.com/dummy/project/search?p=5&q=URL+api&type=Commits&unscoped_q=URL+api',
            ].forEach((url) => {
              check(url);
              check(`'${url}`);
              check(`'${url}'`);
              check(`"${url}`);
              check(`"${url}"`);
            });
          });
        });

        /**
         * Shorteners URLs are more difficult, as they do not have many characters.
         * That means if the URL detection is too weak, they will slip through.
         */
        it('should reject shortener links', function () {
          reject('https://bit.ly/1h0ceQI');
          reject('https://goo.gl/bdkh1L');
          reject('https://t.co/RUiFUYKzkz');
          reject('https://buff.ly/2LrnrP8');
          reject('https://is.gd/PazNcR');
        });

        it('should reject shortener links', function () {
          reject('bit.ly/1h0ceQI');
          reject('goo.gl/bdkh1L');
          reject('t.co/RUiFUYKzkz');
          reject('buff.ly/2LrnrP8');
          reject('is.gd/PazNcR');
          reject('tinyurl.com/oqnffw3');
        });

        it('should reject URL like queries', function () {
          reject('eu-central-1.console.aws.amazon.test/console/home?region=eu-central-1#');
          reject('www.amazon.de/Samsung-MLT-D101S-Toner-Cartridge-Black/dp/B006WARUYQ');
          reject('www.spiegel.test/politik/ausland/carles-puigdemont-gericht-erklaert-auslieferung-wegen-veruntreuung-fuer-zulaessig-a-1218049.html');

          // whitespaces or newlines:
          reject('  http://sinonjs.test/releases/v4.0.0/spies/  ');
          reject('http://198.51.100.1/admin/foo/bar \n  /?token=123456789');
        });

        /**
         * Trade-off: Provide search results for very short URL like queries.
         *
         * Unclear where to draw the line, but once the URL becomes long enough
         * it becomes more likely that history results are superior to the search
         * anyway.
         */
        it('should provide limited support to complete URL like queries', function () {
          allPrefixesOK('http://am');
          allPrefixesOK('http://fa');
          allPrefixesOK('https://st');
        });

        it('should block queries starting with URI schemas where search does not help', function () {
          reject('ftp://example.test');
          reject('file:///home/user/some-local-file.txt');
          reject('chrome://cliqz/content/core/content-script.bundle.js');
        });

        it('should block email URIs', function () {
          reject('mailto:someone@example.com');
          reject('mailto:someone@example.com?subject=This%20is%20the%20subject&cc=someone_else@example.com&body=This%20is%20the%20body');
        });

        it('should block big data URIs', function () {
          reject('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAQMAAAAlPW0iAAAABlBMVEUAAAD///+l2Z/dAAAAM0lEQVR4nGP4/5/h/1+G/58ZDrAz3D/McH8yw83NDDeNGe4Ug9C9zwz3gVLMDA/A6P9/AFGGFyjOXZtQAAAAAElFTkSuQmCC');
          reject('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAAMCAIAAADgcHrrAAAAK3RFWHRDcmVhdGlvbiBUaW1lAHdvIDI4IGRlYyAyMDA1IDE5OjIyOjU0ICswMTAwt1vrFQAAAAd0SU1FB9UMHBIaG3TyZjMAAAAJcEhZcwAACxIAAAsSAdLdfvwAAAAEZ0FNQQAAsY8L/GEFAAAAUklEQVR42t3PsQrAIAxF0Vvp/3+hU0dRU8VRsEHc1Q4dGrIE3uER+O8cbRMEcGDetX3LTvQ53WtZWBBlFcpGj0/4W5lAhkSQVTNYy+OYsx5zkQehPiOt55njVQAAAABJRU5ErkJggg==');

          // We could filter smaller URIs, too. But it is not so clear how you
          // can easily leak personal information with these kind of URIs.
          // Probably not worth to bother.

          unintendedOK('data:text/plain;charset=UTF-8;page=21,the%20data:1234,5678');
          unintendedOK('data:text/vnd-example+xyz;foo=bar;base64,R0lGODdh');
        });

        it('should never search for URLs with passwords (pure url)', function () {
          reject('http://user:password@example.test');
          reject('http://user:password@example.test:8080/cgi-bin/script.php');
        });

        it('should never search for URLs with passwords (url as part of the query)', function () {
          reject('url "http://user:password@example.test:8080/cgi-bin/script.php"');
          reject("'http://user@pwd");
        });

        /**
         * Protection against leaking URLs by editing.
         */
        it('should still reject URLs when deleting first characters', function () {
          for (const query of deleteFromFront({
            numChars: 10,
            query: 'https://pastebin.test/6mxD6L2k'
          })) {
            reject(query);
          }

          for (const query of deleteFromFront({
            numChars: 10,
            query: 'https://gist.github.test/rsobers/2016e57e0cb00c8e7a2d'
          })) {
            reject(query);
          }

          for (const query of deleteFromFront({
            numChars: 10,
            query: 'http://198.51.100.1/admin/foo/bar/?token=123456789'
          })) {
            reject(query);
          }
        });

        /**
         * Protection against leaking URLs by editing.
         */
        it('should still reject URLs when deleting last characters', function () {
          for (const query of deleteFromEnd({
            numChars: 2,
            query: 'https://pastebin.test/6mxD6L2k'
          })) {
            reject(query);
          }

          for (const query of deleteFromEnd({
            numChars: 10,
            query: 'https://gist.github.test/rsobers/2016e57e0cb00c8e7a2d'
          })) {
            reject(query);
          }

          for (const query of deleteFromEnd({
            numChars: 10,
            query: 'http://198.51.100.1/admin/foo/bar/?token=123456789'
          })) {
            reject(query);
          }
        });

        it('should keep reject URLs when characters are added in front', function () {
          const url = 'http://www.secret-url.test/admin/foo/bar/?token=123456789';
          reject(url);

          // should still be rejected:
          reject(`ä${url}`);
          reject(`fsd${url}`);
          reject(`added by mistake${url}`);
          reject(`added by mistake ${url}`);
        });

        /**
         * We do not want to see passwords that people accidentially put
         * in the search, but it is difficult to prevent it as we would
         * block legitimate queries. For example:
         */
        it('should allow to search for IDs', function () {
          ok('519000'); // WKN
          ok('DE0005190003'); // ISIN
          ok('B006WARUYQ'); // ASIN
          ok('8806071674742'); // EAN
          ok('978-3-16-148410-0'); // ISBN
          ok('KB4074588'); // Windows update
          ok('windows 10 KB4074588');
          ok('icneeihilccoekhaofpknpjmpagcpmdj'); // Chrome extension id

          // Acer item model numbers
          ok('EB321HQUAwi');
          ok('UM.JE1EE.A01');
        });

        /**
         * If we can link events, dates and addresses are problematic
         * that is why they are blocked in human web.
         *
         * In the context of the search, however, there are valid cases
         * where we would expect to see search results. For example:
         */
        it('should allow to search for dates', function () {
          ok('09-11-2001');
          ok('24/10/1929');
          ok('9. November 1989');
        });

        it('should not be too aggressive in the URL guessing heuristic', function () {
          ok('//twitter.com username');
          ok('Ö//twitter.com username');
          ok('abc //twitter.com username');
        });

        describe('should support characters from multiple languages:', function () {
          it('English', function () {
            allPrefixesOK('this is an example query');
          });

          it('German', function () {
            allPrefixesOK('Das ist ein Beispiel für eine Sucheanfrage (mit Umlauten äüßÖÄÜ)');
          });

          it('French', function () {
            allPrefixesOK('ceci est un exemple de requête de recherche');
          });

          it('Spanish', function () {
            allPrefixesOK('esta es una consulta de búsqueda de ejemplo');
          });

          it('Italien', function () {
            allPrefixesOK('questa è una query di ricerca di esempio');
          });

          it('Arabic', function () {
            allPrefixesOK('هذا مثال لاستعلام البحث');
          });

          it('Chinese', function () {
            allPrefixesOK('这是一个示例搜索查询');
          });

          it('Urdu', function () {
            allPrefixesOK('یہ ایک مثال کے طور پر تلاش کے سوال ہے');
          });

          it('Japanese', function () {
            allPrefixesOK('これは検索クエリの例です');
          });

          it('Vietnamese', function () {
            allPrefixesOK('đây là một truy vấn tìm kiếm mẫu');
          });

          it('Norwegian', function () {
            allPrefixesOK('Dette er et eksempel på søket');
          });

          it('Hebrew', function () {
            allPrefixesOK('זוהי שאילתת חיפוש לדוגמה');
          });

          it('Turkish', function () {
            allPrefixesOK('Bu bir örnek arama sorgusudur');
          });
        });

        it('should allow special characters', function () {
          allPrefixesOK('30£ in €');
          allPrefixesOK('30£ in $');
        });
      });

      describe('#_smallQueryButCouldBeUrlShortener', function () {
        let _smallQueryButCouldBeUrlShortener;

        beforeEach(function () {
          _smallQueryButCouldBeUrlShortener = this.module()._smallQueryButCouldBeUrlShortener;
        });

        const expectFalse = (url) => {
          if (_smallQueryButCouldBeUrlShortener(url)) {
            throw Error(`"${url}" was misclassifed as a shortener URL`);
          }
        };

        const expectTrue = (url) => {
          if (!_smallQueryButCouldBeUrlShortener(url)) {
            throw Error(`Shortener URL "${url}" was not detected`);
          }
        };

        // Note: at this point, we only interested in shorteners with a
        // fairly small host name. For example, 'tinyurl.com/oqnffw3'
        // will lead to URLs that are already big enough to be handled
        // by other rules.
        it('should detect real shortener links (with small host names)', function () {
          [
            'bit.ly/1h0ceQI',
            'goo.gl/bdkh1L',
            't.co/RUiFUYKzkz',
            'buff.ly/2LrnrP8',
            'is.gd/PazNcR',
            'x.co/SHORTener',
          ].forEach(expectTrue);
        });

        it('should not misclassify simple search queries', function () {
          [
            'tea',
            'coffee',
            'bayern münchen',
            'google',
          ].forEach(expectFalse);
        });

        it('should not misclassify normal urls (with or without schema)', function () {
          [
            'www.spiegel.de/politik/ausland/',
            'http://www.spiegel.de/politik/ausland/',
            'www.spiegel.de/politik',
            'google.com',
            'facebook.com/l',
            'facebook.com/login',
          ].forEach(expectFalse);
        });
      });

      describe('#BoundedMap', function () {
        it('should delete old values that are rotated out (size == 1)', function () {
          const map = new BoundedMap(1);
          expect(map.get('foo')).to.equal(null);

          expect(map.set('foo', 'value1'));
          expect(map.get('foo')).to.equal('value1');

          // new entry for "bar" should delete "foo"
          expect(map.set('bar', 'value2'));
          expect(map.get('bar')).to.equal('value2');
          expect(map.get('foo')).to.equal(null);
        });

        /**
         * Helper: should behave the same as a straightforward
         * reference implementation.
         */
        function check({ size, sequence }) {
          const map = new BoundedMap(size);

          const fullMap = new Map();
          const lastEntries = [];

          const allKeys = sequence.map(x => x[0]);
          sequence.forEach(([key, value]) => {
            map.set(key, value);

            // reference implementation
            fullMap.set(key, value);
            lastEntries.push(key);
            if (lastEntries.length > size) {
              lastEntries.shift();
            }

            for (const _key of allKeys) {
              const _value = map.get(_key);
              const expectedValue = lastEntries.includes(_key) ? fullMap.get(_key) : null;
              expect(_value).to.equal(expectedValue);
            }
          });

          // passed all assertions
          return true;
        }

        it('should cleanup entries (size: 10, strings)', function () {
          jsc.assert(jsc.forall('array (pair string string)', 'bool', sequence => check({ size: 10, sequence })));
        });

        it('should cleanup entries (size: 3, integers)', function () {
          jsc.assert(jsc.forall('array (pair nat nat)', 'bool', sequence => check({ size: 3, sequence })));
        });

        it('should cleanup entries (size: 10, integers)', function () {
          jsc.assert(jsc.forall('array (pair nat nat)', 'bool', sequence => check({ size: 10, sequence })));
        });
      });

      describe('#QuerySanitizerWithHistory', function () {
        let uut;

        beforeEach(function () {
          uut = new QuerySanitizerWithHistory();
        });

        it('should fallback to the last prefix that was still ok', function () {
          const url = 'https://www.example.test/this-is-a-long-url-that-should-be-rejected?token=12345678';
          reject(url);

          let expectedSafeQuery = null;
          const prefixes = allPrefixes(url);
          for (const query of prefixes) {
            if (sanitizeSearchQuery(query)) {
              expectedSafeQuery = query;
            }

            const safeQuery = uut.sanitize(query);

            expect(safeQuery).to.equal(expectedSafeQuery);
            ok(safeQuery);
          }
        });

        it('should fill cache if used if writing is allowed', function () {
          uut._maxAttempts = 1000; // to ensure that all prefixes are tested

          expect(uut.sanitize('safe prefix', { rememberSafeQueries: true })).to.equal('safe prefix');
          expect(uut.sanitize('safe prefix? http://some-host.test@password/abc/def?123')).to.equal('safe prefix');
        });

        it('should not store data if used in readonly mode', function () {
          uut._maxAttempts = 1000; // to ensure that all prefixes are tested

          expect(uut.sanitize('safe prefix', { rememberSafeQueries: false })).to.equal('safe prefix');
          expect(uut.sanitize('safe prefix? http://some-host.test@password/abc/def?123')).to.equal(null);
        });
      });
    });
  });
