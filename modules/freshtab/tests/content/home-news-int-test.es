import {
  clearIntervals,
  clone,
  expect,
  waitFor
} from '../../core/test-helpers';
import {
  defaultConfig,
  generateNewsResponse,
  Subject
} from '../../core/test-helpers-freshtab';

describe('Fresh tab interactions with news', function () {
  const newsResponse = generateNewsResponse();
  let subject;
  let messages;
  let listener;

  beforeEach(async function () {
    subject = new Subject();
    subject.respondsWithEmptyTelemetry();
    subject.respondsWithEmptySpeedDials();
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

    // Keep track of received messages
    messages = new Map();
    listener = function (msg) {
      if (!messages.has(msg.action)) {
        messages.set(msg.action, []);
      }

      messages.get(msg.action).push(msg);
    };
    subject.chrome.runtime.onMessage.addListener(listener);
  });

  afterEach(function () {
    subject.unload();
    clearIntervals();
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
          describe('clicking on a title element', function () {
            beforeEach(function () {
              $newsItems = subject.queryAll(newsSelector);
              $newsItems[i].querySelector('.news-title').click();
            });

            it(`sends a "${type} > click > title" telemetry signal`, function () {
              expect(messages.has('sendTelemetry')).to.equal(true);

              const telemetrySignals = messages.get('sendTelemetry');
              let count = 0;

              expect(telemetrySignals.length).to.be.above(0);

              count = telemetrySignals.filter(function (s) {
                return (
                  s.args[0].type === 'home' &&
                  s.args[0].target === type &&
                  s.args[0].action === 'click' &&
                  s.args[0].element === 'title' &&
                  s.args[0].index === i
                );
              }).length;

              expect(count).to.equal(1);
            });
          });

          describe('clicking on a logo element', function () {
            beforeEach(function () {
              $newsItems = subject.queryAll(newsSelector);
              $newsItems[i].querySelector('.logo').click();
            });

            it(`sends a "${type} > click > logo" telemetry signal`, function () {
              expect(messages.has('sendTelemetry')).to.equal(true);

              const telemetrySignals = messages.get('sendTelemetry');
              let count = 0;

              expect(telemetrySignals.length).to.be.above(0);

              count = telemetrySignals.filter(function (s) {
                return (
                  s.args[0].type === 'home' &&
                  s.args[0].target === type &&
                  s.args[0].action === 'click' &&
                  s.args[0].element === 'logo' &&
                  s.args[0].index === i
                );
              }).length;

              expect(count).to.equal(1);
            });
          });

          describe('clicking on a url element', function () {
            beforeEach(function () {
              $newsItems = subject.queryAll(newsSelector);
              $newsItems[i].querySelector('.url').click();
            });

            it(`sends a "${type} > click > url" telemetry signal`, function () {
              expect(messages.has('sendTelemetry')).to.equal(true);

              const telemetrySignals = messages.get('sendTelemetry');
              let count = 0;

              expect(telemetrySignals.length).to.be.above(0);

              count = telemetrySignals.filter(function (s) {
                return (
                  s.args[0].type === 'home' &&
                  s.args[0].target === type &&
                  s.args[0].action === 'click' &&
                  s.args[0].element === 'url' &&
                  s.args[0].index === i
                );
              }).length;

              expect(count).to.equal(1);
            });
          });

          describe('clicking on a description element', function () {
            beforeEach(function () {
              $newsItems = subject.queryAll(newsSelector);
              $newsItems[i].querySelector('.news-description').click();
            });

            it(`sends a "${type} > click > description" telemetry signal`, function () {
              expect(messages.has('sendTelemetry')).to.equal(true);

              const telemetrySignals = messages.get('sendTelemetry');
              let count = 0;

              expect(telemetrySignals.length).to.be.above(0);

              count = telemetrySignals.filter(function (s) {
                return (
                  s.args[0].type === 'home' &&
                  s.args[0].target === type &&
                  s.args[0].action === 'click' &&
                  s.args[0].element === 'description' &&
                  s.args[0].index === i
                );
              }).length;

              expect(count).to.equal(1);
            });
          });

          describe('clicking on a read more element', function () {
            beforeEach(function () {
              $newsItems = subject.queryAll(newsSelector);
              $newsItems[i].querySelector('.read-more-button').click();
            });

            it(`sends a "${type} > click > read_more" telemetry signal`, function () {
              expect(messages.has('sendTelemetry')).to.equal(true);

              const telemetrySignals = messages.get('sendTelemetry');
              let count = 0;

              expect(telemetrySignals.length).to.be.above(0);

              count = telemetrySignals.filter(function (s) {
                return (
                  s.args[0].type === 'home' &&
                  s.args[0].target === type &&
                  s.args[0].action === 'click' &&
                  s.args[0].element === 'read_more' &&
                  s.args[0].index === i
                );
              }).length;

              expect(count).to.equal(1);
            });
          });
        });
      });

      describe('clicking on the first news page button', function () {
        beforeEach(async function () {
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
          expect(messages.has('sendTelemetry')).to.equal(true);

          const telemetrySignals = messages.get('sendTelemetry');
          let count = 0;

          expect(telemetrySignals.length).to.be.above(0);

          count = telemetrySignals.filter(function (s) {
            return (
              s.args[0].type === 'home' &&
              s.args[0].target === 'news_pagination' &&
              s.args[0].action === 'click' &&
              s.args[0].index === 0
            );
          }).length;

          expect(count).to.equal(1);
        });
      });

      describe('clicking on the second news page button', function () {
        beforeEach(async function () {
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
          expect(messages.has('sendTelemetry')).to.equal(true);

          const telemetrySignals = messages.get('sendTelemetry');
          let count = 0;

          expect(telemetrySignals.length).to.be.above(0);

          count = telemetrySignals.filter(function (s) {
            return (
              s.args[0].type === 'home' &&
              s.args[0].target === 'news_pagination' &&
              s.args[0].action === 'click' &&
              s.args[0].index === 1
            );
          }).length;

          expect(count).to.equal(1);
        });
      });

      describe('clicking on the third news page button', function () {
        beforeEach(async function () {
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
          expect(messages.has('sendTelemetry')).to.equal(true);

          const telemetrySignals = messages.get('sendTelemetry');
          let count = 0;

          expect(telemetrySignals.length).to.be.above(0);

          count = telemetrySignals.filter(function (s) {
            return (
              s.args[0].type === 'home' &&
              s.args[0].target === 'news_pagination' &&
              s.args[0].action === 'click' &&
              s.args[0].index === 2
            );
          }).length;

          expect(count).to.equal(1);
        });
      });
    });

    context('when last news page is active and displayed', function () {
      beforeEach(function () {
        [...$pageButtons][2].click();
        return waitFor(() => (subject.query("a[data-index='6']")));
      });

      describe('clicking on the first news page button', function () {
        beforeEach(async function () {
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

        it('sends a "news_pagination>click" telemetry signal', function () {
          expect(messages.has('sendTelemetry')).to.equal(true);

          const telemetrySignals = messages.get('sendTelemetry');
          let count = 0;

          expect(telemetrySignals.length).to.be.above(0);

          count = telemetrySignals.filter(function (s) {
            return (
              s.args[0].type === 'home' &&
              s.args[0].target === 'news_pagination' &&
              s.args[0].action === 'click' &&
              s.args[0].index === 0
            );
          }).length;

          expect(count).to.equal(1);
        });
      });

      describe('clicking on the second news page button', function () {
        beforeEach(async function () {
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
          expect(messages.has('sendTelemetry')).to.equal(true);

          const telemetrySignals = messages.get('sendTelemetry');
          let count = 0;

          expect(telemetrySignals.length).to.be.above(0);

          count = telemetrySignals.filter(function (s) {
            return (
              s.args[0].type === 'home' &&
              s.args[0].target === 'news_pagination' &&
              s.args[0].action === 'click' &&
              s.args[0].index === 1
            );
          }).length;

          expect(count).to.equal(1);
        });
      });

      describe('clicking on the third news page button', function () {
        beforeEach(async function () {
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
          expect(messages.has('sendTelemetry')).to.equal(true);

          const telemetrySignals = messages.get('sendTelemetry');
          let count = 0;

          expect(telemetrySignals.length).to.be.above(0);

          count = telemetrySignals.filter(function (s) {
            return (
              s.args[0].type === 'home' &&
              s.args[0].target === 'news_pagination' &&
              s.args[0].action === 'click' &&
              s.args[0].index === 2
            );
          }).length;

          expect(count).to.equal(2);
        });
      });
    });
  });
});
