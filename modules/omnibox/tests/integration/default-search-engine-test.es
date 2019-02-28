import {
  $cliqzResults,
  blurUrlBar,
  expect,
  fillIn,
  mockSearch,
  mockGetSearchEngines,
  unmockGetSearchEngines,
  waitForPopup,
  win,
  withHistory,
} from './helpers';

import searchEngines from '../../core/integration/fixtures/searchEngines';

export default function () {
  const results = [];
  describe('default search engine tests', function () {
    context('changing search engines with queries', function () {
      let getSearchEngines;
      before(function () {
        win.preventRestarts = true;
        getSearchEngines = mockGetSearchEngines(searchEngines);
      });

      after(function () {
        win.preventRestarts = false;
        unmockGetSearchEngines(getSearchEngines);
      });

      searchEngines.forEach(function (engine) {
        context(`Search with ${engine.name}`, function () {
          before(async function () {
            await blurUrlBar();
            await mockSearch({ results });
            withHistory([]);
            fillIn(`${engine.alias} test`);
            await waitForPopup(0);
          });

          it('renders result', async function () {
            const resultSelector = '.result.search';
            expect(await $cliqzResults.querySelector(resultSelector)).to.exist;
          });

          it('renders search icon', async function () {
            const iconSelector = '.result .icon.search';
            expect(await $cliqzResults.querySelector(iconSelector)).to.exist;
          });

          it('renders query', async function () {
            const querySelector = '.result .abstract .strong';
            const $queryElement = await $cliqzResults.querySelector(querySelector);
            expect($queryElement).to.exist;
            expect($queryElement.textContent.trim()).to.equal('test');
          });

          it('renders divider', async function () {
            const dividerSelector = '.result .abstract .divider';
            const $dividerElement = await $cliqzResults.querySelector(dividerSelector);
            expect($dividerElement).to.exist;
            expect($dividerElement.textContent.trim()).to.equal('—');
          });

          it(`renders 'Search with ${engine.name}"`, async function () {
            const engineSelector = '.result.search .abstract .url';
            const $engineElement = await $cliqzResults.querySelector(engineSelector);
            expect($engineElement).to.exist;
            expect($engineElement.textContent.trim()).to.equal(`Search with ${engine.name}`);
          });
        });
      });
    });

    context('changing search engines with pref', function () {
      before(function () {
        win.preventRestarts = true;
      });

      after(function () {
        win.preventRestarts = false;
      });

      searchEngines.forEach(function (engine) {
        context(`Search with ${engine.name}`, function () {
          before(async function () {
            win.CLIQZ.TestHelpers.searchEngines.setDefaultSearchEngine(engine.name);
            await blurUrlBar();
            await mockSearch({ results });
            withHistory([]);
            fillIn('test');
            await waitForPopup(0);
          });

          it('renders result', async function () {
            const resultSelector = '.result.search';
            expect(await $cliqzResults.querySelector(resultSelector)).to.exist;
          });

          it('renders search icon', async function () {
            const iconSelector = '.result .icon.search';
            expect(await $cliqzResults.querySelector(iconSelector)).to.exist;
          });

          it('renders query', async function () {
            const querySelector = '.result .abstract .strong';
            const $queryElement = await $cliqzResults.querySelector(querySelector);
            expect($queryElement).to.exist;
            expect($queryElement.textContent.trim()).to.equal('test');
          });

          it('renders divider', async function () {
            const dividerSelector = '.result .abstract .divider';
            const $dividerElement = await $cliqzResults.querySelector(dividerSelector);
            expect($dividerElement).to.exist;
            expect($dividerElement.textContent.trim()).to.equal('—');
          });

          it(`renders 'Search with ${engine.name}"`, async function () {
            const engineSelector = '.result.search .abstract .url';
            const $engineElement = await $cliqzResults.querySelector(engineSelector);
            expect($engineElement).to.exist;
            expect($engineElement.textContent.trim()).to.equal(`Search with ${engine.name}`);
          });
        });
      });
    });
  });
}
