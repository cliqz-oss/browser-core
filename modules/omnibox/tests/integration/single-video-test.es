/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
  $cliqzResults,
  blurUrlBar,
  expect,
  fillIn,
  getComputedStyle,
  mockSearch,
  waitForPopup,
  win,
  withHistory,
} from './helpers';

import { results, resultsNullViews, resultsZeroViews, resultsUndefinedViews } from '../../core/integration/fixtures/resultsSingleVideo';

export default function () {
  [results, resultsNullViews, resultsZeroViews, resultsUndefinedViews].forEach((result) => {
    context(`${result[0].test_name}`, function () {
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
        win.preventRestarts = true;
        await blurUrlBar();
        await mockSearch({ results: result });
        withHistory([]);
        fillIn('youtube donald trump');
        await waitForPopup(1);
      });

      after(function () {
        win.preventRestarts = false;
      });

      describe('renders single video result', function () {
        it('successfully', async function () {
          const $videoResult = await $cliqzResults.querySelector(`${mainResultSelector} ${resultSelector}`);
          expect($videoResult).to.exist;
        });

        it('with a correct URL', async function () {
          const $videoResult = await $cliqzResults.querySelector(`${mainResultSelector} ${resultSelector}`);

          expect($videoResult.href).to.exist;
          expect($videoResult.href).to.equal(result[0].url);
        });

        it('with a logo', async function () {
          const selector = `${mainResultSelector} ${resultSelector} ${logoSelector}`;
          const $logo = await $cliqzResults.querySelector(selector);

          expect($logo).to.exist;
          expect(await getComputedStyle($logo, 'backgroundImage')).to.contain('youtube');
        });

        it('with an existing video element', async function () {
          const $videoElement = await $cliqzResults
            .querySelector(`${mainResultSelector} ${resultSelector} ${videoSelector}`);
          expect($videoElement).to.exist;
        });
      });

      context('the video element', function () {
        it('renders a correct thumbnail', async function () {
          const $thumbnail = await $cliqzResults
            .querySelector(`${mainResultSelector} ${resultSelector} ${videoSelector} ${thumbnailSelector}`);

          expect($thumbnail).to.exist;
          expect($thumbnail.src).to.equal(result[0].snippet.extra.rich_data.thumbnail);
        });

        it('renders a correct headline', async function () {
          const $headline = await $cliqzResults
            .querySelector(`${mainResultSelector} ${resultSelector} ${videoSelector} ${headlineSelector}`);

          expect($headline).to.exist;
          expect($headline).to.contain.text(result[0].snippet.title);
        });

        it('renders a correct duration', async function () {
          const $duration = await $cliqzResults
            .querySelector(`${mainResultSelector} ${resultSelector} ${videoSelector} ${videoDurationSelector}`);

          expect($duration).to.exist;
          expect($duration).to.contain.text('► 03:55');
        });

        it('renders with an existing video views', async function () {
          const $videoViews = await $cliqzResults
            .querySelector(`${mainResultSelector} ${resultSelector} ${videoSelector} ${videoViewsSelector}`);

          if (result[0].snippet.extra.rich_data.views) {
            expect($videoViews).to.exist;
            expect($videoViews).to.contain.text(`${result[0].snippet.extra.rich_data.expected_views} views`);
          }
        });

        it('renders without an existing video views', async function () {
          const $videoViews = await $cliqzResults
            .querySelector(`${mainResultSelector} ${resultSelector} ${videoSelector} ${videoViewsSelector}`);

          if (result[0].snippet.extra.rich_data.views) {
            expect($videoViews).to.exist;
            expect($videoViews).to.contain.text(`${result[0].snippet.extra.rich_data.expected_views} views`);
          }
        });

        it('renders correct domain', async function () {
          const $domain = await $cliqzResults
            .querySelector(`${mainResultSelector} ${resultSelector} ${videoSelector} ${domainSelector}`);

          expect($domain).to.exist;
          expect($domain)
            .to.contain.text(result[0].snippet.friendlyUrl);
        });
      });
    });
  });
}
