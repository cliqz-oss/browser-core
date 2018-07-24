/* global chai */
/* global describeModule */
/* global sinon */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const mockBrowser = require('mock-browser');
const expect = chai.expect;
const R = require('ramda');
const FileHound = require('filehound');

const stripJsonComments = require('strip-json-comments');
function jsonParse(text) {
  return JSON.parse(stripJsonComments(text));
}

const FIXTURES_BASE_PATH = 'modules/human-web/tests/unit/fixtures/content-extractor';

function readFixtureFromDisk(path) {
  const fixture = jsonParse(fs.readFileSync(`${FIXTURES_BASE_PATH}/${path}/scenario.json`, 'utf8'));
  fixture.html = zlib.gunzipSync(fs.readFileSync(`${FIXTURES_BASE_PATH}/${path}/page.html.gz`)).toString();
  return fixture;
}

function findAllFixtures() {
  function isFixtureDir(file) {
    if (!file.isDirectorySync()) {
      return false;
    }
    const base = file.getAbsolutePath();
    return fs.existsSync(path.join(base, 'scenario.json')) && fs.existsSync(path.join(base, 'page.html.gz'));
  }

  return FileHound.create()
    .path(FIXTURES_BASE_PATH)
    .directory()
    .addFilter(isFixtureDir)
    .findSync()
    .map(file => path.relative(FIXTURES_BASE_PATH, file));
}

/**
 * Although not required for the tests, these patterns should ideally
 * be close to the ones that we used in production.
 * If they deviate too much from production, the tests will have less
 * value in catching bugs.
 */
const DEFAULT_PATTERNS = {
  normal: jsonParse(fs.readFileSync(`${FIXTURES_BASE_PATH}/patterns.json`, 'utf8')),
  strict: jsonParse(fs.readFileSync(`${FIXTURES_BASE_PATH}/patterns-anon.json`, 'utf8')),
};

const enableLogging = true;

