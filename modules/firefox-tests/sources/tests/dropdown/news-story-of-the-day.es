import {
  $cliqzResults,
  expect,
  fillIn,
  getComputedStyle,
  respondWith,
  waitForPopup,
  withHistory } from './helpers';

import results from './fixtures/resultsNewsStoryOfTheDay';

export default function () {
  context('for a news stories of the day rich header', function () {
    const resultSelector = 'div.news-story a.result';
    const newsSelector = 'div.abstract';
    const newsAreaSelector = 'div.content';
    let $resultElement;
    let resultItem;
    let newsItem;
    let newsAreaItem;

    before(function () {
      respondWith({ results });
      withHistory([]);
      fillIn('donald trump');
      return waitForPopup().then(function () {
        $resultElement = $cliqzResults()[0];

        resultItem = $resultElement.querySelector(resultSelector);
        newsItem = resultItem.querySelector(newsSelector);
        newsAreaItem = newsItem.querySelector(newsAreaSelector);
      });
    });

    describe('renders the news result', function () {
      it('successfully', function () {
        expect(resultItem).to.exist;
      });

      it('with existing and correct URL', function () {
        expect(resultItem.dataset.url).to.equal(results[0].url);
      });

      it('with existing and correct logo', function () {
        const logoSelector = 'div.icons span.logo';
        const logoItem = resultItem.querySelector(logoSelector);
        expect(logoItem).to.exist;
        expect(getComputedStyle(logoItem).backgroundImage).to.contain('n-tv');
      });

      it('with existing news element', function () {
        expect(newsItem).to.exist;
      });
    });

    context('the news element', function () {
      it('renders with existing and correct thumbnail', function () {
        const newsThumbnailSelector = 'div.thumbnail img';
        const newsThumbnailItem = newsItem.querySelector(newsThumbnailSelector);
        expect(newsThumbnailItem).to.exist;
        expect(newsThumbnailItem.src).to.equal(results[0].snippet.extra.image.src);
      });

      it('renders with existing news area', function () {
        expect(newsAreaItem).to.exist;
      });
    });

    context('the news area', function () {
      it('renders with existing and correct headline', function () {
        const newsHeadlineSelector = 'p span.title';
        const newsHeadlineItem = newsItem.querySelector(newsHeadlineSelector);
        expect(newsHeadlineItem).to.exist;
        expect(newsHeadlineItem).to.contain.text(results[0].snippet.title);
      });

      it('renders with existing and correct description', function () {
        const newsDescriptionSelector = 'p span.description';
        const newsDescriptionItem = newsItem.querySelector(newsDescriptionSelector);
        expect(newsDescriptionItem).to.exist;
        expect(newsDescriptionItem).to.contain.text(results[0].snippet.description);
      });

      it('renders with existing timestamp', function () {
        const newsTimestampSelector = 'p span.published-at';
        const newsTimestampItem = newsItem.querySelector(newsTimestampSelector);
        expect(newsTimestampItem).to.exist;
      });

      it('renders with existing and correct domain', function () {
        const newsDomainSelector = 'p span.url';
        const newsDomainItem = newsItem.querySelector(newsDomainSelector);
        expect(newsDomainItem).to.exist;
        expect(newsDomainItem)
          .to.contain.text(results[0].snippet.extra.rich_data.source_name);
      });
    });
  });
}
