/* global chai */
/* global describeModule */


const fs = require('fs');


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
    'core/platform': {
      platformName: 'firefox',
    },
    'core/cliqz': {
      utils: {},
    },
    'core/console': {
      default: {
        debug() {},
        log() {},
        error() {},
      }
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
                 // Test serialization
                 chai.expect(CosmeticFilter.deserialize(parsed.serialize())).to.eql(parsed);
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
                 // Test serialization
                 chai.expect(NetworkFilter.deserialize(parsed.serialize())).to.eql(parsed);
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
                   optDomains: parsed._optDomains,
                   optNotDomains: parsed._optNotDomains,
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