export default describeModule('human-web/content-extractor',
  () => ({
    'core/logger': {
      default: { get() {
        return {
          debug() {},
          log() {},
          warn(...args) {
            if (enableLogging) {
              console.warn(...args);
            }
          },
          error(...args) {
            if (enableLogging) {
              console.error(...args);
            }
          },
        };
      } }
    },
  }),
  () => {
    describe('ContentExtractor', function () {
      let ContentExtractor, CliqzHumanWeb, uut;
      let mockWindow, document;
      let fixture;

      const setupDocument = function setupDocument(html) {
        mockWindow = mockBrowser.mocks.MockBrowser.createWindow();

        document = mockWindow.document;
        document.open();
        document.write(html);
        document.close();
      };

      const initFixture = function initFixture(path) {
        try {
          fixture = readFixtureFromDisk(path);
          setupDocument(fixture.html);
        } catch (e) {
          throw new Error(`Failed to load test fixture "${path}": ${e}`, e);
        }
      };

      const verifyFixtureExpectations = function verifyFixtureExpectations() {
        function groupTelemetryCallsByAction(sinonSpy) {
          return R.pipe(
            R.map(args => {
              expect(args.length).to.equal(1);
              return args[0];
            }),
            R.groupBy(msg => msg.action)
          )(sinonSpy.args);
        }

        const messages = groupTelemetryCallsByAction(CliqzHumanWeb.telemetry);
        if (fixture.mustContain) {
          for (const check of fixture.mustContain) {
            if (!messages[check.action]) {
              throw new Error(`Missing message with action=${check.action}`);
            }

            // simplification for now: assume we will not send more than
            // one message of the same type. (If this assumption does not
            // hold, this test code needs to be extended.)
            expect(messages[check.action].length === 1);

            const realPayload = messages[check.action][0].payload;
            expect(realPayload).to.deep.equal(check.payload);
          }
        }

        if (fixture.mustNotContain) {
          for (const check of fixture.mustNotContain) {
            const blacklist = new RegExp(`^${check.action.replace('*', '.*')}$`);
            const matches = Object.keys(messages).filter(x => blacklist.test(x));
            if (matches.length > 0) {
              throw new Error(`Expected no messages with action '${check.action}' ` +
                              `but got messages for the following actions: [${matches}]`);
            }
          }
        }
      };

      beforeEach(function () {
        this.timeout(10000);
        ContentExtractor = this.module().ContentExtractor;
        CliqzHumanWeb = {
          debug: enableLogging,
          msgType: 'humanweb',
          getCountryCode() {
            return 'de';
          },

          maskURL(url) {
            return url;
          },

          // args: msg, instantPush
          telemetry: sinon.fake(),

          // args: url, query
          addStrictQueries: sinon.fake(),

          queryCache: {},
        };
        uut = new ContentExtractor(CliqzHumanWeb);
      });

      afterEach(function () {
        document = null;
        fixture = null;

        if (mockWindow) {
          mockWindow.close();
          mockWindow = null;
        }
      });

      describe('with an empty ruleset', function () {
        describe('#isSearchEngineUrl', function () {
          it('should not match any URL', function () {
            expect(uut.isSearchEngineUrl('about:blank')).to.be.false;
            expect(uut.isSearchEngineUrl('http://www.example.com/')).to.be.false;
            expect(uut.isSearchEngineUrl('https://www.google.de/search?q=test')).to.be.false;
          });
        });

        describe('when searching in Google for "Donald Trump"', function () {
          beforeEach(function () {
            initFixture('go/donald-trump-2018-05-25');
          });

          it('should not find any data (ruleset: "normal")', function () {
            uut.checkURL(document, fixture.url, 'normal');
            expect(CliqzHumanWeb.addStrictQueries.notCalled);
            expect(CliqzHumanWeb.telemetry.notCalled);
          });

          it('should not find any data (ruleset: "strict")', function () {
            uut.checkURL(document, fixture.url, 'strict');
            expect(CliqzHumanWeb.addStrictQueries.notCalled);
            expect(CliqzHumanWeb.telemetry.notCalled);
          });
        });
      });

      describe('with a realistic ruleset', function () {
        beforeEach(function () {
          uut.updatePatterns(DEFAULT_PATTERNS.normal, 'normal');
          uut.updatePatterns(DEFAULT_PATTERNS.strict, 'strict');
        });

        describe('#isSearchEngineUrl', function () {
          it('matches the configured search engines', function () {
            // no match:
            expect(uut.isSearchEngineUrl('about:blank')).to.be.false;
            expect(uut.isSearchEngineUrl('http://www.example.com/')).to.be.false;

            // should match:
            expect(uut.isSearchEngineUrl('https://www.google.de/search?q=test')).to.be.true;
            expect(uut.isSearchEngineUrl('https://www.google.com/search?q=test')).to.be.true;
          });
        });

        describe('in an empty HTML page', function () {
          beforeEach(function () {
            initFixture('empty-page');
          });

          it('should not find any data', function () {
            uut.checkURL(document, fixture.url, 'normal');
            uut.checkURL(document, fixture.url, 'strict');
            expect(CliqzHumanWeb.addStrictQueries.notCalled);
            expect(CliqzHumanWeb.telemetry.notCalled);
          });
        });

        describe('when searching in Google for "Donald Trump"', function () {
          beforeEach(function () {
            initFixture('go/donald-trump-2018-05-25');
          });

          it('should find search results (ruleset: "normal")', function () {
            uut.checkURL(document, fixture.url, 'normal');
            expect(CliqzHumanWeb.addStrictQueries.called);
            expect(CliqzHumanWeb.telemetry.notCalled);
          });

          it('should find search results (ruleset: "strict")', function () {
            uut.checkURL(document, fixture.url, 'strict');
            expect(CliqzHumanWeb.addStrictQueries.notCalled);
            expect(CliqzHumanWeb.telemetry.called);
          });
        });
      });

      findAllFixtures().forEach((fixtureDir) => {
        describe(`in scenario: ${fixtureDir}`, function () {
          beforeEach(function () {
            uut.updatePatterns(DEFAULT_PATTERNS.normal, 'normal');
            uut.updatePatterns(DEFAULT_PATTERNS.strict, 'strict');
          });

          it('should pass the fixture\'s expections', function () {
            // Given
            initFixture(fixtureDir);
            CliqzHumanWeb.telemetry = sinon.spy();

            // When
            uut.checkURL(document, fixture.url, 'strict');

            // Then
            verifyFixtureExpectations();
          });
        });
      });

    });

    describe('parseQueryString', function () {
      let parseQueryString;

      beforeEach(function () {
        parseQueryString = this.module().parseQueryString;
      });

      it('should pass regression tests', function() {
        expect(parseQueryString('')).to.deep.equal({});
        expect(parseQueryString('foo')).to.deep.equal({ foo: [true] });
        expect(parseQueryString('foo=bar')).to.deep.equal({ foo: ['bar'] });

        // unquoting:
        expect(parseQueryString('a%26b=a%26b')).to.deep.equal({ 'a&b': ['a&b'] });

        // grouping:
        expect(parseQueryString('a=b&c=d')).to.deep.equal({ a: ['b'], c: ['d'] });
        expect(parseQueryString('a=b&a=c')).to.deep.equal({ a: ['b', 'c'] });

        // '&' and ';' both split:
        expect(parseQueryString('a=b;c=d')).to.deep.equal({ a: ['b'], c: ['d'] });
        expect(parseQueryString('a;b&c')).to.deep.equal({ a: [true], b: [true], c: [true] });
        expect(parseQueryString('a;a&a')).to.deep.equal({ a: [true, true, true] });
      });
    });

    describe('_mergeArr', function () {
      let _mergeArr;

      beforeEach(function () {
        _mergeArr = this.module()._mergeArr;
      });

      it('should pass regression tests', function() {
        expect(_mergeArr({ x: [1, 2, 3], y: [4, 5, 6], z: [7, 8, 9] })).to.deep.equal([
          { x: 1, y: 4, z: 7 },
          { x: 2, y: 5, z: 8 },
          { x: 3, y: 6, z: 9 },
        ]);
      });
    });
  }
);
