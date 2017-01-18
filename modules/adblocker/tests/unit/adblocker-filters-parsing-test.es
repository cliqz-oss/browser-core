/* global chai */
/* global describeModule */
/* global require */


const fs = require('fs');


function loadTestCases(path) {
  const data = fs.readFileSync(path, 'utf8');
  const testCases = [];

  // Parse test cases
  data.split(/\n/).forEach(line => {
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
      log: () => {
        // const message = `[adblock] ${msg}`;
        // console.log(message);
      },
    },
    'core/cliqz': {
      utils: {},
    },
  }),
  () => {
    describe('#NetworkFilter', () => {
      let parseFilter;

      // Generate test cases
      context('Filters parsing', () => {
        beforeEach(function importFilterParser() {
          parseFilter = this.module().parseFilter;
        });

        const dataPath = 'modules/adblocker/tests/unit/data/filters_parsing.txt';
        loadTestCases(dataPath).forEach(testCase => {
          it(`parses ${testCase.filter} correctly`,
             () => new Promise((resolve, reject) => {
               const parsed = parseFilter(testCase.filter);
               Object.keys(testCase.compiled).forEach(key => {
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
