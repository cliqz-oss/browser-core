/* global chai */
/* global describeModule */
/* global require */


const fs = require('fs');


function loadLinesFromFile(path) {
  const data = fs.readFileSync(path, 'utf8');
  return data.split(/\n/);
}


function loadTestCases(path) {
  const testCases = [];

  // Parse test cases
  loadLinesFromFile(path).forEach(line => {
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

      loadTestCases(matchingPath).forEach(testCase => {
        it(`matches ${testCase.filter} correctly`,
           () => new Promise((resolve, reject) => {
             // Create filter engine with only one filter
             engine = new FilterEngine();
             engine.onUpdateFilters([{
               filters: [testCase.filter],
             }]);

             // Serialize and deserialize engine
             const serialized = serializeEngine(engine);
             engine = new FilterEngine();
             deserializeEngine(engine, serialized);

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
           })
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
      testCases.forEach(testCase => {
        filters.push(testCase.filter);
      });

      beforeEach(function initializeFilterEngine() {
        if (engine === null) {
          FilterEngine = this.module().default;
          serializeEngine = this.module().serializeFiltersEngine;
          deserializeEngine = this.module().deserializeFiltersEngine;
          engine = new FilterEngine();
          engine.onUpdateFilters([{ filters }]);

          // Serialize and deserialize engine
          const serialized = serializeEngine(engine);
          engine = new FilterEngine();
          deserializeEngine(engine, serialized);
        }
      });

      loadTestCases(matchingPath).forEach(testCase => {
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
           })
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
          this.timeout(10000);
          FilterEngine = this.module().default;
          serializeEngine = this.module().serializeFiltersEngine;
          deserializeEngine = this.module().deserializeFiltersEngine;

          engine = new FilterEngine();
          engine.onUpdateFilters([{ filters: loadLinesFromFile(filterListPath) }]);

          // Serialize and deserialize engine
          const serialized = serializeEngine(engine);
          engine = new FilterEngine();
          deserializeEngine(engine, serialized);
        }
      });

      loadTestCases(notMatchingPath).forEach(testCase => {
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
           })
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
          this.timeout(10000);
          FilterEngine = this.module().default;
          serializeEngine = this.module().serializeFiltersEngine;
          deserializeEngine = this.module().deserializeFiltersEngine;

          engine = new FilterEngine();
          engine.onUpdateFilters([{ filters: loadLinesFromFile(filterListPath) }]);

          // Serialize and deserialize engine
          const serialized = serializeEngine(engine);
          engine = new FilterEngine();
          deserializeEngine(engine, serialized);
          engine.onUpdateResource([{ filters: loadLinesFromFile(resourcesPath) }]);
        }
      });

      loadTestCases(notMatchingPath).forEach(testCase => {
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
           })
         );
      });
    });
  }
);
