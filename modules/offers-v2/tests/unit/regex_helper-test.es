/* global chai */
/* global describeModule */
/* global require */


const VALID_URL_DATAS = [
  { domain: 'google.com', url: 'www.google.com/test' }
];

export default describeModule('offers-v2/regex_helper',
  () => ({
    'offers-v2/common/offers_v2_logger': {
      default: {
        debug: () => {},
        error: () => {},
        info: () => {},
        log: () => {},
        warn: () => {},
        logObject: () => {},
      }
    },
    'core/platform': {
      isChromium: false
    },
    'core/cliqz': {
      default: {
        setInterval: function () {}
      },
      utils: {
        setInterval: function () {}
      }
    },
    'platform/console': {
      default: {}
    },
  }),
  () => {
    describe('regex_helper_test', function() {
      let RegexHelper;
      beforeEach(function () {
        RegexHelper = this.module().default;
      });

      describe('#correctness_tests', function () {
        context('proper build url data', function () {
          beforeEach(function () {
          });

          it('test buildUrlMatchData', function () {
            const rgh = new RegexHelper();
            VALID_URL_DATAS.forEach((urlData) => {
              const r = rgh.buildUrlMatchData(urlData);
              chai.expect(r.raw_url).to.exist;
              chai.expect(r.domain).to.exist;
            })
          });
        });

        // test invalid url data
        // test invalid regex data
        // etc

        context('testRegex without regex', function () {
          beforeEach(function () {
          });

          it('simple match', function () {
            const rgh = new RegexHelper();
            let urlData = { domain: 'google.com', url: 'www.google.com/test' };
            const rData = [
              {
                d: ['google.com'],
                p: ['/test'],
                r: []
              }
            ];
            let builtUrl = rgh.buildUrlMatchData(urlData);
            const regObj = rgh.compileRegexObject(rData);

            // check the test
            chai.expect(rgh.testRegex(builtUrl, regObj)).to.equal(true);

            // check pattern
            urlData = { domain: 'google.com', url: 'www.google.com/ttest' };
            builtUrl = rgh.buildUrlMatchData(urlData);
            chai.expect(rgh.testRegex(builtUrl, regObj)).to.equal(false);

            urlData = { domain: 'google.com', url: 'www.google.com/ttest/tteeesst/test/sada' };
            builtUrl = rgh.buildUrlMatchData(urlData);
            chai.expect(rgh.testRegex(builtUrl, regObj)).to.equal(true);
          });

          it('no patterns match', function () {
            const rgh = new RegexHelper();
            let urlData = { domain: 'google.com', url: 'www.google.com/test' };
            const rData = [
              {
                d: ['google.com'],
                p: [''],
                r: []
              }
            ];
            let builtUrl = rgh.buildUrlMatchData(urlData);
            const regObj = rgh.compileRegexObject(rData);

            // check the test
            chai.expect(rgh.testRegex(builtUrl, regObj)).to.equal(true);

            // check pattern
            urlData = { domain: 'googlee.com', url: 'www.googlee.com/ttest' };
            builtUrl = rgh.buildUrlMatchData(urlData);
            chai.expect(rgh.testRegex(builtUrl, regObj)).to.equal(false);
          });


          it('invalid domains not match', function () {
            const rgh = new RegexHelper();
            let urlData = { domain: 'google.com', url: 'www.google.com/test' };
            const rData = [
              {
                d: ['googlee.com'],
                p: [''],
                r: []
              }
            ];
            let builtUrl = rgh.buildUrlMatchData(urlData);
            const regObj = rgh.compileRegexObject(rData);

            // check the test
            chai.expect(rgh.testRegex(builtUrl, regObj)).to.equal(false);

            // check pattern
            urlData = { domain: 'google.com', url: 'www.googlee.com/ttest' };
            builtUrl = rgh.buildUrlMatchData(urlData);
            chai.expect(rgh.testRegex(builtUrl, regObj)).to.equal(false);
          });

          it('subdomain string not match', function () {
            const rgh = new RegexHelper();
            let urlData = { domain: 'google.com', url: 'www.google.com/test' };
            const rData = [
              {
                d: ['google'],
                p: [''],
                r: []
              }
            ];
            let builtUrl = rgh.buildUrlMatchData(urlData);
            const regObj = rgh.compileRegexObject(rData);

            // check the test
            chai.expect(rgh.testRegex(builtUrl, regObj)).to.equal(false);

            // check pattern
            urlData = { domain: 'google.co', url: 'www.googlee.com/ttest' };
            builtUrl = rgh.buildUrlMatchData(urlData);
            chai.expect(rgh.testRegex(builtUrl, regObj)).to.equal(false);
          });

          it('multiple domains match', function () {
            const rgh = new RegexHelper();
            let urlData = { domain: 'google.com', url: 'www.google.com/test' };
            const rData = [
              {
                d: ['dom0.co', 'dom1.co', 'google.com'],
                p: [''],
                r: []
              }
            ];
            let builtUrl = rgh.buildUrlMatchData(urlData);
            const regObj = rgh.compileRegexObject(rData);

            // check the test
            chai.expect(rgh.testRegex(builtUrl, regObj)).to.equal(true);

            // check pattern
            urlData = { domain: 'google.co', url: 'www.google.com/test' };
            builtUrl = rgh.buildUrlMatchData(urlData);
            chai.expect(rgh.testRegex(builtUrl, regObj)).to.equal(false);
          });

          it('multiple string patterns match', function () {
            const rgh = new RegexHelper();
            let urlData = { domain: 'google.com', url: 'www.google.com/test/p2/' };
            const rData = [
              {
                d: ['google.com'],
                p: [''],
                r: []
              }
            ];
            let builtUrl = rgh.buildUrlMatchData(urlData);
            const regObj = rgh.compileRegexObject(rData);

            // check the test
            chai.expect(rgh.testRegex(builtUrl, regObj)).to.equal(true);

            // check pattern
            urlData = { domain: 'google.co', url: 'www.google.com/test' };
            builtUrl = rgh.buildUrlMatchData(urlData);
            chai.expect(rgh.testRegex(builtUrl, regObj)).to.equal(false);
          });

          // match with one domain
          // match with multiple domains
          // match with multiple string patterns
          // match with 0 string patterns but regex
          // match with multiple regex
          // match with multiple domains patterns and regexes
          // no match for regex but all
          // no match for domain but all
          // no match for pattern but all
          // performance test??
          //
          // test cached operations (cached elements still match the same urls and not others)
          // test we are deleting old entries properly
        });

        context('with regex', function () {
          beforeEach(function () {
          });

          it('simple case', function () {
            const rgh = new RegexHelper();
            let urlData = { domain: 'google.com', url: 'www.google.com/test/p2/' };
            const rData = [
              {
                d: ['google.com'],
                p: [''],
                r: ['\/test\/']
              }
            ];
            let builtUrl = rgh.buildUrlMatchData(urlData);
            const regObj = rgh.compileRegexObject(rData);

            // test the regex are properly built (no exception is thrown)
            rData[0].r.forEach((strR) => { const x = new RegExp(strR);});

            // check the test
            chai.expect(rgh.testRegex(builtUrl, regObj)).to.equal(true);

            // // check that the regex doesnt match whatever
            urlData = { domain: 'google.com', url: 'www.google.com/test2/p2/' };
            builtUrl = rgh.buildUrlMatchData(urlData);
            chai.expect(rgh.testRegex(builtUrl, regObj)).to.equal(false);
          });


          it('multi case', function () {
            const rgh = new RegexHelper();
            let urlData = { domain: 'google.com', url: 'www.google.com/test/p2/' };
            const rData = [
              {
                d: ['google.com'],
                p: [''],
                r: ['\/tst\/', '\/test2\/', '\/tesst\/']
              }
            ];
            let builtUrl = rgh.buildUrlMatchData(urlData);
            const regObj = rgh.compileRegexObject(rData);

            // test the regex are properly built (no exception is thrown)
            rData[0].r.forEach((strR) => { const x = new RegExp(strR);});

            // check the test
            chai.expect(rgh.testRegex(builtUrl, regObj)).to.equal(false);

            // check 3 cases
            urlData = { domain: 'google.com', url: 'www.google.com/test2/p2/' };
            builtUrl = rgh.buildUrlMatchData(urlData);
            chai.expect(rgh.testRegex(builtUrl, regObj)).to.equal(true);
            urlData = { domain: 'google.com', url: 'www.google.com/tst/p2/' };
            builtUrl = rgh.buildUrlMatchData(urlData);
            chai.expect(rgh.testRegex(builtUrl, regObj)).to.equal(true);
            urlData = { domain: 'google.com', url: 'www.google.com/tes/p2/tesst/saa' };
            builtUrl = rgh.buildUrlMatchData(urlData);
            chai.expect(rgh.testRegex(builtUrl, regObj)).to.equal(true);
          });

          it('proper match with string patterns', function () {
            const rgh = new RegexHelper();
            let urlData = { domain: 'google.com', url: 'www.google.com/test/p2/' };
            const rData = [
              {
                d: ['google.com'],
                p: ['/p2'],
                r: ['\/test\/']
              }
            ];
            let builtUrl = rgh.buildUrlMatchData(urlData);
            const regObj = rgh.compileRegexObject(rData);

            // test the regex are properly built (no exception is thrown)
            rData[0].r.forEach((strR) => { const x = new RegExp(strR);});

            // check the test
            chai.expect(rgh.testRegex(builtUrl, regObj)).to.equal(true);

            urlData = { domain: 'google.com', url: 'www.google.com/test/p/2/' };
            builtUrl = rgh.buildUrlMatchData(urlData);
            chai.expect(rgh.testRegex(builtUrl, regObj)).to.equal(false);
          });

          it('empty patterns with regex should match', function () {
            const rgh = new RegexHelper();
            let urlData = { domain: 'google.com', url: 'www.google.com/test/p2/' };
            const rData = [
              {
                d: ['ebay-kleinanzeigen.de'],
                p: [],
                r: ['ebay-kleinanzeigen\\.de/2017/s-immobilien']
              }
            ];
            let builtUrl = rgh.buildUrlMatchData(urlData);
            const regObj = rgh.compileRegexObject(rData);

            // test the regex are properly built (no exception is thrown)
            rData[0].r.forEach((strR) => { const x = new RegExp(strR);});

            const inputData = [
              { input: { domain: 'google.com', url: 'www.google.com/test/p/2/' }, expected: false },
              { input: { domain: 'ebay-kleinanzeigen.de', url: 'www.google.com/test/p/2/' }, expected: false },
              { input: { domain: 'ebay-kleinanzeigen.de', url: 'ebay-kleinanzeigen.de' }, expected: false },
              { input: { domain: 'ebay-kleinanzeigen.de', url: 'ebay-kleinanzeigen.de/2017' }, expected: false },
              { input: { domain: 'ebay-kleinanzeigen.de', url: 'ebay-kleinanzeigen.de/2017/s-immobilian' }, expected: false },
              { input: { domain: 'ebay-kleinanzeigen.de', url: 'ebay-kleinanzeigen.de/2017/s-immobilien' }, expected: true },
              { input: { domain: 'ebay-kleinanzeigen.de', url: 'ebay-kleinanzeigen.de/2017/s-immobilien/whatever' }, expected: true },
            ];

            inputData.forEach((id) => {
              builtUrl = rgh.buildUrlMatchData(id.input);
              chai.expect(rgh.testRegex(builtUrl, regObj)).to.equal(id.expected);
            });
          });

          // TODO: test that invalid regexes doesn't match any url again, if we
          // provide a list of invalid urls then the condition should be false
          // for all cases? or if we have one proper regex we keep working properly?
          //

        });


      });
    })
  }
);
