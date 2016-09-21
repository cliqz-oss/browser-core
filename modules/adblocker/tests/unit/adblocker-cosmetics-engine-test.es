/* global chai */
/* global describeModule */
/* global require */


const fs = require('fs');


function readFile(path) {
  return fs.readFileSync(path, 'utf8');
}


function loadLinesFromFile(path) {
  return readFile(path).split(/\n/);
}


function loadTestCases(path) {
  return JSON.parse(readFile(path));
}


export default describeModule('adblocker/filters-engine',
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
    describe('Test cosmetic engine', () => {
      let FilterEngine;
      let engine = null;
      const cosmeticsPath = 'modules/adblocker/tests/unit/data/cosmetics.txt';
      const cosmeticMatches = 'modules/adblocker/tests/unit/data/cosmetics_matching.txt';

      beforeEach(function initializeCosmeticEngine() {
        this.timeout(10000);
        FilterEngine = this.module().default;
        if (engine === null) {
          engine = new FilterEngine();
          engine.onUpdateFilters(undefined, loadLinesFromFile(cosmeticsPath));
        }
      });

      loadTestCases(cosmeticMatches).forEach(testCase => {
        it(`matches url: ${testCase.url}`,
            () => new Promise((resolve, reject) => {
              const shouldMatch = new Set(testCase.matches);
              const shouldNotMatch = new Set(testCase.misMatches);
              const rules = engine.getCosmeticsFilters(testCase.url, [testCase.node]);
              chai.expect(shouldMatch.size).to.equal(rules.length);
              rules.forEach(rule => {
                if (!shouldMatch.has(rule.rawLine)) {
                  reject(`Expected node ${testCase.url} + ` +
                         `${JSON.stringify(testCase.node)}` +
                         ` to match ${rule.rawLine}`);
                }
                if (shouldNotMatch.has(rule.rawLine)) {
                  reject(`Expected node ${testCase.url} + ` +
                         `${JSON.stringify(testCase.node)}` +
                         ` not to match ${rule.rawLine}`);
                }
              });
              resolve();
            })
        );
      });
    });
  }
);
