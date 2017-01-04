/* global chai */
/* global describeModule */
/* global require */


const fs = require('fs');


function readFile(path) {
  return fs.readFileSync(path, 'utf8');
}


let isMobile;
let platformName;


/* Checks that the two sets are equal. This is used to make sure
 * the filter loader loads exactly the right lists, not more, no
 * less.
 */
function allListsLoaded(listsToLoad, loadedLists) {
  if (listsToLoad.length !== loadedLists.length) {
    return false;
  }

  for (const elt of listsToLoad) {
    if (!loadedLists.has(elt)) {
      return false;
    }
  }
  return true;
}


function platformSpecificLoadingTest(listsToLoad, FilterLoader) {
  const filtersLoader = new FilterLoader();
  const loadedLists = new Set();

  return new Promise((resolve, reject) => {
    filtersLoader.onUpdate(updates => {
      updates.forEach(update => {
        const { asset } = update;
        loadedLists.add(asset);
      });
    });

    // Load filters, then check that loaded filter are
    // the same as what we would expect.
    filtersLoader.load().then(() => {
      if (allListsLoaded(listsToLoad, loadedLists)) {
        resolve();
      } else {
        reject();
      }
    });
  });
}


export default describeModule('adblocker/filters-loader',
  () => ({
    'platform/language': {
      default: {
        state() { return []; },
      },
    },
    'core/fs': {
      readFile() { return Promise.reject(); },
      writeFile() { return Promise.resolve(); },
      mkdir() { return Promise.resolve(); },
    },
    'adblocker/utils': {
      log() {
        // console.log( `[adblocker] ${msg}`);
      },
    },
    'core/cliqz': {
      utils: {
        setInterval() {},
        getPref(pref, defaultValue) {
          return defaultValue;
        },
        setPref() {},
        httpGet(url, callback) {
          let content = '';
          if (url.startsWith('https://cdn.cliqz.com/adblocking/undefined/allowed-lists.json')) {
            if (isMobile) {
              content = readFile('modules/adblocker/tests/unit/data/allowed-lists-mobile.json');
            } else {
              content = readFile('modules/adblocker/tests/unit/data/allowed-lists.json');
            }
          }
          callback({ response: content });
        },
      },
    },
    'core/platform': {
      default: {
        platformName,
      },
    },
    'platform/public-suffix-list': {},
  }),
  () => {
    describe('Test loading filters', () => {
      let FilterLoader;

      beforeEach(function importFiltersLoader() {
        FilterLoader = this.module().default;
      });

      it('does not load mobile customized filters', () => {
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

      it('does not load firefox filters', () => {
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
