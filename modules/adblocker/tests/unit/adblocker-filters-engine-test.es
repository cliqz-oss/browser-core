/* global chai */
/* global describeModule */


const fs = System._nodeRequire('fs');


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


export default describeModule('adblocker/filters-engine',
  () => ({
    'adblocker/utils': {
      default: () => {
        // const message = `[adblock] ${msg}`;
        // console.log(message);
      },
    },
    'platform/url': {},
    'core/utils': {
      default: {
      },
    },
    'core/platform': {
      platformName: 'firefox',
    },
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
        this.timeout(30000);
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

      loadCosmeticsTestCases(cosmeticMatches).forEach((testCase) => {
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

      loadCosmeticsTestCases(domainMatches).forEach((testCase) => {
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

    describe('Test filter engine one filter at a time', () => {
      let FilterEngine;
      let serializeEngine;
      let deserializeEngine;
      let engine = null;
      const matchingPath = 'modules/adblocker/tests/unit/data/filters_matching.txt';

      beforeEach(function importFilterEngine() {
        FilterEngine = this.module().default;
        serializeEngine = this.module().serializeFiltersEngine;
        deserializeEngine = this.module().deserializeFiltersEngine;
      });

      loadTestCases(matchingPath).forEach((testCase) => {
        it(`matches ${testCase.filter} correctly`,
           () => new Promise((resolve, reject) => {
             // Create filter engine with only one filter
             engine = new FilterEngine();
             engine.onUpdateFilters([{
               filters: [testCase.filter],
             }]);

             // Serialize and deserialize engine
             const serialized = JSON.stringify(serializeEngine(engine, undefined, true));
             engine = new FilterEngine();
             deserializeEngine(engine, JSON.parse(serialized), undefined, true);

             // Check should match
             try {
               if (!engine.match(testCase).match) {
                 reject(`Expected ${testCase.filter} to match ${testCase.url}`);
               }
               resolve();
             } catch (ex) {
               console.log(`STACK TRACE ${ex.stack}`);
               reject(`Encountered exception ${ex} while matching ` +
                 `${testCase.filter} against ${testCase.url}`);
             }
           }),
        );
      });
    });

    describe('Test filter engine all filters', () => {
      let FilterEngine;
      let serializeEngine;
      let deserializeEngine;
      let engine = null;

      // Load test cases
      const matchingPath = 'modules/adblocker/tests/unit/data/filters_matching.txt';
      const testCases = loadTestCases(matchingPath);

      // Load filters
      const filters = [];
      testCases.forEach((testCase) => {
        filters.push(testCase.filter);
      });

      beforeEach(function initializeFilterEngine() {
        if (engine === null) {
          this.timeout(20000);
          FilterEngine = this.module().default;
          serializeEngine = this.module().serializeFiltersEngine;
          deserializeEngine = this.module().deserializeFiltersEngine;
          engine = new FilterEngine();

          // Try update mechanism of filter engine
          engine.onUpdateFilters([{ filters, asset: 'list1', checksum: 1 }]);
          engine.onUpdateFilters([{ filters, asset: 'list2', checksum: 1 }]);
          engine.onUpdateFilters([{ filters, asset: 'list1', checksum: 2 }]);
          engine.onUpdateFilters([{ filters: [], asset: 'list2', checksum: 2 }]);

          // Serialize and deserialize engine
          const serialized = JSON.stringify(serializeEngine(engine, undefined, true));
          engine = new FilterEngine();
          deserializeEngine(engine, JSON.parse(serialized, undefined, true));

          // Try to update after deserialization
          engine.onUpdateFilters([{ filters, asset: 'list3', checksum: 1 }]);
          engine.onUpdateFilters([{ filters, asset: 'list1', checksum: 3 }]);
          engine.onUpdateFilters([{ filters: [], asset: 'list3', checksum: 2 }]);
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
               reject(`Encountered exception ${ex} while matching ` +
                 `${testCase.filter} against ${testCase.url}`);
             }
           }),
        );
      });
    });

    describe('Test filter engine should not match', () => {
      let FilterEngine;
      let serializeEngine;
      let deserializeEngine;
      let engine = null;
      const filterListPath = 'modules/adblocker/tests/unit/data/filters_list.txt';
      const notMatchingPath = 'modules/adblocker/tests/unit/data/filters_not_matching.txt';

      beforeEach(function initializeFilterEngine() {
        if (engine === null) {
          this.timeout(20000);
          FilterEngine = this.module().default;
          serializeEngine = this.module().serializeFiltersEngine;
          deserializeEngine = this.module().deserializeFiltersEngine;

          engine = new FilterEngine();
          engine.onUpdateFilters([{ filters: loadLinesFromFile(filterListPath) }]);

          // Serialize and deserialize engine
          const serialized = JSON.stringify(serializeEngine(engine, undefined, true));
          engine = new FilterEngine();
          deserializeEngine(engine, JSON.parse(serialized), undefined, true);
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
               reject(`Encountered exception ${ex} while matching ` +
                 `${testCase.filter} against ${testCase.url}`);
             }
           }),
         );
      });
    });

    describe('Test filter engine should redirect', () => {
      let FilterEngine;
      let serializeEngine;
      let deserializeEngine;
      let engine = null;
      const filterListPath = 'modules/adblocker/tests/unit/data/filters_list.txt';
      const notMatchingPath = 'modules/adblocker/tests/unit/data/filters_redirect.txt';
      const resourcesPath = 'modules/adblocker/tests/unit/data/resources.txt';

      beforeEach(function initializeFilterEngine() {
        if (engine === null) {
          this.timeout(20000);
          FilterEngine = this.module().default;
          serializeEngine = this.module().serializeFiltersEngine;
          deserializeEngine = this.module().deserializeFiltersEngine;

          engine = new FilterEngine();
          engine.onUpdateFilters([{ filters: loadLinesFromFile(filterListPath) }]);

          // Serialize and deserialize engine
          const serialized = JSON.stringify(serializeEngine(engine, undefined, true));
          engine = new FilterEngine();
          deserializeEngine(engine, JSON.parse(serialized), undefined, true);
          engine.onUpdateResource([{ filters: loadLinesFromFile(resourcesPath) }]);
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
               console.log(ex.stack);
               reject(`Encountered exception ${ex} while checking redirect ` +
                 `${testCase.redirect} against ${testCase.url}`);
             }
           }),
         );
      });
    });
  },
);
