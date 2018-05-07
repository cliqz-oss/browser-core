import {
  app,
  blurUrlBar,
  $cliqzResults,
  expect,
  fillIn,
  respondWith,
  waitForPopup,
  withHistory } from './helpers';

export default function () {
  const results = [];

  describe('default search engine tests', function () {
    const searchEnginesEn = [
      'Google',
      'Bing',
      'Wikipedia (en)',
      'Amazon.com',
      'DuckDuckGo',
      'Twitter',
      'Google Maps',
      'Google Images',
      'YouTube',
      'Start Page',
      'Ecosia'
    ];
    searchEnginesEn.forEach(function (engine) {
      context(`Search with ${engine}`, function () {
        before(async function () {
          window.preventRestarts = true;
          blurUrlBar();
          app.modules.search.action('setDefaultSearchEngine', engine);
          respondWith({ results });
          withHistory([]);
          fillIn('test');
          await waitForPopup(1);
        });

        after(function () {
          app.modules.search.action('setDefaultSearchEngine', 'Google');
          window.preventRestarts = false;
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

        it(`renders "Search with ${engine}"`, function () {
          const engineSelector = '.result.search .abstract .url';
          expect($cliqzResults.querySelector(engineSelector)).to.exist;
          expect($cliqzResults.querySelector(engineSelector).textContent.trim())
            .to.equal(`Search with ${engine}`);
        });
      });
    });
  });
}
