/* global getLocaliseString */

const clone = o => JSON.parse(JSON.stringify(o));

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
          // console.log('ACTION CALLED', module, action)
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

  load(frameSize) {
    this.iframe = document.createElement('iframe');
    this.iframe.src = '/build/cliqz@cliqz.com/chrome/content/freshtab/home.html';
    this.iframe.width = frameSize;
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

describe('Fresh tab news UI', function () {
  const newsAreaSelector = '#section-news';
  const defaultConfig = {
    module: 'freshtab',
    action: 'getConfig',
    response: {
      locale: 'en-US',
      newTabUrl: 'resource://cliqz/freshtab/home.html',
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
  const newsResponse = [
    {
      version: 0,
      news: [0, 1, 2].map(newsItem)
    },

    {
      version: 0,
      news: [0, 1, 2, 3].map(newsItem)
    },

    {
      version: 0,
      news: [0, 1, 2, 3, 4].map(newsItem)
    },

    {
      version: 0,
      news: [0, 1, 2, 3, 4, 5].map(newsItem)
    },

    {
      version: 0,
      news: [0, 1, 2, 3, 4, 5, 6].map(newsItem)
    },

    {
      version: 0,
      news: [0, 1, 2, 3, 4, 5, 6, 7].map(newsItem)
    },

    {
      version: 0,
      news: [0, 1, 2, 3, 4, 5, 6, 7, 8].map(newsItem)
    },

    {
      version: 0,
      news: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(newsItem)
    },

    {
      version: 0,
      news: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(newsItem)
    },

    {
      version: 0,
      news: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(newsItem)
    },

    {
      version: 0,
      news: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(newsItem)
    },
  ];
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

    subject.respondsWith(defaultConfig);
  });

  afterEach(function () {
    subject.unload();
    clearIntervals();
  });

  describe('area', function () {
    const settingsRowSelector = '#settings-panel div.settings-row';
    const settingsSwitchSelector = 'div.switch-container input.switch';
    const newsDeLanguageSelector = '#news-radio-selector-2';
    const newsIntlLanguageSelector = '#news-radio-selector-3';

    beforeEach(function () {
      subject.respondsWith({
        module: 'freshtab',
        action: 'getNews',
        response: newsResponse[0]
      });

    });

    describe('when set to be visible', function () {
      beforeEach(function () {
        const configVisible = clone(defaultConfig);
        configVisible.response.componentsState.news.visible = true;
        subject.respondsWith(configVisible);
        return subject.load(1025);
      });

      it('has the visibility switch turned on', function () {
        const allSettingsRows = subject.queryAll(settingsRowSelector);
        chai.expect(allSettingsRows[4].querySelector(settingsSwitchSelector))
          .to.have.property('checked', true);
      });

      it('has visible area with news', function () {
        chai.expect(subject.query(newsAreaSelector)).to.exist;
      });
    });

    describe('when set to not be visible', function () {
      beforeEach(function () {
        const configNotVisible = clone(defaultConfig);
        configNotVisible.response.componentsState.news.visible = false;
        subject.respondsWith(configNotVisible);
        return subject.load(1025);
      });

      it('has the visibility switch turned off', function () {
        const allSettingsRows = subject.queryAll(settingsRowSelector);
        chai.expect(allSettingsRows[4].querySelector(settingsSwitchSelector))
          .to.have.property('checked', false);
      });

      it('does not have visible area with news', function () {
        chai.expect(subject.query(newsAreaSelector)).to.not.exist;
      });
    });

    describe('when set to use German sources', function () {
      beforeEach(function () {
        const configNewsDe = clone(defaultConfig);
        configNewsDe.response.componentsState.news.preferedCountry = 'de';
        subject.respondsWith(configNewsDe);
        return subject.load(1025);
      });

      it('has the German option selected', function () {
        const newsDeLanguage = subject.query(newsDeLanguageSelector);
        const newsIntlLanguage = subject.query(newsIntlLanguageSelector);
        chai.expect(newsDeLanguage).to.have.property('checked', true);
        chai.expect(newsIntlLanguage).to.have.property('checked', false);
      });

    });

    describe('when set to use non-German sources', function () {
      beforeEach(function () {
        const configNewsIntl = clone(defaultConfig);
        configNewsIntl.response.componentsState.news.preferedCountry = 'intl';
        subject.respondsWith(configNewsIntl);
        return subject.load(1025);
      });

      it('has the non-German option selected', function () {
        const newsDeLanguage = subject.query(newsDeLanguageSelector);
        const newsIntlLanguage = subject.query(newsIntlLanguageSelector);
        chai.expect(newsDeLanguage).to.have.property('checked', false);
        chai.expect(newsIntlLanguage).to.have.property('checked', true);
      });
    });
  });

  const resolutionAndTextLimit = {
    900: 160,
    1000: 110,
    1030: 100,
  }
  const resolutions = Object.keys(resolutionAndTextLimit);

  resolutions.forEach(function (screenSize) {
    describe(`when rendered on screen of width ${screenSize}`, function () {

      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(function (i) {
        describe(`with ${i + 3} news items`, function () {
          const amountOfNewsSelector = 'div.box';
          let amountOfItemsPerPage;
          let amountOfPages;
          let amountOfNewsItems;

          beforeEach(function () {
            screenSize = parseInt(screenSize);
            subject.respondsWith({
              module: 'freshtab',
              action: 'getNews',
              response: newsResponse[i]
            });

            return subject.load(screenSize).then(() => {
              if (screenSize === 900) {
                amountOfItemsPerPage = 1;
              } else if (screenSize === 1000) {
                amountOfItemsPerPage = 2;
              } else if (screenSize === 1030) {
                amountOfItemsPerPage = 3;
              }

              amountOfPages = Math.ceil(newsResponse[i].news.length / amountOfItemsPerPage);
              amountOfNewsItems = subject.queryAll(amountOfNewsSelector);
            });
          });

          it(`has correct amount of news pages`, function () {
            const amountOfPagesSelector = 'button.dash';
            const amountOfPagesItems = subject.queryAll(amountOfPagesSelector);

            /* Corner case: 3 news items on a large screen do not
               render button.dash items */
            if ((screenSize === 1030) && (amountOfPagesItems.length === 0)) {
              chai.expect(1).to.equal(amountOfPages);
            } else {
              chai.expect(amountOfPagesItems.length).to.equal(amountOfPages);
            };
          });

          it(`has correct amount of news per page`, function () {
            chai.expect(amountOfNewsItems.length).to.equal(amountOfItemsPerPage);
          });

          describe('renders all news items', function () {
            it('with an existing and correct logo', function () {
              const newsLogoSelector = 'div.box a div.header div.logo';
              const newsLogoItems = subject.queryAll(newsLogoSelector);

              [...newsLogoItems].forEach(function(logo, count) {
                chai.expect(logo).to.exist;
                chai.expect(getComputedStyle(logo).backgroundImage)
                  .to.contain(newsResponse[i].news[count].logo.backgroundImage);
              });
            });

            it('with an existing and correct source domain', function () {
              const newsDomainSelector = 'div.box a div.header div.url';
              const newsDomainItems = subject.queryAll(newsDomainSelector);
              [...newsDomainItems].forEach(function(domain, count) {
                chai.expect(domain).to.exist;
                chai.expect(domain)
                  .to.have.text(newsResponse[i].news[count].displayUrl);
              });
            });

            it('with an existing and correct title', function () {
              const newsTitleSelector = 'div.box a div.news-title';
              const newsTitleItems = subject.queryAll(newsTitleSelector);
              [...newsTitleItems].forEach(function(title, count) {
                chai.expect(title).to.exist;
                chai.expect(title)
                  .to.have.text(newsResponse[i].news[count].title);
              });
            });

            it('with an existing and correct source link', function () {
              const newsLinkSelector = 'div.box a';
              const newsLinkItems = subject.queryAll(newsLinkSelector);
              [...newsLinkItems].forEach(function(link, count) {
                chai.expect(link).to.exist;
                chai.expect(link.href)
                  .to.contain(newsResponse[i].news[count].url);
              });
            });

            it('with an existing and correct description', function () {
              const newsTextSelector = 'div.box a div.news-description';
              const newsTextItems = subject.queryAll(newsTextSelector);
              [...newsTextItems].forEach(function(text, count) {
                chai.expect(text).to.exist;

                /* Slicing removes ellipsis at the end */
                chai.expect(newsResponse[i].news[count].description)
                  .to.contain(text.textContent.slice(0, text.textContent.length - 3));
              });
            });

            it('with a description of correct length', function () {
              const newsTextSelector = 'div.box a div.news-description';
              const newsTextItems = subject.queryAll(newsTextSelector);
              [...newsTextItems].forEach(function(text, count) {

                /* Slicing removes ellipsis at the end */
                chai.expect(text.textContent.slice(0, text.textContent.length - 3).length)
                .lte(resolutionAndTextLimit[screenSize]);
              });
            });

            it('with an existing "Read more" text', function () {
              const newsReadMoreSelector = 'div.box a div.read-more-button';
              const newsReadMoreItems = subject.queryAll(newsReadMoreSelector);
              chai.expect(newsReadMoreItems).to.exist;
            });
          });
        });
      });
    });
  });
});
