/* global chai */
/* global describeModule */


const fs = require('fs');


function readFile(path) {
  return fs.readFileSync(path, 'utf8');
}


let isMobile;
let platformName;

function platformSpecificLoadingTest(listsToLoad, FilterLoader) {
  const filtersLoader = new FilterLoader();
  const loadedLists = new Set();

  return new Promise((resolve, reject) => {
    filtersLoader.onUpdate((updates) => {
      updates.forEach((update) => {
        const { asset } = update;
        loadedLists.add(asset);
      });
    });

    // Load filters, then check that loaded filter are
    // the same as what we would expect.
    filtersLoader.load().then(() => {
      chai.expect(listsToLoad).to.be.deep.equal(loadedLists);
    }).then(resolve, reject);
  });
}


export default describeModule('adblocker/filters-loader',
  () => ({
    'core/logger': {
      default: { get() {
        return {
          debug() {},
          log() {},
          error() {},
        };
      } },
    },
    'core/language': {
      default: {
        state() { return []; },
      },
    },
    'platform/url': {},
    'platform/resource-loader-storage': {
      default: class {
        load() { return Promise.reject('load should not be called'); }
        save() { return Promise.resolve(); }
      }
    },
    'core/zlib': {
      inflate: x => x,
      deflate: x => x,
    },
    'core/platform': {
      isWebExtension: false,
      default: {
        platformName,
      },
    },
    'adblocker/adblocker': {
      ADB_USER_LANG: 'cliqz-adb-lang',
    },
    'adblocker/logger': {
      default: {
        debug() {},
        log() {},
        error() {},
      },
    },
    'core/config': {
      default: {
        settings: {
          CDN_BASEURL: 'https://cdn.cliqz.com'
        }
      }
    },
    'core/utils': {
      default: {
        setInterval() {},
      },
    },
    'core/prefs': {
      default: {
        get(pref, defaultValue) {
          return defaultValue;
        },
        set() {},
      }
    },
    'core/http': {
      fetch(url) {
        return new Promise((resolve) => {
          let content = 'filter';
          if (url.startsWith('https://cdn.cliqz.com/adblocking/') && url.indexOf('/allowed-lists.json') !== -1) {
            if (isMobile) {
              content = readFile('modules/adblocker/tests/unit/data/allowed-lists-mobile.json');
            } else {
              content = readFile('modules/adblocker/tests/unit/data/allowed-lists.json');
            }
          }
          resolve({
            text() {
              return Promise.resolve(content);
            }
          });
        });
      },
    },
    'core/encoding': {
      fromUTF8: function (d) {
        return d;
      },
    },
  }),
  () => {
    describe('Test loading filters', () => {
      let FilterLoader;
      let oldTimeout;
      let oldInterval;

      beforeEach(function () {
        oldTimeout = global.setTimeout;
        oldInterval = global.setInterval;
        global.setTimeout = function (cb) { cb(); };
        global.setInterval = function () {};
        this.timeout(10000);
        FilterLoader = this.module().default;
      });

      afterEach(function () {
        global.setTimeout = oldTimeout;
        global.setInterval = oldInterval;
      });

      it('loads mobile customized filters', () => {
        isMobile = true;
        platformName = 'mobile';

        return platformSpecificLoadingTest(new Set([
          'https://easylist-downloads.adblockplus.org/antiadblockfilters.txt',
          'https://raw.githubusercontent.com/reek/anti-adblock-killer/master/anti-adblock-killer-filters.txt',
          'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/resources.txt',
          'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/unbreak.txt',
          'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt',
          'https://s3.amazonaws.com/cdn.cliqz.com/adblocking/customized_filters_mobile_specific.txt',
          'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/thirdparties/easylist-downloads.adblockplus.org/easylist.txt',
        ]), FilterLoader);
      });

      it('does not load mobile filters', () => {
        isMobile = false;
        platformName = 'firefox';

        return platformSpecificLoadingTest(new Set([
          'https://easylist-downloads.adblockplus.org/antiadblockfilters.txt',
          'https://raw.githubusercontent.com/reek/anti-adblock-killer/master/anti-adblock-killer-filters.txt',
          'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/resources.txt',
          'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/unbreak.txt',
          'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt',
          'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/thirdparties/easylist-downloads.adblockplus.org/easylist.txt',
        ]), FilterLoader);
      });
    });
  }
);
