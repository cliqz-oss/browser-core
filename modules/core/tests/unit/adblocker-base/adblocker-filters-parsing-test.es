/* global chai */
/* global describeModule */


const fs = require('fs');
const encoding = require('text-encoding');

const TextDecoder = encoding.TextDecoder;
const TextEncoder = encoding.TextEncoder;


function loadTestCases(path) {
  const data = fs.readFileSync(path, 'utf8');
  const testCases = [];

  // Parse test cases
  data.split(/\n/).forEach((line) => {
    let testCase = null;
    try {
      testCase = JSON.parse(line);
      testCases.push(testCase);
    } catch (ex) {
      /* Ignore exception */
    }
  });

  return testCases;
}


export default describeModule('core/adblocker-base/filters-parsing',
  () => ({
    'platform/url': {},
    'platform/text-decoder': {
      default: TextDecoder,
    },
    'platform/text-encoder': {
      default: TextEncoder,
    },
    'core/platform': {
      platformName: 'firefox',
    },
    'core/cliqz': {
      utils: {},
    },
    'core/encoding': {
      fromUTF8(str) { return str; },
      toHex(str) { return str; },
    },
    'core/console': {
      default: console,
    },
  }),
  () => {
    describe('#CosmeticFilter', () => {
      let parseFilter;
      let CosmeticFilter;

      // Generate test cases
      context('Cosmetic filter parsing', () => {
        beforeEach(function importFilterParser() {
          parseFilter = this.module().parseFilter;
          CosmeticFilter = this.module().CosmeticFilter;
        });

        const dataPath = 'modules/core/tests/unit/adblocker-base/data/cosmetics_parsing.txt';
        loadTestCases(dataPath).forEach((testCase) => {
          it(`parses ${testCase.filter} correctly`,
            () => new Promise((resolve, reject) => {
              let parsed = parseFilter(testCase.filter, true, true);
              if (parsed === null) {
                parsed = { supported: false };
              } else {
                parsed = {
                  hostnames: parsed.hostnames,
                  unhide: parsed.isUnhide(),
                  scriptInject: parsed.isScriptInject(),
                  scriptBlock: parsed.isScriptBlock(),
                  selector: parsed.selector,
                };
              }
              Object.keys(testCase.compiled).forEach((key) => {
                try {
                  chai.expect(parsed[key]).to.deep.equal(testCase.compiled[key]);
                } catch (ex) {
                  reject(`Expected ${key} == ${testCase.compiled[key]} (found ${parsed[key]})`);
                }
              });
              resolve();
            })
          );
        });
      });
    });

    describe('#NetworkFilter', () => {
      let parseFilter;
      let NetworkFilter;

      // Generate test cases
      context('Filters parsing', () => {
        beforeEach(function importFilterParser() {
          parseFilter = this.module().parseFilter;
          NetworkFilter = this.module().NetworkFilter;
        });

        const dataPath = 'modules/core/tests/unit/adblocker-base/data/filters_parsing.txt';
        loadTestCases(dataPath).forEach((testCase) => {
          it(`parses ${testCase.filter} correctly`,
            () => new Promise((resolve, reject) => {
              let parsed = parseFilter(testCase.filter, true, true);
              if (parsed === null) {
                parsed = { supported: false };
              } else {
                parsed = {
                  filter: parsed.getFilter(),
                  firstParty: parsed.firstParty(),
                  fromAny: parsed.fromAny(),
                  fromImage: parsed.fromImage(),
                  fromMedia: parsed.fromMedia(),
                  fromObject: parsed.fromObject(),
                  fromObjectSubrequest: parsed.fromObjectSubrequest(),
                  fromOther: parsed.fromOther(),
                  fromPing: parsed.fromPing(),
                  fromScript: parsed.fromScript(),
                  fromStylesheet: parsed.fromStylesheet(),
                  fromSubdocument: parsed.fromSubdocument(),
                  fromWebsocket: parsed.fromWebsocket(),
                  fromXmlHttpRequest: parsed.fromXmlHttpRequest(),
                  hostname: parsed.getHostname(),
                  id: parsed.id,
                  isException: parsed.isException(),
                  isHostname: parsed.isHostname(),
                  isHostnameAnchor: parsed.isHostnameAnchor(),
                  isImportant: parsed.isImportant(),
                  isLeftAnchor: parsed.isLeftAnchor(),
                  isPlain: parsed.isPlain(),
                  isRegex: parsed.isRegex(),
                  isRightAnchor: parsed.isRightAnchor(),
                  matchCase: parsed.matchCase(),
                  optDomains: parsed.optDomains,
                  optNotDomains: parsed.optNotDomains,
                  redirect: parsed.getRedirect(),
                  thirdParty: parsed.thirdParty(),
                };
              }
              Object.keys(testCase.compiled).forEach((key) => {
                if (parsed[key] !== testCase.compiled[key]) {
                  reject(`Expected ${key} == ${testCase.compiled[key]} (found ${parsed[key]})`);
                }
              });
              resolve();
            })
          );
        });
      });
    });
  }
);
