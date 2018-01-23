/* global chai */
/* global describeModule */


const fs = require('fs');
const encoding = require('text-encoding');

const TextDecoder = encoding.TextDecoder;
const TextEncoder = encoding.TextEncoder;


// Override deep.equal behavior to properly handle functions
const deepEqual = require('deep-eql');
const type = require('type-detect');
const functionEqual = require('function-equal');


function comparator(left, right) {
  if (type(left) === 'function' && type(right) === 'function') {
    return functionEqual(left, right);
  }
  return null;
}


function customDeepEqual(left, right) {
  return deepEqual(left, right, {
    comparator,
  });
}


function readFile(path) {
  return fs.readFileSync(path, 'utf8');
}


export default describeModule('core/adblocker-base/serialization',
  () => ({
    'platform/text-decoder': {
      default: TextDecoder,
    },
    'platform/text-encoder': {
      default: TextEncoder,
    },
    'platform/url': {},
    'core/tlds': {
      default: {},
    },
    'core/utils': {
      default: {
      },
    },
    'core/platform': {
      platformName: 'firefox',
    },
    'core/console': {
      default: console,
    },
  }),
  () => {
    describe('Adblocker serialization', () => {
      context('filters', () => {
        let parseFilter = null;
        let DynamicDataView = null;

        let serializeNetworkFilter = null;
        let serializeCosmeticFilter = null;

        let deserializeNetworkFilter = null;
        let deserializeCosmeticFilter = null;

        beforeEach(function () {
          if (parseFilter === null) {
            serializeNetworkFilter = this.module().serializeNetworkFilter;
            serializeCosmeticFilter = this.module().serializeCosmeticFilter;
            deserializeNetworkFilter = this.module().deserializeNetworkFilter;
            deserializeCosmeticFilter = this.module().deserializeCosmeticFilter;

            return this.system.import('core/adblocker-base/filters-parsing')
              .then((module) => {
                parseFilter = module.parseFilter;
              }).then(() => this.system.import('core/adblocker-base/dynamic-data-view'))
              .then((module) => {
                DynamicDataView = module.default;
              });
          }
        });

        // Serialize/Deserialize all filters
        const filtersPath = 'modules/core/tests/unit/adblocker-base/data/filters_list.txt';

        it('serialize/deserialize filters', function () {
          this.timeout(20000);
          const lines = readFile(filtersPath).split('\t');
          for (let i = 0; i < lines.length; i += 1) {
            const line = lines[i];
            const filter = parseFilter(line, true, true);
            if (filter !== null) {
              const buffer = new DynamicDataView(100);
              if (filter.isCosmeticFilter()) {
                serializeCosmeticFilter(filter, buffer);
                buffer.seek(0);
                chai.expect(deserializeCosmeticFilter(buffer)).to.eql(filter);
              } else if (filter.isNetworkFilter) {
                serializeNetworkFilter(filter, buffer);
                buffer.seek(0);
                chai.expect(deserializeNetworkFilter(buffer)).to.eql(filter);
              }
            }
          }
        });
      });

      context('ReverseIndex', () => {
        let ReverseIndex = null;
        let parseFilter = null;

        let DynamicDataView = null;
        let serializeReverseIndex = null;
        let deserializeReverseIndex = null;


        beforeEach(function () {
          if (ReverseIndex === null && parseFilter === null) {
            serializeReverseIndex = this.module().serializeReverseIndex;
            deserializeReverseIndex = this.module().deserializeReverseIndex;

            return Promise.all([
              this.system.import('core/adblocker-base/filters-parsing'),
              this.system.import('core/adblocker-base/reverse-index'),
              this.system.import('core/adblocker-base/dynamic-data-view'),
            ]).then(([filtersParsing, reverseIndex, dynamicDataView]) => {
              ReverseIndex = reverseIndex.default;
              parseFilter = filtersParsing.parseFilter;
              DynamicDataView = dynamicDataView.default;
            });
          }
        });

        it('serialize/deserialize a big reverse index', function () {
          this.timeout(20000);
          // Serialize/Deserialize all filters
          const filtersPath = 'modules/core/tests/unit/adblocker-base/data/filters_list.txt';
          const lines = readFile(filtersPath).split('\t');
          const filters = new Map();
          for (let i = 0; i < lines.length; i += 1) {
            const filter = parseFilter(lines[i], true, false);
            if (filter !== null) {
              filters.set(filter.id, filter);
            }
          }

          const reverseIndex = new ReverseIndex([...filters.values()], f => f.getTokens());
          const buffer = new DynamicDataView(4000000);
          serializeReverseIndex(reverseIndex, buffer);
          buffer.seek(0);

          const deserialized = {};
          deserializeReverseIndex(buffer, deserialized, filters);

          chai.expect(deserialized).to.deep.equal({
            index: reverseIndex.index,
            size: reverseIndex.size,
          });
        });
      });

      context('Engine', () => {
        let Engine = null;
        let serializeEngine = null;
        let deserializeEngine = null;

        beforeEach(function () {
          if (Engine === null) {
            serializeEngine = this.module().serializeEngine;
            deserializeEngine = this.module().deserializeEngine;

            return this.system.import('core/adblocker-base/filters-engine')
              .then((filtersEngine) => {
                Engine = filtersEngine.default;
              });
          }
        });

        it('serialize/deserialize the full engine', function () {
          this.timeout(20000);
          const filtersPath = 'modules/core/tests/unit/adblocker-base/data/filters_list.txt';
          const resourcesPath = 'modules/core/tests/unit/adblocker-base/data/resources.txt';

          const resources = readFile(resourcesPath);
          const filters = readFile(filtersPath).split('\t').join('\n');

          const engine = new Engine({
            version: 42,
            loadNetworkFilters: true,
            loadCosmeticFilters: true,
            optimizeAOT: false,
          });

          engine.onUpdateFilters(
            [{ filters, asset: 'list1', checksum: 'checksum' }],
            new Set(),
            false, // onDiskCache
            false // debug
          );

          engine.onUpdateResource([
            { checksum: 'resources1', filters: resources },
          ]);

          chai.expect(customDeepEqual(deserializeEngine(serializeEngine(engine), 42), engine)).to.be.true;
        });
      });
    });
  }
);
