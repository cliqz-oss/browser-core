/* global chai */
/* global describeModule */


const fs = System._nodeRequire('fs');


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


export default describeModule('adblocker/filters-parsing',
  () => ({
    'adblocker/utils': {
      default: () => {
        // const message = `[adblock] ${msg}`;
        // console.log(message);
      },
    },
    'platform/url': {},
    'core/platform': {
      platformName: 'firefox',
    },
    'core/cliqz': {
      utils: {},
    },
  }),
  () => {
    describe('#CosmeticFilter', () => {
      let parseFilter;

      // Generate test cases
      context('Cosmetic filter parsing', () => {
        beforeEach(function importFilterParser() {
          parseFilter = this.module().parseFilter;
        });

        const dataPath = 'modules/adblocker/tests/unit/data/cosmetics_parsing.txt';
        loadTestCases(dataPath).forEach((testCase) => {
          it(`parses ${testCase.filter} correctly`,
             () => new Promise((resolve, reject) => {
               const parsed = parseFilter(testCase.filter);
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

      // Generate test cases
      context('Filters parsing', () => {
        beforeEach(function importFilterParser() {
          parseFilter = this.module().parseFilter;
        });

        const dataPath = 'modules/adblocker/tests/unit/data/filters_parsing.txt';
        loadTestCases(dataPath).forEach((testCase) => {
          it(`parses ${testCase.filter} correctly`,
             () => new Promise((resolve, reject) => {
               const parsed = parseFilter(testCase.filter);
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
