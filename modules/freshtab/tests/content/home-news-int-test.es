function wait(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

let intervals = [];
function registerInterval(interval) {
  intervals.push(interval);
}

function clearIntervals() {
  intervals.forEach(interval => clearInterval(interval));
  intervals = [];
}

function waitFor(fn) {
  var resolver, rejecter, promise = new Promise(function (res, rej) {
    resolver = res;
    rejecter = rej;
  });

  function check() {
    const result = fn();
    if (result) {
      clearInterval(interval);
      resolver(result);
    }
  }

  var interval = setInterval(check, 50);
  check();
  registerInterval(interval);

  return promise;
}

class Subject {
  constructor() {
    this.modules = {};
    const listeners = new Set();
    this.chrome = {
      runtime: {
        onMessage: {
          addListener(listener) {
            listeners.add(listener);
          },
          removeListener(listener) {
            listeners.delete(listener);
          }
        },
        sendMessage: ({ module, action, requestId }) => {
          const response = this.modules[module].actions[action];
          listeners.forEach(l => {
            l({
              response,
              type: 'response',
              requestId,
              source: 'cliqz-content-script'
            });
          })
        }
      },
      i18n: {
        getMessage: k => k,
      }
    }
  }

  load() {
    this.iframe = document.createElement('iframe');
    this.iframe.src = '/build/cliqz@cliqz.com/chrome/content/freshtab/home.html';
    this.iframe.width = 1300;
    this.iframe.height = 500;
    document.body.appendChild(this.iframe)

    return new Promise(resolve => {
      this.iframe.contentWindow.chrome = this.chrome;
      this.iframe.contentWindow.addEventListener('load', () => resolve());
    });
  }

  unload() {
    document.body.removeChild(this.iframe);
  }

  query(selector) {
    return this.iframe.contentWindow.document.querySelector(selector);
  }

  queryAll(selector) {
    return this.iframe.contentWindow.document.querySelectorAll(selector);
  }

  getComputedStyle(selector) {
    return this.iframe.contentWindow.getComputedStyle(this.query(selector));
  }

  respondsWith({ module, action, response, requestId }) {
    this.modules[module] = this.modules[module] || { actions: {} };
    this.modules[module].actions[action] = response;
  }
}

const newsItem = (i) => ({
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
  const newsAreaSelector = '#section-news';
  const defaultConfig = {
    module: 'freshtab',
    action: 'getConfig',
    response: {
      locale: 'en-US',
      newTabUrl: 'chrome://cliqz/content/freshtab/home.html',
      isBrowser: false,
      showNewBrandAlert: false,
      messages: {},
      isHistoryEnabled: true,
      hasActiveNotifications: false,
      componentsState: {
        historyDials: {
          visible: false
        },
        customDials: {
          visible: false
        },
        search: {
          visible: false
        },
        news: {
          visible: true,
          preferedCountry: 'de'
        },
        background: {
          image: 'bg-default'
        }
      }
    },
  };
  const newsResponse = {
      version: 0,
      news: [0, 1, 2, 3, 4, 5, 6].map(newsItem)
    };
  let subject;

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

    subject.respondsWith(defaultConfig);

    return subject.load();
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

      describe('clicking on the first news page button', function () {
        beforeEach(function () {
          [...pageButtonItems][0].click();
          return waitFor(() => (subject.query("a[data-index='0']")))
              .then(function () {
                newsItems = subject.queryAll(newsSelector);
              });
          });

          it('shows news items from the first page', function () {
            [...newsItems].forEach(function (news, i) {
              chai.expect(news.querySelector(`a[data-index='${i}']`).querySelector(newsTitleSelector))
                .to.have.text(newsResponse.news[i].title);
            });
          });

          it('changes the clicked button to active', function () {
            chai.expect([...pageButtonItems][0].className).to.contain('active');
          });

          it('keeps other buttons inactive', function () {
            chai.expect([...pageButtonItems][1].className).to.not.contain('active');
            chai.expect([...pageButtonItems][2].className).to.not.contain('active');
          });
        });

      describe('clicking on the second news page button', function () {
        beforeEach(function () {
          [...pageButtonItems][1].click();
          return waitFor(() => (subject.query("a[data-index='3']")))
              .then(function () {
                newsItems = subject.queryAll(newsSelector);
              });
          });

          it('shows news items from the second page', function () {
            [...newsItems].forEach(function (news, i) {
              chai.expect(news.querySelector(`a[data-index='${i+3}']`).querySelector(newsTitleSelector))
                .to.have.text(newsResponse.news[i+3].title);
            });
          });

          it('changes the clicked button to active', function () {
            chai.expect([...pageButtonItems][1].className).to.contain('active');
          });

          it('keeps other buttons inactive', function () {
            chai.expect([...pageButtonItems][0].className).to.not.contain('active');
            chai.expect([...pageButtonItems][2].className).to.not.contain('active');
          });
      });

      describe('clicking on the second news page button', function () {
          beforeEach(function () {
            [...pageButtonItems][2].click();
            return waitFor(() => (subject.query("a[data-index='6']")))
                .then(function () {
                  newsItems = subject.queryAll(newsSelector);
                });
            });

          it('shows one news item from the third page', function () {
            chai.expect(newsItems[0].querySelector("a[data-index='6']").querySelector(newsTitleSelector))
              .to.have.text(newsResponse.news[6].title);
          });

          it('changes the clicked button to active', function () {
            chai.expect([...pageButtonItems][2].className).to.contain('active');
          });

          it('keeps other buttons inactive', function () {
            chai.expect([...pageButtonItems][0].className).to.not.contain('active');
            chai.expect([...pageButtonItems][1].className).to.not.contain('active');
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
          return waitFor(() => (subject.query("a[data-index='0']")))
              .then(function () {
                newsItems = subject.queryAll(newsSelector);
              });
          });

          it('shows news items from the first page', function () {
            [...newsItems].forEach(function (news, i) {
              chai.expect(news.querySelector(`a[data-index='${i}']`).querySelector(newsTitleSelector))
                .to.have.text(newsResponse.news[i].title);
            });
          });

          it('changes the clicked button to active', function () {
            chai.expect([...pageButtonItems][0].className).to.contain('active');
          });

          it('keeps other buttons inactive', function () {
            chai.expect([...pageButtonItems][1].className).to.not.contain('active');
            chai.expect([...pageButtonItems][2].className).to.not.contain('active');
          });
        });

      describe('clicking on the second news page button', function () {
        beforeEach(function () {
          [...pageButtonItems][1].click();
          return waitFor(() => (subject.query("a[data-index='3']")))
              .then(function () {
                newsItems = subject.queryAll(newsSelector);
              });
          });

          it('shows news items from the second page', function () {
            [...newsItems].forEach(function (news, i) {
              chai.expect(news.querySelector(`a[data-index='${i+3}']`).querySelector(newsTitleSelector))
                .to.have.text(newsResponse.news[i+3].title);
            });
          });

          it('changes the clicked button to active', function () {
            chai.expect([...pageButtonItems][1].className).to.contain('active');
          });

          it('keeps other buttons inactive', function () {
            chai.expect([...pageButtonItems][0].className).to.not.contain('active');
            chai.expect([...pageButtonItems][2].className).to.not.contain('active');
          });
      });

      describe('clicking on the second news page button', function () {
          beforeEach(function () {
            [...pageButtonItems][2].click();
            return waitFor(() => (subject.query("a[data-index='6']")))
                .then(function () {
                  newsItems = subject.queryAll(newsSelector);
                });
            });

          it('shows one news item from the third page', function () {
            chai.expect(newsItems[0].querySelector("a[data-index='6']").querySelector(newsTitleSelector))
              .to.have.text(newsResponse.news[6].title);
          });

          it('changes the clicked button to active', function () {
            chai.expect([...pageButtonItems][2].className).to.contain('active');
          });

          it('keeps other buttons inactive', function () {
            chai.expect([...pageButtonItems][0].className).to.not.contain('active');
            chai.expect([...pageButtonItems][1].className).to.not.contain('active');
          });
      });
    });
  });
});
