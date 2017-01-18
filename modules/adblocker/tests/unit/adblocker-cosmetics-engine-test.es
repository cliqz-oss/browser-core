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
    'platform/public-suffix-list': {},
  }),
  () => {
    describe('Test cosmetic engine', () => {
      let FilterEngine;
      let serializeEngine;
      let deserializeEngine;
      let engine = null;
      const cosmeticsPath = 'modules/adblocker/tests/unit/data/cosmetics.txt';
      const cosmeticMatches = 'modules/adblocker/tests/unit/data/cosmetics_matching.txt';
      const domainMatches = 'modules/adblocker/tests/unit/data/domain_matching.txt';

      beforeEach(function initializeCosmeticEngine() {
        this.timeout(10000);
        FilterEngine = this.module().default;
        serializeEngine = this.module().serializeFiltersEngine;
        deserializeEngine = this.module().deserializeFiltersEngine;

        if (engine === null) {
          engine = new FilterEngine();
          const filters = loadLinesFromFile(cosmeticsPath);

          // Try update mechanism of filter engine
          engine.onUpdateFilters([{ filters, asset: 'list1', checksum: 1 }], true);
          engine.onUpdateFilters([{ filters, asset: 'list2', checksum: 1 }], true);
          engine.onUpdateFilters([{ filters, asset: 'list1', checksum: 2 }], true);
          engine.onUpdateFilters([{ filters: [], asset: 'list2', checksum: 2 }], true);

          // Serialize and deserialize engine
          const serialized = JSON.stringify(serializeEngine(engine, undefined, true));
          engine = new FilterEngine();
          deserializeEngine(engine, JSON.parse(serialized), undefined, true);

          // Try to update after deserialization
          engine.onUpdateFilters([{ filters, asset: 'list3', checksum: 1 }], true);
          engine.onUpdateFilters([{ filters, asset: 'list1', checksum: 3 }], true);
          engine.onUpdateFilters([{ filters: [], asset: 'list3', checksum: 2 }], true);
        }
      });

      loadTestCases(cosmeticMatches).forEach((testCase) => {
        it(`matches url: ${testCase.url}`,
            () => new Promise((resolve, reject) => {
              const shouldMatch = new Set(testCase.matches);
              const shouldNotMatch = new Set(testCase.misMatches);
              const rules = engine.getCosmeticsFilters(testCase.url, [testCase.node]);
              chai.expect(shouldMatch.size).to.equal(rules.length);
              rules.forEach((rule) => {
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

      loadTestCases(domainMatches).forEach((testCase) => {
        it(`matches url: ${testCase.url}`,
            () => new Promise((resolve, reject) => {
              const shouldMatch = new Set(testCase.matches);
              const shouldNotMatch = new Set(testCase.misMatches);
              const rules = engine.getDomainFilters(testCase.url);
              chai.expect(shouldMatch.size).to.equal(rules.length);
              rules.forEach((rule) => {
                if (!shouldMatch.has(rule.rawLine)) {
                  reject(`Expected node ${testCase.url} ` +
                         ` to match ${rule.rawLine}`);
                }
                if (shouldNotMatch.has(rule.rawLine)) {
                  reject(`Expected node ${testCase.url} ` +
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
