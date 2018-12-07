import {
  clone,
  expect,
  waitFor,
} from '../../core/test-helpers';
import {
  checkTelemetry,
  defaultConfig,
  generateNewsResponse,
  Subject,
} from '../../core/test-helpers-freshtab';

describe('Freshtab interactions with news', function () {
  const newsResponse = generateNewsResponse();
  let subject;

  beforeEach(async function () {
    subject = new Subject();
    subject.respondsWithEmptyTelemetry();
    subject.respondsWithEmptySpeedDials();
    subject.respondsWithEmptyStats();
    subject.respondsWith({
      module: 'freshtab',
      action: 'getNews',
      response: newsResponse[4]
    });

    const newsConfig = clone(defaultConfig);
    newsConfig.response.componentsState.news.visible = true;
    subject.respondsWith(newsConfig);

    newsResponse[4].news[1].type = 'breaking-news';
    newsResponse[4].news[0].type = 'yournews';

    await subject.load({ iframeWidth: 1025 });
  });

  afterEach(function () {
    subject.unload();
  });

  context('with 7 news items', function () {
    const pageButtonSelector = 'button.dash';
    const newsSelector = '.news-container .box';
    const titleSelector = '.news-title';
    let $pageButtons;
    let $newsItems;

    beforeEach(function () {
      $pageButtons = subject.queryAll(pageButtonSelector);
    });

    context('when first news page is active and displayed', function () {
      ['yournews', 'breakingnews', 'topnews'].forEach(function (type, i) {
        context(`for a "${type}" element`, function () {
          beforeEach(function () {
            subject.startListening();
          });

          describe('clicking on a title element', function () {
            beforeEach(function () {
              $newsItems = subject.queryAll(newsSelector);
              $newsItems[i].querySelector('.news-title').click();
            });

            it(`sends a "${type} > click > title" telemetry signal`, function () {
              checkTelemetry({
                action: 'click',
                element: 'title',
                index: i,
                subject: () => subject,
                target: type,
                type: 'home',
              });
            });
          });

          describe('clicking on a logo element', function () {
            beforeEach(function () {
              $newsItems = subject.queryAll(newsSelector);
              $newsItems[i].querySelector('.logo').click();
            });

            it(`sends a "${type} > click > logo" telemetry signal`, function () {
              checkTelemetry({
                action: 'click',
                element: 'logo',
                index: i,
                subject: () => subject,
                target: type,
                type: 'home',
              });
            });
          });

          describe('clicking on a url element', function () {
            beforeEach(function () {
              $newsItems = subject.queryAll(newsSelector);
              $newsItems[i].querySelector('.url').click();
            });

            it(`sends a "${type} > click > url" telemetry signal`, function () {
              checkTelemetry({
                action: 'click',
                element: 'url',
                index: i,
                subject: () => subject,
                target: type,
                type: 'home',
              });
            });
          });

          describe('clicking on a description element', function () {
            beforeEach(function () {
              $newsItems = subject.queryAll(newsSelector);
              $newsItems[i].querySelector('.news-description').click();
            });

            it(`sends a "${type} > click > description" telemetry signal`, function () {
              checkTelemetry({
                action: 'click',
                element: 'description',
                index: i,
                subject: () => subject,
                target: type,
                type: 'home',
              });
            });
          });

          describe('clicking on a read more element', function () {
            beforeEach(function () {
              $newsItems = subject.queryAll(newsSelector);
              $newsItems[i].querySelector('.read-more-button').click();
            });

            it(`sends a "${type} > click > read_more" telemetry signal`, function () {
              checkTelemetry({
                action: 'click',
                element: 'read_more',
                index: i,
                subject: () => subject,
                target: type,
                type: 'home',
              });
            });
          });
        });
      });

      describe('clicking on the first news page button', function () {
        beforeEach(async function () {
          subject.startListening();
          [...$pageButtons][0].click();
          await waitFor(() => (subject.query("a[data-index='0']")));
          $newsItems = subject.queryAll(newsSelector);
        });

        it('shows news items from the first page', function () {
          expect($newsItems.length).to.be.above(0);
          [...$newsItems].forEach(function (news, i) {
            expect(news.querySelector(`a[data-index='${i}']`).querySelector(titleSelector))
              .to.contain.text(newsResponse[4].news[i].title);
          });
        });

        it('changes the clicked button to active', function () {
          expect([...$pageButtons][0].className).to.contain('active');
        });

        it('keeps other buttons inactive', function () {
          expect([...$pageButtons][1].className).to.not.contain('active');
          expect([...$pageButtons][2].className).to.not.contain('active');
        });

        it('sends a "news_pagination > click" telemetry signal', function () {
          checkTelemetry({
            action: 'click',
            index: 0,
            subject: () => subject,
            target: 'news_pagination',
            type: 'home',
          });
        });
      });

      describe('clicking on the second news page button', function () {
        beforeEach(async function () {
          subject.startListening();
          [...$pageButtons][1].click();
          await waitFor(() => (subject.query("a[data-index='3']")));
          $newsItems = subject.queryAll(newsSelector);
        });

        it('shows news items from the second page', function () {
          expect($newsItems.length).to.be.above(0);
          [...$newsItems].forEach(function (news, i) {
            expect(news.querySelector(`a[data-index='${i + 3}']`).querySelector(titleSelector))
              .to.have.text(newsResponse[4].news[i + 3].title);
          });
        });

        it('changes the clicked button to active', function () {
          expect([...$pageButtons][1].className).to.contain('active');
        });

        it('keeps other buttons inactive', function () {
          expect([...$pageButtons][0].className).to.not.contain('active');
          expect([...$pageButtons][2].className).to.not.contain('active');
        });

        it('sends a "news_pagination > click" telemetry signal', function () {
          checkTelemetry({
            action: 'click',
            index: 1,
            subject: () => subject,
            target: 'news_pagination',
            type: 'home',
          });
        });
      });

      describe('clicking on the third news page button', function () {
        beforeEach(async function () {
          subject.startListening();
          [...$pageButtons][2].click();
          await waitFor(() => (subject.query("a[data-index='6']")));
          $newsItems = subject.queryAll(newsSelector);
        });

        it('shows one news item from the third page', function () {
          expect($newsItems[0].querySelector("a[data-index='6']").querySelector(titleSelector))
            .to.have.text(newsResponse[4].news[6].title);
        });

        it('changes the clicked button to active', function () {
          expect([...$pageButtons][2].className).to.contain('active');
        });

        it('keeps other buttons inactive', function () {
          expect([...$pageButtons][0].className).to.not.contain('active');
          expect([...$pageButtons][1].className).to.not.contain('active');
        });

        it('sends a "news_pagination > click" telemetry signal', function () {
          checkTelemetry({
            action: 'click',
            index: 2,
            subject: () => subject,
            target: 'news_pagination',
            type: 'home',
          });
        });
      });
    });
  });
});
