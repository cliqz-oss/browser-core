/* global chai */
/* global describeModule */


const fs = require('fs');


function readFile(path) {
  return fs.readFileSync(path, 'utf8');
}


function loadLinesFromFile(path) {
  return readFile(path).split(/\n/);
}


function loadCosmeticsTestCases(path) {
  return JSON.parse(readFile(path));
}


function loadTestCases(path) {
  const testCases = [];

  // Parse test cases
  loadLinesFromFile(path).forEach((line) => {
    try {
      const testCase = JSON.parse(line);
      testCases.push(testCase);
    } catch (ex) {
      /* Ignore exception */
    }
  });

  return testCases;
}


const FILTER_ENGINE_OPTIONS = {
  version: 42,
  loadNetworkFilters: true,
  loadCosmeticFilters: true,
};


export default describeModule('adblocker/filters-engine',
  () => ({
    'platform/url': {},
    'core/utils': {
      default: {
      },
    },
    'core/platform': {
      platformName: 'firefox',
    },
    'adblocker/logger': {
      default: {
        debug() {},
        log() {},
        error() {},
      },
    },
  }),
  () => {
    describe('Test cosmetic engine', () => {
      let FilterEngine;
      let engine = null;
      const cosmeticsPath = 'modules/adblocker/tests/unit/data/cosmetics.txt';
      const cosmeticMatches = 'modules/adblocker/tests/unit/data/cosmetics_matching.txt';
      const domainMatches = 'modules/adblocker/tests/unit/data/domain_matching.txt';

      beforeEach(function initializeCosmeticEngine() {
        this.timeout(30000);
        FilterEngine = this.module().default;

        if (engine === null) {
          engine = new FilterEngine(FILTER_ENGINE_OPTIONS);
          const filters = readFile(cosmeticsPath);

          // Try update mechanism of filter engine
          engine.onUpdateFilters([{ filters, asset: 'list1', checksum: 1 }], true);
          engine.onUpdateFilters([{ filters, asset: 'list2', checksum: 1 }], true);
          engine.onUpdateFilters([{ filters, asset: 'list1', checksum: 2 }], true);
          engine.onUpdateFilters([{ filters: '', asset: 'list2', checksum: 2 }], true);

          // Serialize and deserialize engine
          const serialized = engine.stringify();
          engine = new FilterEngine(FILTER_ENGINE_OPTIONS);
          engine.load(serialized);

          // Try to update after deserialization
          engine.onUpdateFilters([{ filters, asset: 'list3', checksum: 1 }], true);
          engine.onUpdateFilters([{ filters, asset: 'list1', checksum: 3 }], true);
          engine.onUpdateFilters([{ filters: '', asset: 'list3', checksum: 2 }], true);
        }
      });

      loadCosmeticsTestCases(cosmeticMatches).forEach((testCase) => {
        it(`matches nodes: ${testCase.url}`,
            () => new Promise((resolve, reject) => {
              const shouldMatch = new Set(testCase.matches);
              const shouldNotMatch = new Set(testCase.misMatches);
              const rules = engine.cosmetics.getMatchingRules(testCase.url, [testCase.node]);
              chai.expect(rules.length).to.equal(shouldMatch.size);
              rules.forEach((rule) => {
                if (!shouldMatch.has(rule.rawLine)) {
                  reject(`Expected node ${testCase.url} + ` +
                         `${JSON.stringify(testCase.node)}` +
                         ` to match ${rule.rawLine} ${JSON.stringify(rule)}`);
                }
                if (shouldNotMatch.has(rule.rawLine)) {
                  reject(`Expected node ${testCase.url} + ` +
                         `${JSON.stringify(testCase.node)}` +
                         ` not to match ${rule.rawLine} ${JSON.stringify(rule)}`);
                }
              });
              resolve();
            })
        );
      });

      loadCosmeticsTestCases(domainMatches).forEach((testCase) => {
        it(`matches url: ${testCase.url}`,
            () => new Promise((resolve, reject) => {
              const shouldMatch = new Set(testCase.matches);
              const shouldNotMatch = new Set(testCase.misMatches);
              const rules = engine.cosmetics.getDomainRules(testCase.url, engine.js);
              chai.expect(rules.length).to.equal(shouldMatch.size);
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

    describe('Test filter engine one filter at a time', () => {
      let FilterEngine;
      let engine = null;
      const matchingPath = 'modules/adblocker/tests/unit/data/filters_matching.txt';

      beforeEach(function importFilterEngine() {
        FilterEngine = this.module().default;
      });

      loadTestCases(matchingPath).forEach((testCase) => {
        it(`matches ${testCase.filter} correctly`,
           () => new Promise((resolve, reject) => {
             // Create filter engine with only one filter
             engine = new FilterEngine(FILTER_ENGINE_OPTIONS);
             engine.onUpdateFilters([{
               asset: 'tests',
               filters: testCase.filter,
             }]);

             // Serialize and deserialize engine
             const serialized = engine.stringify();
             engine = new FilterEngine(FILTER_ENGINE_OPTIONS);
             engine.load(serialized);

             // Check should match
             try {
               if (!engine.match(testCase).match) {
                 reject(`Expected ${testCase.filter} to match ${testCase.url}`);
               }
               resolve();
             } catch (ex) {
               reject(`Encountered exception ${ex} ${ex.stack} while matching ` +
                 `${testCase.filter} against ${testCase.url}`);
             }
           }),
        );
      });
    });

    describe('Test filter engine all filters', () => {
      let FilterEngine;
      let engine = null;

      // Load test cases
      const matchingPath = 'modules/adblocker/tests/unit/data/filters_matching.txt';
      const testCases = loadTestCases(matchingPath);

      // Load filters
      let filters = [];
      testCases.forEach((testCase) => {
        filters.push(testCase.filter);
      });
      filters = filters.join('\n');

      beforeEach(function initializeFilterEngine() {
        if (engine === null) {
          this.timeout(20000);
          FilterEngine = this.module().default;

          engine = new FilterEngine(FILTER_ENGINE_OPTIONS);

          // Try update mechanism of filter engine
          engine.onUpdateFilters([{ filters, asset: 'list1', checksum: 1 }], true);
          engine.onUpdateFilters([{ filters, asset: 'list2', checksum: 1 }], true);
          engine.onUpdateFilters([{ filters, asset: 'list1', checksum: 2 }], true);
          engine.onUpdateFilters([{ filters: '', asset: 'list2', checksum: 2 }], true);

          // Serialize and deserialize engine
          const serialized = engine.stringify();
          engine = new FilterEngine(FILTER_ENGINE_OPTIONS);
          engine.load(serialized);
        }
      });

      loadTestCases(matchingPath).forEach((testCase) => {
        it(`${testCase.filter} matches correctly against full engine`,
           () => new Promise((resolve, reject) => {
             // Check should match
             try {
               if (!engine.match(testCase).match) {
                 reject(`Expected ${testCase.filter} to match ${testCase.url}`);
               }
               resolve();
             } catch (ex) {
               reject(`Encountered exception ${ex} ${ex.stack} while matching ` +
                 `${testCase.filter} against ${testCase.url}`);
             }
           }),
        );
      });
    });

    describe('Test filter engine should not match', () => {
      let FilterEngine;
      let engine = null;
      const filterListPath = 'modules/adblocker/tests/unit/data/filters_list.txt';
      const notMatchingPath = 'modules/adblocker/tests/unit/data/filters_not_matching.txt';

      beforeEach(function initializeFilterEngine() {
        if (engine === null) {
          this.timeout(20000);
          FilterEngine = this.module().default;

          engine = new FilterEngine(FILTER_ENGINE_OPTIONS);
          engine.onUpdateFilters([{ filters: readFile(filterListPath) }], true);

          // Serialize and deserialize engine
          const serialized = engine.stringify();
          engine = new FilterEngine(FILTER_ENGINE_OPTIONS);
          engine.load(serialized);
        }
      });

      loadTestCases(notMatchingPath).forEach((testCase) => {
        it(`${testCase.url} does not match`,
           () => new Promise((resolve, reject) => {
             // Check should match
             try {
               if (engine.match(testCase).match) {
                 reject(`Expected to *not* match ${testCase.url}`);
               }
               resolve();
             } catch (ex) {
               reject(`Encountered exception ${ex} ${ex.stack} while matching ` +
                 `${testCase.filter} against ${testCase.url}`);
             }
           }),
         );
      });
    });

    describe('Test filter engine should redirect', () => {
      let FilterEngine;
      let engine = null;
      const filterListPath = 'modules/adblocker/tests/unit/data/filters_list.txt';
      const notMatchingPath = 'modules/adblocker/tests/unit/data/filters_redirect.txt';
      const resourcesPath = 'modules/adblocker/tests/unit/data/resources.txt';

      beforeEach(function initializeFilterEngine() {
        if (engine === null) {
          this.timeout(20000);

          FilterEngine = this.module().default;

          engine = new FilterEngine(FILTER_ENGINE_OPTIONS);
          engine.onUpdateFilters([{ filters: readFile(filterListPath) }], true);
          engine.onUpdateResource([{ filters: readFile(resourcesPath) }]);

          // Serialize and deserialize engine
          const serialized = engine.stringify();
          engine = new FilterEngine(FILTER_ENGINE_OPTIONS);
          engine.load(serialized);
          engine.onUpdateResource([{ filters: readFile(resourcesPath) }]);
        }
      });

      loadTestCases(notMatchingPath).forEach((testCase) => {
        it(`${testCase.url} redirected`,
           () => new Promise((resolve, reject) => {
             // Check should match
             try {
               const result = engine.match(testCase);
               if (result.redirect !== testCase.redirect) {
                 reject(`Expected to redirect to ${testCase.redirect} instead` +
                        ` of ${result.redirect} for ${testCase.url}`);
               }
               resolve();
             } catch (ex) {
               reject(`Encountered exception ${ex} ${ex.stack} while checking redirect ` +
                 `${testCase.redirect} against ${testCase.url}`);
             }
           }),
         );
      });
    });
  },
);
