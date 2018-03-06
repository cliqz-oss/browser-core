import {
  clearIntervals,
  clone,
  defaultConfig,
  expect,
  Subject,
  waitFor
} from './helpers';

const newsItem = i => ({
  title: `News title ${i}`,
  description: `${i} Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin in sem in turpis vestibulum viverra id vel arcu. Nunc at hendrerit elit. Nunc eget neque non magna egestas efficitur. Quisque eget justo quis elit pulvinar volutpat. Cras tempus sodales mauris, sed rhoncus mauris accumsan ut.`,
  displayUrl: `http://display.news${i}.com`,
  logo: {
    backgroundColor: '333333',
    backgroundImage: 'url("https://cdn.cliqz.com/brands-database/database/1473867650984/logos/itv/$.svg")',
    text: 'it',
    color: '#fff',
    buttonsClass: 'cliqz-brands-button-10',
    style: 'background-color: #333333;color:#fff;background-image:url(https://cdn.cliqz.com/brands-database/database/1473867650984/logos/itv/$.svg); text-indent: -10em;'
  },
  url: `http://news${i}.com`,
  type: 'topnews'
});

describe('Fresh tab interactions with news', function () {
  const newsResponse = {
    version: 0,
    news: [0, 1, 2, 3, 4, 5, 6].map(newsItem)
  };
  let subject;
  let messages;
  let listener;

  beforeEach(function () {
    subject = new Subject();
    subject.respondsWith({
      module: 'core',
      action: 'sendTelemetry',
      response: ''
    });

    subject.respondsWith({
      module: 'freshtab',
      action: 'getSpeedDials',
      response: {
        history: [],
        custom: []
      },
    });

    subject.respondsWith({
      module: 'freshtab',
      action: 'getNews',
      response: newsResponse
    });

    const newsConfig = clone(defaultConfig);
    newsConfig.response.componentsState.news.visible = true;
    subject.respondsWith(newsConfig);

    newsResponse.news[1].type = 'breaking-news';
    newsResponse.news[0].type = 'yournews';

    return subject.load({ iframeWidth: 1025 }).then(() => {
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
  });

  afterEach(function () {
    subject.unload();
    clearIntervals();
  });

  context('with 7 news items', function () {
    const pageButtonSelector = 'button.dash';
    const newsSelector = 'div.news-container div.box';
    const newsTitleSelector = 'div.news-title';
    let pageButtonItems;
    let newsItems;

    beforeEach(function () {
      pageButtonItems = subject.queryAll(pageButtonSelector);
    });

    context('when first news page is active and displayed', function () {
      ['yournews', 'breakingnews', 'topnews'].forEach(function (type, i) {
        context(`for a "${type}" element`, function () {
          describe('clicking on a title element', function () {
            beforeEach(function () {
              newsItems = subject.queryAll(newsSelector);
              newsItems[i].querySelector('div.news-title').click();
            });

            it(`sends a "${type} > click > title" telemetry signal`, function () {
              expect(messages.has('sendTelemetry')).to.equal(true);

              const telemetrySignals = messages.get('sendTelemetry');
              let signalExist = false;
              let count = 0;

              expect(telemetrySignals.length).to.be.above(0);
              telemetrySignals.forEach(function (item) {
                if ((item.args[0].type === 'home') &&
                    (item.args[0].target === type) &&
                    (item.args[0].action === 'click') &&
                    (item.args[0].element === 'title') &&
                    (item.args[0].index === i)) {
                      signalExist = true;
                      count += 1;
                }
              });

              expect(signalExist).to.be.true;
              expect(count).to.equal(1);
            });
          });

          describe('clicking on a logo element', function () {
            beforeEach(function () {
              newsItems = subject.queryAll(newsSelector);
              newsItems[i].querySelector('div.logo').click();
            });

            it(`sends a "${type} > click > logo" telemetry signal`, function () {
              expect(messages.has('sendTelemetry')).to.equal(true);

              const telemetrySignals = messages.get('sendTelemetry');
              let signalExist = false;
              let count = 0;

              expect(telemetrySignals.length).to.be.above(0);
              telemetrySignals.forEach(function (item) {
                if ((item.args[0].type === 'home') &&
                    (item.args[0].target === type) &&
                    (item.args[0].action === 'click') &&
                    (item.args[0].element === 'logo') &&
                    (item.args[0].index === i)) {
                      signalExist = true;
                      count += 1;
                }
              });

              expect(signalExist).to.be.true;
              expect(count).to.equal(1);
            });
          });

          describe('clicking on a url element', function () {
            beforeEach(function () {
              newsItems = subject.queryAll(newsSelector);
              newsItems[i].querySelector('div.url').click();
            });

            it(`sends a "${type} > click > url" telemetry signal`, function () {
              expect(messages.has('sendTelemetry')).to.equal(true);

              const telemetrySignals = messages.get('sendTelemetry');
              let signalExist = false;
              let count = 0;

              expect(telemetrySignals.length).to.be.above(0);
              telemetrySignals.forEach(function (item) {
                if ((item.args[0].type === 'home') &&
                    (item.args[0].target === type) &&
                    (item.args[0].action === 'click') &&
                    (item.args[0].element === 'url') &&
                    (item.args[0].index === i)) {
                      signalExist = true;
                      count += 1;
                }
              });

              expect(signalExist).to.be.true;
              expect(count).to.equal(1);
            });
          });

          describe('clicking on a description element', function () {
            beforeEach(function () {
              newsItems = subject.queryAll(newsSelector);
              newsItems[i].querySelector('div.news-description').click();
            });

            it(`sends a "${type} > click > description" telemetry signal`, function () {
              expect(messages.has('sendTelemetry')).to.equal(true);

              const telemetrySignals = messages.get('sendTelemetry');
              let signalExist = false;
              let count = 0;

              expect(telemetrySignals.length).to.be.above(0);
              telemetrySignals.forEach(function (item) {
                if ((item.args[0].type === 'home') &&
                    (item.args[0].target === type) &&
                    (item.args[0].action === 'click') &&
                    (item.args[0].element === 'description') &&
                    (item.args[0].index === i)) {
                      signalExist = true;
                      count += 1;
                }
              });

              expect(signalExist).to.be.true;
              expect(count).to.equal(1);
            });
          });

          describe('clicking on a read more element', function () {
            beforeEach(function () {
              newsItems = subject.queryAll(newsSelector);
              newsItems[i].querySelector('div.read-more-button').click();
            });

            it(`sends a "${type} > click > read_more" telemetry signal`, function () {
              expect(messages.has('sendTelemetry')).to.equal(true);

              const telemetrySignals = messages.get('sendTelemetry');
              let signalExist = false;
              let count = 0;

              expect(telemetrySignals.length).to.be.above(0);
              telemetrySignals.forEach(function (item) {
                if ((item.args[0].type === 'home') &&
                    (item.args[0].target === type) &&
                    (item.args[0].action === 'click') &&
                    (item.args[0].element === 'read_more') &&
                    (item.args[0].index === i)) {
                      signalExist = true;
                      count += 1;
                }
              });

              expect(signalExist).to.be.true;
              expect(count).to.equal(1);
            });
          });
        });
      });

      describe('clicking on the first news page button', function () {
        beforeEach(function () {
          [...pageButtonItems][0].click();
          return waitFor(() => (subject.query("a[data-index='0']"))).then(() => {
            newsItems = subject.queryAll(newsSelector);
          });
        });

        it('shows news items from the first page', function () {
          expect(newsItems.length).to.be.above(0);
          [...newsItems].forEach(function (news, i) {
            expect(news.querySelector(`a[data-index='${i}']`).querySelector(newsTitleSelector))
              .to.contain.text(newsResponse.news[i].title);
          });
        });

        it('changes the clicked button to active', function () {
          expect([...pageButtonItems][0].className).to.contain('active');
        });

        it('keeps other buttons inactive', function () {
          expect([...pageButtonItems][1].className).to.not.contain('active');
          expect([...pageButtonItems][2].className).to.not.contain('active');
        });

        it('sends a "news_pagination > click" telemetry signal', function () {
          expect(messages.has('sendTelemetry')).to.equal(true);

          const telemetrySignals = messages.get('sendTelemetry');
          let signalExist = false;
          let count = 0;

          expect(telemetrySignals.length).to.be.above(0);
          telemetrySignals.forEach(function (item) {
            if ((item.args[0].type === 'home') &&
                (item.args[0].target === 'news_pagination') &&
                (item.args[0].action === 'click') &&
                (item.args[0].index === 0)) {
                  signalExist = true;
                  count += 1;
            }
          });

          expect(signalExist).to.be.true;
          expect(count).to.equal(1);
        });
      });

      describe('clicking on the second news page button', function () {
        beforeEach(function () {
          [...pageButtonItems][1].click();
          return waitFor(() => (subject.query("a[data-index='3']"))).then(() => {
            newsItems = subject.queryAll(newsSelector);
          });
        });

        it('shows news items from the second page', function () {
          expect(newsItems.length).to.be.above(0);
          [...newsItems].forEach(function (news, i) {
            expect(news.querySelector(`a[data-index='${i + 3}']`).querySelector(newsTitleSelector))
              .to.have.text(newsResponse.news[i + 3].title);
          });
        });

        it('changes the clicked button to active', function () {
          expect([...pageButtonItems][1].className).to.contain('active');
        });

        it('keeps other buttons inactive', function () {
          expect([...pageButtonItems][0].className).to.not.contain('active');
          expect([...pageButtonItems][2].className).to.not.contain('active');
        });

        it('sends a "news_pagination > click" telemetry signal', function () {
          expect(messages.has('sendTelemetry')).to.equal(true);

          const telemetrySignals = messages.get('sendTelemetry');
          let signalExist = false;
          let count = 0;

          expect(telemetrySignals.length).to.be.above(0);
          telemetrySignals.forEach(function (item) {
            if ((item.args[0].type === 'home') &&
                (item.args[0].target === 'news_pagination') &&
                (item.args[0].action === 'click') &&
                (item.args[0].index === 1)) {
                  signalExist = true;
                  count += 1;
            }
          });

          expect(signalExist).to.be.true;
          expect(count).to.equal(1);
        });
      });

      describe('clicking on the third news page button', function () {
        beforeEach(function () {
          [...pageButtonItems][2].click();
          return waitFor(() => (subject.query("a[data-index='6']"))).then(() => {
            newsItems = subject.queryAll(newsSelector);
          });
        });

        it('shows one news item from the third page', function () {
          expect(newsItems[0].querySelector("a[data-index='6']").querySelector(newsTitleSelector))
            .to.have.text(newsResponse.news[6].title);
        });

        it('changes the clicked button to active', function () {
          expect([...pageButtonItems][2].className).to.contain('active');
        });

      it('keeps other buttons inactive', function () {
        expect([...pageButtonItems][0].className).to.not.contain('active');
        expect([...pageButtonItems][1].className).to.not.contain('active');
      });

        it('sends a "news_pagination > click" telemetry signal', function () {
          expect(messages.has('sendTelemetry')).to.equal(true);

          const telemetrySignals = messages.get('sendTelemetry');
          let signalExist = false;
          let count = 0;

          expect(telemetrySignals.length).to.be.above(0);
          telemetrySignals.forEach(function (item) {
            if ((item.args[0].type === 'home') &&
                (item.args[0].target === 'news_pagination') &&
                (item.args[0].action === 'click') &&
                (item.args[0].index === 2)) {
                  signalExist = true;
                  count += 1;
            }
          });

          expect(signalExist).to.be.true;
          expect(count).to.equal(1);
        });
      });
    });

    context('when last news page is active and displayed', function () {
      beforeEach(function () {
        [...pageButtonItems][2].click();
        return waitFor(() => (subject.query("a[data-index='6']")));
      });

      describe('clicking on the first news page button', function () {
        beforeEach(function () {
          [...pageButtonItems][0].click();
          return waitFor(() => (subject.query("a[data-index='0']"))).then(() => {
            newsItems = subject.queryAll(newsSelector);
          });
        });

        it('shows news items from the first page', function () {
          expect(newsItems.length).to.be.above(0);
          [...newsItems].forEach(function (news, i) {
            expect(news.querySelector(`a[data-index='${i}']`).querySelector(newsTitleSelector))
              .to.contain.text(newsResponse.news[i].title);
          });
        });

        it('changes the clicked button to active', function () {
          expect([...pageButtonItems][0].className).to.contain('active');
        });

        it('keeps other buttons inactive', function () {
          expect([...pageButtonItems][1].className).to.not.contain('active');
          expect([...pageButtonItems][2].className).to.not.contain('active');
        });

        it('sends a "news_pagination>click" telemetry signal', function () {
          expect(messages.has('sendTelemetry')).to.equal(true);

          const telemetrySignals = messages.get('sendTelemetry');
          let signalExist = false;
          let count = 0;

          expect(telemetrySignals.length).to.be.above(0);
          telemetrySignals.forEach(function (item) {
            if ((item.args[0].type === 'home') &&
                (item.args[0].target === 'news_pagination') &&
                (item.args[0].action === 'click') &&
                (item.args[0].index === 0)) {
                  signalExist = true;
                  count += 1;
            }
          });

          expect(signalExist).to.be.true;
          expect(count).to.equal(1);
        });
      });

      describe('clicking on the second news page button', function () {
        beforeEach(function () {
          [...pageButtonItems][1].click();
          return waitFor(() => (subject.query("a[data-index='3']"))).then(() => {
            newsItems = subject.queryAll(newsSelector);
          });
        });

        it('shows news items from the second page', function () {
          expect(newsItems.length).to.be.above(0);
          [...newsItems].forEach(function (news, i) {
            expect(news.querySelector(`a[data-index='${i + 3}']`).querySelector(newsTitleSelector))
              .to.have.text(newsResponse.news[i + 3].title);
          });
        });

        it('changes the clicked button to active', function () {
          expect([...pageButtonItems][1].className).to.contain('active');
        });

        it('keeps other buttons inactive', function () {
          expect([...pageButtonItems][0].className).to.not.contain('active');
          expect([...pageButtonItems][2].className).to.not.contain('active');
        });

        it('sends a "news_pagination > click" telemetry signal', function () {
          expect(messages.has('sendTelemetry')).to.equal(true);

          const telemetrySignals = messages.get('sendTelemetry');
          let signalExist = false;
          let count = 0;

          expect(telemetrySignals.length).to.be.above(0);
          telemetrySignals.forEach(function (item) {
            if ((item.args[0].type === 'home') &&
                (item.args[0].target === 'news_pagination') &&
                (item.args[0].action === 'click') &&
                (item.args[0].index === 1)) {
                  signalExist = true;
                  count += 1;
            }
          });

          expect(signalExist).to.be.true;
          expect(count).to.equal(1);
        });
      });

      describe('clicking on the third news page button', function () {
        beforeEach(function () {
          [...pageButtonItems][2].click();
          return waitFor(() => (subject.query("a[data-index='6']"))).then(() => {
            newsItems = subject.queryAll(newsSelector);
          });
        });

        it('shows one news item from the third page', function () {
          expect(newsItems[0].querySelector("a[data-index='6']").querySelector(newsTitleSelector))
            .to.have.text(newsResponse.news[6].title);
        });

        it('changes the clicked button to active', function () {
          expect([...pageButtonItems][2].className).to.contain('active');
        });

        it('keeps other buttons inactive', function () {
          expect([...pageButtonItems][0].className).to.not.contain('active');
          expect([...pageButtonItems][1].className).to.not.contain('active');
        });

        it('sends a "news_pagination > click" telemetry signal', function () {
          expect(messages.has('sendTelemetry')).to.equal(true);

          const telemetrySignals = messages.get('sendTelemetry');
          let signalExist = false;
          let count = 0;

          expect(telemetrySignals.length).to.be.above(0);
          telemetrySignals.forEach(function (item) {
            if ((item.args[0].type === 'home') &&
                (item.args[0].target === 'news_pagination') &&
                (item.args[0].action === 'click') &&
                (item.args[0].index === 2)) {
                  signalExist = true;
                  count += 1;
            }
          });

          expect(signalExist).to.be.true;
          expect(count).to.equal(2);
        });
      });
    });
  });
});
