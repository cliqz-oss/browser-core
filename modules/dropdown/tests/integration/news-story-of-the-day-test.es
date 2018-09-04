import {
  $cliqzResults,
  blurUrlBar,
  expect,
  fillIn,
  getComputedStyle,
  mockSearch,
  testsEnabled,
  waitForPopup,
  win,
  withHistory,
} from './helpers';

import results from '../../core/integration/fixtures/resultsNewsStoryOfTheDay';

export default function () {
  if (!testsEnabled()) { return; }

  context('for news stories of the day', function () {
    const mainResultSelector = '.cliqz-result:not(.history)';
    const resultSelector = '.news-story a.result';
    const newsSelector = '.abstract';
    const logoSelector = '.icons .logo';
    const thumbnailSelector = '.thumbnail img';
    const headlineSelector = '.title';
    const descriptionSelector = '.description';
    const timestampSelector = '.published-at';
    const domainSelector = '.url';

    before(async function () {
      win.preventRestarts = true;
      blurUrlBar();
      await mockSearch({ results });
      withHistory([]);
      fillIn('donald trump');
      await waitForPopup(2);
    });

    after(function () {
      win.preventRestarts = false;
    });

    describe('renders news result', function () {
      it('successfully', function () {
        const $newsResult = $cliqzResults.querySelector(`${mainResultSelector} ${resultSelector}`);
        expect($newsResult).to.exist;
      });

      it('with a correct URL', function () {
        const $newsResult = $cliqzResults.querySelector(`${mainResultSelector} ${resultSelector}`);

        expect($newsResult.href).to.exist;
        expect($newsResult.href).to.equal(results[0].url);
      });

      it('with a logo', function () {
        const $logo = $cliqzResults
          .querySelector(`${mainResultSelector} ${resultSelector} ${logoSelector}`);

        expect($logo).to.exist;
        expect(getComputedStyle($logo).backgroundImage).to.contain('n-tv');
      });

      it('with an existing news element', function () {
        const $newsElement = $cliqzResults
          .querySelector(`${mainResultSelector} ${resultSelector} ${newsSelector}`);
        expect($newsElement).to.exist;
      });
    });

    context('the news element', function () {
      it('renders a correct thumbnail', function () {
        const $thumbnail = $cliqzResults
          .querySelector(`${mainResultSelector} ${resultSelector} ${newsSelector} ${thumbnailSelector}`);

        expect($thumbnail).to.exist;
        expect($thumbnail.src).to.equal(results[0].snippet.extra.image.src);
      });

      it('renders a correct headline', function () {
        const $thumbnail = $cliqzResults
          .querySelector(`${mainResultSelector} ${resultSelector} ${newsSelector} ${headlineSelector}`);

        expect($thumbnail).to.exist;
        expect($thumbnail).to.contain.text(results[0].snippet.title);
      });

      it('renders a correct description', function () {
        const $description = $cliqzResults
          .querySelector(`${mainResultSelector} ${resultSelector} ${newsSelector} ${descriptionSelector}`);

        expect($description).to.exist;
        expect($description).to.contain.text(results[0].snippet.description);
      });

      it('renders with an existing timestamp', function () {
        const $timestamp = $cliqzResults
          .querySelector(`${mainResultSelector} ${resultSelector} ${newsSelector} ${timestampSelector}`);

        expect($timestamp).to.exist;
      });

      it('renders acorrect domain', function () {
        const $domain = $cliqzResults
          .querySelector(`${mainResultSelector} ${resultSelector} ${newsSelector} ${domainSelector}`);

        expect($domain).to.exist;
        expect($domain)
          .to.contain.text(results[0].snippet.extra.rich_data.source_name);
      });
    });
  });
}
