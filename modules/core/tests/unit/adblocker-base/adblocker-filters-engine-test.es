/* global chai */
/* global describeModule */


const fs = require('fs');
const tldjs = require('tldjs');


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


function testFiltersEngine(optimizeAOT) {
  const FILTER_ENGINE_OPTIONS = {
    version: 42,
    loadNetworkFilters: true,
    loadCosmeticFilters: true,
    optimizeAOT,
  };

  describe('Test cosmetic engine', () => {
    let FilterEngine;
    let engine = null;
    const cosmeticsPath = 'modules/core/tests/unit/adblocker-base/data/cosmetics.txt';
    const cosmeticMatches = 'modules/core/tests/unit/adblocker-base/data/cosmetics_matching.txt';
    const domainMatches = 'modules/core/tests/unit/adblocker-base/data/domain_matching.txt';

    beforeEach(function initializeCosmeticEngine() {
      this.timeout(30000);
      FilterEngine = this.module().default;

      if (engine === null) {
        engine = new FilterEngine(FILTER_ENGINE_OPTIONS);
        const filters = readFile(cosmeticsPath);
        const loadedAssets = new Set(['list1', 'list2', 'list3']);

        // Try update mechanism of filter engine
        engine.onUpdateFilters([{ filters, asset: 'list1', checksum: 1 }], loadedAssets, false, true);
        engine.onUpdateFilters([{ filters, asset: 'list2', checksum: 1 }], loadedAssets, false, true);
        engine.onUpdateFilters([{ filters, asset: 'list1', checksum: 2 }], loadedAssets, false, true);
        const serialized = engine.onUpdateFilters(
          [{ filters: '', asset: 'list2', checksum: 2 }],
          loadedAssets,
          true,
          true
        );

        // Serialize and deserialize engine
        engine = new FilterEngine(FILTER_ENGINE_OPTIONS);
        engine.load(serialized);

        // Try to update after deserialization
        engine.onUpdateFilters([{ filters, asset: 'list3', checksum: 1 }], loadedAssets, false, true);
        engine.onUpdateFilters([{ filters, asset: 'list1', checksum: 3 }], loadedAssets, false, true);
        engine.onUpdateFilters([{ filters: '', asset: 'list3', checksum: 2 }], loadedAssets, false, true);
      }
    });

    loadCosmeticsTestCases(cosmeticMatches).forEach((testCase) => {
      it(`matches nodes: ${testCase.hostname}`,
          () => new Promise((resolve, reject) => {
            const shouldMatch = new Set(testCase.matches);
            const shouldNotMatch = new Set(testCase.misMatches);
            const rules = engine.cosmetics.getMatchingRules(testCase.hostname, [testCase.node]);
            chai.expect(rules.length).to.equal(shouldMatch.size);
            rules.forEach((rule) => {
              if (!shouldMatch.has(rule.rawLine)) {
                reject(`Expected node ${testCase.hostname} + ` +
                       `${JSON.stringify(testCase.node)}` +
                       ` to match ${rule.rawLine} ${JSON.stringify(rule)}`);
              }
              if (shouldNotMatch.has(rule.rawLine)) {
                reject(`Expected node ${testCase.hostname} + ` +
                       `${JSON.stringify(testCase.node)}` +
                       ` not to match ${rule.rawLine} ${JSON.stringify(rule)}`);
              }
            });
            resolve();
          })
      );
    });

    loadCosmeticsTestCases(domainMatches).forEach((testCase) => {
      it(`matches url: ${testCase.hostname}`,
          () => new Promise((resolve, reject) => {
            const shouldMatch = new Set(testCase.matches);
            const shouldNotMatch = new Set(testCase.misMatches);
            const rules = engine.cosmetics.getDomainRules(testCase.hostname, engine.js);
            chai.expect(rules.length).to.equal(shouldMatch.size);
            rules.forEach((rule) => {
              if (!shouldMatch.has(rule.rawLine)) {
                reject(`Expected node ${testCase.hostname} ` +
                       ` to match ${rule.rawLine}`);
              }
              if (shouldNotMatch.has(rule.rawLine)) {
                reject(`Expected node ${testCase.hostname} ` +
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
    const matchingPath = 'modules/core/tests/unit/adblocker-base/data/filters_matching.txt';

    beforeEach(function importFilterEngine() {
      FilterEngine = this.module().default;
    });

    loadTestCases(matchingPath).forEach((testCase) => {
      it(`matches ${testCase.filter} correctly`,
         () => new Promise((resolve, reject) => {
           // Create filter engine with only one filter
           engine = new FilterEngine(FILTER_ENGINE_OPTIONS);
           const serialized = engine.onUpdateFilters([{
             asset: 'tests',
             filters: testCase.filter,
           }], new Set(['tests']), true, true);

           // Serialize and deserialize engine
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
    const matchingPath = 'modules/core/tests/unit/adblocker-base/data/filters_matching.txt';
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

        const loadedAssets = new Set(['list1', 'list2']);

        engine = new FilterEngine(FILTER_ENGINE_OPTIONS);

        // Try update mechanism of filter engine
        engine.onUpdateFilters([{ filters, asset: 'list1', checksum: 1 }], loadedAssets, false, true);
        engine.onUpdateFilters([{ filters, asset: 'list2', checksum: 1 }], loadedAssets, false, true);
        engine.onUpdateFilters([{ filters, asset: 'list1', checksum: 2 }], loadedAssets, false, true);
        const serialized = engine.onUpdateFilters(
          [{ filters: '', asset: 'list2', checksum: 2 }],
          loadedAssets,
          true,
          true
        );

        // Serialize and deserialize engine
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
    const filterListPath = 'modules/core/tests/unit/adblocker-base/data/filters_list.txt';
    const notMatchingPath = 'modules/core/tests/unit/adblocker-base/data/filters_not_matching.txt';

    beforeEach(function initializeFilterEngine() {
      if (engine === null) {
        this.timeout(20000);
        FilterEngine = this.module().default;

        engine = new FilterEngine(FILTER_ENGINE_OPTIONS);
        const serialized = engine.onUpdateFilters(
          [{ asset: 'asset', filters: readFile(filterListPath).split('\t').join('\n') }],
          new Set(['asset']),
          true,
          true,
        );

        // Serialize and deserialize engine
        engine = new FilterEngine(FILTER_ENGINE_OPTIONS);
        engine.load(serialized);
      }
    });

    loadTestCases(notMatchingPath).forEach((testCase) => {
      it(`${testCase.url} does not match`,
         () => new Promise((resolve, reject) => {
           // Check should match
           try {
             const result = engine.match(testCase);
             if (result !== null && result.match) {
               reject(`Expected to *not* match ${JSON.stringify(result)} ${testCase.url}`);
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
    const filterListPath = 'modules/core/tests/unit/adblocker-base/data/filters_list.txt';
    const notMatchingPath = 'modules/core/tests/unit/adblocker-base/data/filters_redirect.txt';
    const resourcesPath = 'modules/core/tests/unit/adblocker-base/data/resources.txt';

    beforeEach(function initializeFilterEngine() {
      if (engine === null) {
        this.timeout(20000);

        FilterEngine = this.module().default;

        engine = new FilterEngine(FILTER_ENGINE_OPTIONS);
        const serialized = engine.onUpdateFilters(
          [{ asset: 'asset', filters: readFile(filterListPath).split('\t').join('\n') }],
          new Set(['asset']),
          true,
          true,
        );
        engine.onUpdateResource([{ filters: readFile(resourcesPath) }]);

        // Serialize and deserialize engine
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
}


export default describeModule('core/adblocker-base/filters-engine',
  () => ({
    'platform/url': {},
    'platform/tldjs': {
      default: tldjs,
    },
    'core/utils': {
      default: {
      },
    },
    'core/platform': {
      platformName: 'firefox',
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
    testFiltersEngine(false /* _Do not_, optimize index ahead of time */);
    testFiltersEngine(true  /* _Optimize_ index ahead of time */);
  },
);
