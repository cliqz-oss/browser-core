import {
  $cliqzResults,
  app,
  blurUrlBar,
  expect,
  fillIn,
  mockSearch,
  testsEnabled,
  waitForPopup,
  win,
  withHistory,
} from './helpers';

export default function () {
  if (!testsEnabled()) { return; }

  const results = [];

  describe('default search engine tests', function () {
    const searchEnginesEn = [
      { query: '#go test', engine: 'Google' },
      { query: '#bi test', engine: 'Bing' },
      { query: '#wi test', engine: 'Wikipedia (en)' },
      { query: '#am test', engine: 'Amazon.com' },
      { query: '#du test', engine: 'DuckDuckGo' },
      { query: '#tw test', engine: 'Twitter' },
      { query: '#gm test', engine: 'Google Maps' },
      { query: '#gi test', engine: 'Google Images' },
      { query: '#yt test', engine: 'YouTube' },
      { query: '#st test', engine: 'Start Page' },
      { query: '#ec test', engine: 'Ecosia' },
    ];

    context('changing search engines with pref', function () {
      searchEnginesEn.forEach(function (testCase) {
        context(`Search with ${testCase.engine}`, function () {
          before(async function () {
            win.preventRestarts = true;
            blurUrlBar();
            app.modules.search.action('setDefaultSearchEngine', testCase.engine);
            await mockSearch({ results });
            withHistory([]);
            fillIn('test');
            await waitForPopup(1);
          });

          after(function () {
            app.modules.search.action('setDefaultSearchEngine', 'Google');
            win.preventRestarts = false;
          });

          it('renders result', function () {
            const resultSelector = '.result.search';
            expect($cliqzResults.querySelector(resultSelector)).to.exist;
          });

          it('renders search icon', function () {
            const iconSelector = '.result .icon.search';
            expect($cliqzResults.querySelector(iconSelector)).to.exist;
          });

          it('renders query', function () {
            const querySelector = '.result .abstract .strong';
            expect($cliqzResults.querySelector(querySelector)).to.exist;
            expect($cliqzResults.querySelector(querySelector).textContent.trim()).to.equal('test');
          });

          it('renders divider', function () {
            const dividerSelector = '.result .abstract .divider';
            expect($cliqzResults.querySelector(dividerSelector)).to.exist;
            expect($cliqzResults.querySelector(dividerSelector).textContent.trim()).to.equal('—');
          });

          it(`renders "Search with ${testCase.engine}"`, function () {
            const engineSelector = '.result.search .abstract .url';
            expect($cliqzResults.querySelector(engineSelector)).to.exist;
            expect($cliqzResults.querySelector(engineSelector).textContent.trim())
              .to.equal(`Search with ${testCase.engine}`);
          });
        });
      });
    });

    context('changing search engines with queries', function () {
      searchEnginesEn.forEach(function (testCase) {
        context(`Search with query: ${testCase.query}`, function () {
          before(async function () {
            blurUrlBar();
            await mockSearch({ results: [] });
            withHistory([]);
            fillIn(testCase.query);
            await waitForPopup(1);
          });

          it('renders result', function () {
            const resultSelector = '.result.search';
            expect($cliqzResults.querySelector(resultSelector)).to.exist;
          });

          it('renders search icon', function () {
            const iconSelector = '.result .icon.search';
            expect($cliqzResults.querySelector(iconSelector)).to.exist;
          });

          it('renders query', function () {
            const querySelector = '.result .abstract .strong';
            expect($cliqzResults.querySelector(querySelector)).to.exist;
            expect($cliqzResults.querySelector(querySelector).textContent.trim().split(' ')[0])
              .to.equal(testCase.query.split(' ')[1]);
          });

          it('renders divider', function () {
            const dividerSelector = '.result .abstract .divider';
            expect($cliqzResults.querySelector(dividerSelector)).to.exist;
            expect($cliqzResults.querySelector(dividerSelector).textContent.trim()).to.equal('—');
          });

          it(`renders "Search with ${testCase.engine}"`, function () {
            const engineSelector = '.result.search .abstract .url';
            expect($cliqzResults.querySelector(engineSelector)).to.exist;
            expect($cliqzResults.querySelector(engineSelector).textContent.trim())
              .to.equal(`Search with ${testCase.engine}`);
          });
        });
      });
    });
  });
}
