import {
  blurUrlBar,
  $cliqzResults,
  expect,
  fillIn,
  getComputedStyle,
  mockSearch,
  testsEnabled,
  waitForPopup,
  withHistory } from './helpers';

import results from './fixtures/resultsSingleVideo';

export default function () {
  if (!testsEnabled()) { return; }

  context('for single video', function () {
    const mainResultSelector = '.cliqz-result:not(.history)';
    const resultSelector = '.single-video a.result';
    const videoSelector = '.abstract';
    const logoSelector = '.icons .logo';
    const thumbnailSelector = '.thumbnail img';
    const headlineSelector = '.title';
    const domainSelector = '.url';
    const videoViewsSelector = '.video-views';
    const videoDurationSelector = '.duration';

    before(async function () {
      window.preventRestarts = true;
      blurUrlBar();
      await mockSearch({ results });
      withHistory([]);
      fillIn('youtube donald trump');
      await waitForPopup(2);
    });

    after(function () {
      window.preventRestarts = false;
    });

    describe('renders single video result', function () {
      it('successfully', function () {
        const $videoResult = $cliqzResults.querySelector(`${mainResultSelector} ${resultSelector}`);
        expect($videoResult).to.exist;
      });

      it('with a correct URL', function () {
        const $videoResult = $cliqzResults.querySelector(`${mainResultSelector} ${resultSelector}`);

        expect($videoResult.href).to.exist;
        expect($videoResult.href).to.equal(results[0].url);
      });

      it('with a logo', function () {
        const $logo = $cliqzResults
          .querySelector(`${mainResultSelector} ${resultSelector} ${logoSelector}`);

        expect($logo).to.exist;
        expect(getComputedStyle($logo).backgroundImage).to.contain('youtube');
      });

      it('with an existing video element', function () {
        const $videoElement = $cliqzResults
          .querySelector(`${mainResultSelector} ${resultSelector} ${videoSelector}`);
        expect($videoElement).to.exist;
      });
    });

    context('the video element', function () {
      it('renders a correct thumbnail', function () {
        const $thumbnail = $cliqzResults
          .querySelector(`${mainResultSelector} ${resultSelector} ${videoSelector} ${thumbnailSelector}`);

        expect($thumbnail).to.exist;
        expect($thumbnail.src).to.equal(results[0].snippet.extra.rich_data.thumbnail);
      });

      it('renders a correct headline', function () {
        const $headline = $cliqzResults
          .querySelector(`${mainResultSelector} ${resultSelector} ${videoSelector} ${headlineSelector}`);

        expect($headline).to.exist;
        expect($headline).to.contain.text(results[0].snippet.title);
      });

      it('renders a correct duration', function () {
        const $duration = $cliqzResults
          .querySelector(`${mainResultSelector} ${resultSelector} ${videoSelector} ${videoDurationSelector}`);

        expect($duration).to.exist;
        expect($duration).to.contain.text('► 03:55');
      });

      it('renders with an existing video views', function () {
        const $videoViews = $cliqzResults
          .querySelector(`${mainResultSelector} ${resultSelector} ${videoSelector} ${videoViewsSelector}`);

        expect($videoViews).to.exist;
        expect($videoViews).to.contain.text(`${results[0].snippet.extra.rich_data.views} ${'views'}`);
      });

      it('renders correct domain', function () {
        const $domain = $cliqzResults
          .querySelector(`${mainResultSelector} ${resultSelector} ${videoSelector} ${domainSelector}`);

        expect($domain).to.exist;
        expect($domain)
          .to.contain.text(results[0].snippet.friendlyUrl);
      });
    });
  });
}
