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
    this.iframe.width = 900;
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

  pushData(data = {}) {
    this.iframe.contentWindow.postMessage(JSON.stringify({
      target: 'cliqz-freshtab',
      origin: 'window',
      message:  {
        action: 'pushData',
        data,
      }
    }), '*');
    return wait(500);
  }

  getComputedStyle(selector) {
    return this.iframe.contentWindow.getComputedStyle(this.query(selector));
  }

  respondsWith({ module, action, response, requestId }) {
    this.modules[module] = this.modules[module] || { actions: {} };
    this.modules[module].actions[action] = response;
  }
}

describe('Fresh tab settings panel UI', function () {
  const settingsRowSelector = '#settings-panel div.settings-row';
  const settingsSwitchSelector = 'div.switch-container input.switch';
  const settingsButtonSelector = '#settings-btn';
  const settingsAreaLabelSelector = 'span.label';
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
      blueTheme: false,
      isBlueBackgroundSupported: false,
      isBlueThemeSupported: false,
      componentsState: {
        historyDials: {
          visible: true
        },
        customDials: {
          visible: true
        },
        search: {
          visible: true
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
  let subject;
  let allSettingsRows;

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
      response: {
        version: 0,
        news: []
      }
    });
  })

  afterEach(function () {
    clearIntervals();
  });

  context('when blue theme is not enabled', function () {
    context('and when blue background is not enabled', function () {
      beforeEach(function () {
        subject.respondsWith(defaultConfig);
        return subject.load().then(() => {
          allSettingsRows = subject.queryAll(settingsRowSelector);
          subject.query(settingsButtonSelector).click();
        });
      });

      afterEach(function () {
        subject.unload();
      });

      it('has an existing and correct header text', function () {
        const settingsHeaderSelector = 'div.settings-header h1';
        const settingsHeaderItem = subject.query(settingsHeaderSelector);
        chai.expect(settingsHeaderItem).to.exist;
        chai.expect(settingsHeaderItem).to.have.text('freshtab.app.settings.header');
      });

      it('has 5 areas', function () {
        chai.expect(allSettingsRows.length).to.equal(5);
      });

      describe('renders background area', function () {
        it('successfully', function () {
          chai.expect(allSettingsRows[0]).to.exist;
        });

        it('with an existing and correct label', function () {
          const backgroundLabelItem = allSettingsRows[0]
            .querySelector(settingsAreaLabelSelector);
          chai.expect(backgroundLabelItem).to.exist;
          chai.expect(backgroundLabelItem).to.have.text('freshtab.app.settings.background.label');
        });

        it('with an existing switch turned off', function () {
          chai.expect(allSettingsRows[0].querySelector('input.switch')).to.exist;
          chai.expect(allSettingsRows[0].querySelector('input.switch'))
            .to.have.property('checked', false);
        });

        it('with background choices hidden', function () {
          chai.expect(subject
            .queryAll('ul.background-selection-list li').length).to.equal(0);
        });
      });

      describe('renders most visited area', function () {
        it('successfully', function () {
          chai.expect(allSettingsRows[1]).to.exist;
        });

        it('with an existing and correct label', function () {
          const mostVisitedLabelItem = allSettingsRows[1]
            .querySelector(settingsAreaLabelSelector);
          chai.expect(mostVisitedLabelItem).to.exist;
          chai.expect(mostVisitedLabelItem).to.have.text('freshtab.app.settings.most-visited.label');
        });

        it('with an existing switch turned on', function () {
          chai.expect(allSettingsRows[1].querySelector('input.switch')).to.exist;
          chai.expect(allSettingsRows[1].querySelector('input.switch'))
            .to.have.property('checked', true);
        });

        it('with an existing restore button', function () {
          chai.expect(allSettingsRows[1].querySelector('button.link')).to.exist;
        });
      });

      describe('renders favorites area', function () {
        it('successfully', function () {
          chai.expect(allSettingsRows[2]).to.exist;
        });

        it('with an existing and correct label', function () {
          const favoritesLabelItem = allSettingsRows[2]
            .querySelector(settingsAreaLabelSelector);
          chai.expect(favoritesLabelItem).to.exist;
          chai.expect(favoritesLabelItem).to.have.text('freshtab.app.settings.favorites.label');
        });

        it('with an existing switch turned on', function () {
          chai.expect(allSettingsRows[2].querySelector('input.switch')).to.exist;
          chai.expect(allSettingsRows[2].querySelector('input.switch'))
            .to.have.property('checked', true);
        });
      });

      describe('renders search area', function () {
        it('successfully', function () {
          chai.expect(allSettingsRows[3]).to.exist;
        });

        it('with an existing and correct label', function () {
          const searchLabelItem = allSettingsRows[3]
            .querySelector(settingsAreaLabelSelector);
          chai.expect(searchLabelItem).to.exist;
          chai.expect(searchLabelItem).to.have.text('freshtab.app.settings.search.label');
        });

        it('with an existing switch turned on', function () {
          chai.expect(allSettingsRows[3].querySelector('input.switch')).to.exist;
          chai.expect(allSettingsRows[3].querySelector('input.switch'))
            .to.have.property('checked', true);
        });
      });

      describe('renders news area', function () {
        const newsSourceSelector = 'div.radio';
        let newsSourceItems;

        beforeEach(function () {
          newsSourceItems = allSettingsRows[4].querySelectorAll(newsSourceSelector);
        });

        it('successfully', function () {
          chai.expect(allSettingsRows[4]).to.exist;
        });

        it('with an existing and correct label', function () {
          const newsLabelItem = allSettingsRows[4]
            .querySelector(settingsAreaLabelSelector);
          chai.expect(newsLabelItem).to.exist;
          chai.expect(newsLabelItem).to.have.text('freshtab.app.settings.news.label');
        });

        it('with an existing switch turned on', function () {
          chai.expect(allSettingsRows[4].querySelector('input.switch')).to.exist;
          chai.expect(allSettingsRows[4].querySelector('input.switch'))
            .to.have.property('checked', true);
        });

        it('with 3 source options', function () {
          chai.expect(newsSourceItems.length).to.equal(3);
        });

        it('with source options with existing and correct labels', function () {
          const newsSourceLabelSelector = 'label';
          chai.expect(newsSourceItems[0].querySelector(newsSourceLabelSelector)).to.exist;
          chai.expect(newsSourceItems[0].querySelector(newsSourceLabelSelector))
            .to.have.text('freshtab.app.settings.news.language.de');

          chai.expect(newsSourceItems[1].querySelector(newsSourceLabelSelector)).to.exist;
          chai.expect(newsSourceItems[1].querySelector(newsSourceLabelSelector))
            .to.have.text('freshtab.app.settings.news.language.fr');

          chai.expect(newsSourceItems[2].querySelector(newsSourceLabelSelector)).to.exist;
          chai.expect(newsSourceItems[2].querySelector(newsSourceLabelSelector))
            .to.have.text('freshtab.app.settings.news.language.en');
        });
      });
    });

    context('and when blue background is enabled', function () {
      beforeEach(function () {
        const blueBgConfig = clone(defaultConfig);
        blueBgConfig.response.isBlueBackgroundSupported = true;
        subject.respondsWith(blueBgConfig);
        return subject.load().then(() => {
          allSettingsRows = subject.queryAll(settingsRowSelector);
          subject.query(settingsButtonSelector).click();
        });
      });

      afterEach(function () {
        subject.unload();
      });

      it('has an existing and correct header text', function () {
        const settingsHeaderSelector = 'div.settings-header h1';
        const settingsHeaderItem = subject.query(settingsHeaderSelector);
        chai.expect(settingsHeaderItem).to.exist;
        chai.expect(settingsHeaderItem).to.have.text('freshtab.app.settings.header');
      });

      it('has 5 areas', function () {
        chai.expect(allSettingsRows.length).to.equal(5);
      });

      describe('renders background area', function () {
        it('successfully', function () {
          chai.expect(allSettingsRows[0]).to.exist;
        });

        it('with an existing and correct label', function () {
          const backgroundLabelItem = allSettingsRows[0]
            .querySelector(settingsAreaLabelSelector);
          chai.expect(backgroundLabelItem).to.exist;
          chai.expect(backgroundLabelItem).to.have.text('freshtab.app.settings.background.label');
        });

        it('with an existing switch turned off', function () {
          chai.expect(allSettingsRows[0].querySelector('input.switch')).to.exist;
          chai.expect(allSettingsRows[0].querySelector('input.switch'))
            .to.have.property('checked', false);
        });

        it('with background choices hidden', function () {
          chai.expect(subject
            .queryAll('ul.background-selection-list li').length).to.equal(0);
        });
      });

      describe('renders most visited area', function () {
        it('successfully', function () {
          chai.expect(allSettingsRows[1]).to.exist;
        });

        it('with an existing and correct label', function () {
          const mostVisitedLabelItem = allSettingsRows[1]
            .querySelector(settingsAreaLabelSelector);
          chai.expect(mostVisitedLabelItem).to.exist;
          chai.expect(mostVisitedLabelItem).to.have.text('freshtab.app.settings.most-visited.label');
        });

        it('with an existing switch', function () {
          chai.expect(allSettingsRows[1].querySelector('input.switch')).to.exist;
        });

        it('with an existing restore button', function () {
          chai.expect(allSettingsRows[1].querySelector('button.link')).to.exist;
        });
      });

      describe('renders favorites area', function () {
        it('successfully', function () {
          chai.expect(allSettingsRows[2]).to.exist;
        });

        it('with an existing and correct label', function () {
          const favoritesLabelItem = allSettingsRows[2]
            .querySelector(settingsAreaLabelSelector);
          chai.expect(favoritesLabelItem).to.exist;
          chai.expect(favoritesLabelItem).to.have.text('freshtab.app.settings.favorites.label');
        });

        it('with an existing switch', function () {
          chai.expect(allSettingsRows[2].querySelector('input.switch')).to.exist;
        });
      });

      describe('renders search area', function () {
        it('successfully', function () {
          chai.expect(allSettingsRows[3]).to.exist;
        });

        it('with an existing and correct label', function () {
          const searchLabelItem = allSettingsRows[3]
            .querySelector(settingsAreaLabelSelector);
          chai.expect(searchLabelItem).to.exist;
          chai.expect(searchLabelItem).to.have.text('freshtab.app.settings.search.label');
        });

        it('with an existing switch', function () {
          chai.expect(allSettingsRows[3].querySelector('input.switch')).to.exist;
        });
      });

      describe('renders news area', function () {
        const newsSourceSelector = 'div.radio';
        let newsSourceItems;

        beforeEach(function () {
          newsSourceItems = allSettingsRows[4].querySelectorAll(newsSourceSelector);
        });

        it('successfully', function () {
          chai.expect(allSettingsRows[4]).to.exist;
        });

        it('with an existing and correct label', function () {
          const newsLabelItem = allSettingsRows[4]
            .querySelector(settingsAreaLabelSelector);
          chai.expect(newsLabelItem).to.exist;
          chai.expect(newsLabelItem).to.have.text('freshtab.app.settings.news.label');
        });

        it('with an existing switch turned on', function () {
          chai.expect(allSettingsRows[4].querySelector('input.switch')).to.exist;
          chai.expect(allSettingsRows[4].querySelector('input.switch'))
            .to.have.property('checked', true);
        });

        it('with 3 source options', function () {
          chai.expect(newsSourceItems.length).to.equal(3);
        });

        it('with source options with existing and correct labels', function () {
          const newsSourceLabelSelector = 'label';
          chai.expect(newsSourceItems[0].querySelector(newsSourceLabelSelector)).to.exist;
          chai.expect(newsSourceItems[0].querySelector(newsSourceLabelSelector))
            .to.have.text('freshtab.app.settings.news.language.de');

          chai.expect(newsSourceItems[1].querySelector(newsSourceLabelSelector)).to.exist;
          chai.expect(newsSourceItems[1].querySelector(newsSourceLabelSelector))
            .to.have.text('freshtab.app.settings.news.language.fr');

          chai.expect(newsSourceItems[2].querySelector(newsSourceLabelSelector)).to.exist;
          chai.expect(newsSourceItems[2].querySelector(newsSourceLabelSelector))
            .to.have.text('freshtab.app.settings.news.language.en');
        });
      });
    });
  });

  context('when blue theme is enabled', function () {
    context('and when blue background is not enabled', function () {
      beforeEach(function () {
        const blueThemeConfig = clone(defaultConfig);
        blueThemeConfig.response.isBlueThemeSupported = true;
        blueThemeConfig.response.blueTheme = true;
        subject.respondsWith(blueThemeConfig);
        return subject.load().then(() => {
          allSettingsRows = subject.queryAll(settingsRowSelector);
          subject.query(settingsButtonSelector).click();
        });
      });

      afterEach(function () {
        subject.unload();
      });

      it('has an existing and correct header text', function () {
        const settingsHeaderSelector = 'div.settings-header h1';
        const settingsHeaderItem = subject.query(settingsHeaderSelector);
        chai.expect(settingsHeaderItem).to.exist;
        chai.expect(settingsHeaderItem).to.have.text('freshtab.app.settings.header');
      });

      it('has 6 areas', function () {
        chai.expect(allSettingsRows.length).to.equal(6);
      });

      describe('renders Cliqz theme area', function () {
        it('successfully', function () {
          chai.expect(allSettingsRows[0]).to.exist;
        });

        it('with an existing and correct label', function () {
          const themeLabelItem = allSettingsRows[0]
            .querySelector(settingsAreaLabelSelector);
          chai.expect(themeLabelItem).to.exist;
          chai.expect(themeLabelItem).to.have.text('Cliqz Theme');
        });

        it('with an existing switch turned on', function () {
          chai.expect(allSettingsRows[0].querySelector('input.switch')).to.exist;
          chai.expect(allSettingsRows[0].querySelector('input.switch'))
            .to.have.property('checked', true);
        });
      });

      describe('renders background area', function () {
        it('successfully', function () {
          chai.expect(allSettingsRows[1]).to.exist;
        });

        it('with an existing and correct label', function () {
          const backgroundLabelItem = allSettingsRows[1]
            .querySelector(settingsAreaLabelSelector);
          chai.expect(backgroundLabelItem).to.exist;
          chai.expect(backgroundLabelItem).to.have.text('freshtab.app.settings.background.label');
        });

        it('with an existing switch turned off', function () {
          chai.expect(allSettingsRows[1].querySelector('input.switch')).to.exist;
          chai.expect(allSettingsRows[1].querySelector('input.switch'))
            .to.have.property('checked', false);
        });

        it('with background choices hidden', function () {
          chai.expect(subject
            .queryAll('ul.background-selection-list li').length).to.equal(0);
        });
      });

      describe('renders most visited area', function () {
        it('successfully', function () {
          chai.expect(allSettingsRows[2]).to.exist;
        });

        it('with an existing and correct label', function () {
          const mostVisitedLabelItem = allSettingsRows[2]
            .querySelector(settingsAreaLabelSelector);
          chai.expect(mostVisitedLabelItem).to.exist;
          chai.expect(mostVisitedLabelItem).to.have.text('freshtab.app.settings.most-visited.label');
        });

        it('with an existing switch turned on', function () {
          chai.expect(allSettingsRows[2].querySelector('input.switch')).to.exist;
          chai.expect(allSettingsRows[2].querySelector('input.switch'))
            .to.have.property('checked', true);
        });

        it('with an existing restore button', function () {
          chai.expect(allSettingsRows[2].querySelector('button.link')).to.exist;
        });
      });

      describe('renders favorites area', function () {
        it('successfully', function () {
          chai.expect(allSettingsRows[3]).to.exist;
        });

        it('with an existing and correct label', function () {
          const favoritesLabelItem = allSettingsRows[3]
            .querySelector(settingsAreaLabelSelector);
          chai.expect(favoritesLabelItem).to.exist;
          chai.expect(favoritesLabelItem).to.have.text('freshtab.app.settings.favorites.label');
        });

        it('with an existing switch turned on', function () {
          chai.expect(allSettingsRows[3].querySelector('input.switch')).to.exist;
          chai.expect(allSettingsRows[3].querySelector('input.switch'))
            .to.have.property('checked', true);
        });
      });

      describe('renders search area', function () {
        it('successfully', function () {
          chai.expect(allSettingsRows[4]).to.exist;
        });

        it('with an existing and correct label', function () {
          const searchLabelItem = allSettingsRows[4]
            .querySelector(settingsAreaLabelSelector);
          chai.expect(searchLabelItem).to.exist;
          chai.expect(searchLabelItem).to.have.text('freshtab.app.settings.search.label');
        });

        it('with an existing switch turned on', function () {
          chai.expect(allSettingsRows[4].querySelector('input.switch')).to.exist;
          chai.expect(allSettingsRows[4].querySelector('input.switch'))
            .to.have.property('checked', true);
        });
      });

      describe('renders news area', function () {
        const newsSourceSelector = 'div.radio';
        let newsSourceItems;

        beforeEach(function () {
          newsSourceItems = allSettingsRows[5].querySelectorAll(newsSourceSelector);
        });

        it('successfully', function () {
          chai.expect(allSettingsRows[5]).to.exist;
        });

        it('with an existing and correct label', function () {
          const newsLabelItem = allSettingsRows[5]
            .querySelector(settingsAreaLabelSelector);
          chai.expect(newsLabelItem).to.exist;
          chai.expect(newsLabelItem).to.have.text('freshtab.app.settings.news.label');
        });

        it('with an existing switch turned on', function () {
          chai.expect(allSettingsRows[5].querySelector('input.switch')).to.exist;
          chai.expect(allSettingsRows[5].querySelector('input.switch'))
            .to.have.property('checked', true);
        });

        it('with 3 source options', function () {
          chai.expect(newsSourceItems.length).to.equal(3);
        });

        it('with source options with existing and correct labels', function () {
          const newsSourceLabelSelector = 'label';
          chai.expect(newsSourceItems[0].querySelector(newsSourceLabelSelector)).to.exist;
          chai.expect(newsSourceItems[0].querySelector(newsSourceLabelSelector))
            .to.have.text('freshtab.app.settings.news.language.de');

          chai.expect(newsSourceItems[1].querySelector(newsSourceLabelSelector)).to.exist;
          chai.expect(newsSourceItems[1].querySelector(newsSourceLabelSelector))
            .to.have.text('freshtab.app.settings.news.language.fr');

          chai.expect(newsSourceItems[2].querySelector(newsSourceLabelSelector)).to.exist;
          chai.expect(newsSourceItems[2].querySelector(newsSourceLabelSelector))
            .to.have.text('freshtab.app.settings.news.language.en');
        });
      });
    });

    context('and when blue background is enabled', function () {
      beforeEach(function () {
        const blueBgThemeConfig = clone(defaultConfig);
        blueBgThemeConfig.response.isBlueBackgroundSupported = true;
        blueBgThemeConfig.response.isBlueThemeSupported = true;
        blueBgThemeConfig.response.blueTheme = true;
        blueBgThemeConfig.response.componentsState.background.image = 'bg-blue';
        subject.respondsWith(blueBgThemeConfig);
        return subject.load().then(() => {
          allSettingsRows = subject.queryAll(settingsRowSelector);
          subject.query(settingsButtonSelector).click();
        });
      });

      afterEach(function () {
        subject.unload();
      });

      it('has an existing and correct header text', function () {
        const settingsHeaderSelector = 'div.settings-header h1';
        const settingsHeaderItem = subject.query(settingsHeaderSelector);
        chai.expect(settingsHeaderItem).to.exist;
        chai.expect(settingsHeaderItem).to.have.text('freshtab.app.settings.header');
      });

      it('has 7 areas', function () {
        chai.expect(allSettingsRows.length).to.equal(7);
      });

      describe('renders Cliqz theme area', function () {
        it('successfully', function () {
          chai.expect(allSettingsRows[0]).to.exist;
        });

        it('with an existing and correct label', function () {
          const themeLabelItem = allSettingsRows[0]
            .querySelector(settingsAreaLabelSelector);
          chai.expect(themeLabelItem).to.exist;
          chai.expect(themeLabelItem).to.have.text('Cliqz Theme');
        });

        it('with an existing switch turned on', function () {
          chai.expect(allSettingsRows[0].querySelector('input.switch')).to.exist;
          chai.expect(allSettingsRows[0].querySelector('input.switch'))
            .to.have.property('checked', true);
        });
      });

      describe('renders background area', function () {
        it('successfully', function () {
          chai.expect(allSettingsRows[1]).to.exist;
        });

        it('with an existing and correct label', function () {
          const backgroundLabelItem = allSettingsRows[1]
            .querySelector(settingsAreaLabelSelector);
          chai.expect(backgroundLabelItem).to.exist;
          chai.expect(backgroundLabelItem).to.have.text('freshtab.app.settings.background.label');
        });

        it('with an existing switch turned on', function () {
          chai.expect(allSettingsRows[1].querySelector('input.switch')).to.exist;
          chai.expect(allSettingsRows[1].querySelector('input.switch'))
            .to.have.property('checked', true);
        });

        it('with three visible background choices', function () {
          chai.expect(allSettingsRows[2]
            .querySelectorAll('ul.background-selection-list li').length).to.equal(3);
        });

        it('with the first background choice being selected', function () {
          chai.expect(allSettingsRows[2]
            .querySelectorAll('ul.background-selection-list li img')[0].className)
            .to.contain('active');
        });
      });

      describe('renders most visited area', function () {
        it('successfully', function () {
          chai.expect(allSettingsRows[3]).to.exist;
        });

        it('with an existing and correct label', function () {
          const mostVisitedLabelItem = allSettingsRows[3]
            .querySelector(settingsAreaLabelSelector);
          chai.expect(mostVisitedLabelItem).to.exist;
          chai.expect(mostVisitedLabelItem).to.have.text('freshtab.app.settings.most-visited.label');
        });

        it('with an existing switch turned on', function () {
          chai.expect(allSettingsRows[3].querySelector('input.switch')).to.exist;
          chai.expect(allSettingsRows[3].querySelector('input.switch'))
            .to.have.property('checked', true);
        });

        it('with an existing restore button', function () {
          chai.expect(allSettingsRows[3].querySelector('button.link')).to.exist;
        });
      });

      describe('renders favorites area', function () {
        it('successfully', function () {
          chai.expect(allSettingsRows[4]).to.exist;
        });

        it('with an existing and correct label', function () {
          const favoritesLabelItem = allSettingsRows[4]
            .querySelector(settingsAreaLabelSelector);
          chai.expect(favoritesLabelItem).to.exist;
          chai.expect(favoritesLabelItem).to.have.text('freshtab.app.settings.favorites.label');
        });

        it('with an existing switch turned on', function () {
          chai.expect(allSettingsRows[4].querySelector('input.switch')).to.exist;
          chai.expect(allSettingsRows[4].querySelector('input.switch'))
            .to.have.property('checked', true);
        });
      });

      describe('renders search area', function () {
        it('successfully', function () {
          chai.expect(allSettingsRows[5]).to.exist;
        });

        it('with an existing and correct label', function () {
          const searchLabelItem = allSettingsRows[5]
            .querySelector(settingsAreaLabelSelector);
          chai.expect(searchLabelItem).to.exist;
          chai.expect(searchLabelItem).to.have.text('freshtab.app.settings.search.label');
        });

        it('with an existing switch turned on', function () {
          chai.expect(allSettingsRows[5].querySelector('input.switch')).to.exist;
          chai.expect(allSettingsRows[5].querySelector('input.switch'))
            .to.have.property('checked', true);
        });
      });

      describe('renders news area', function () {
        const newsSourceSelector = 'div.radio';
        let newsSourceItems;

        beforeEach(function () {
          newsSourceItems = allSettingsRows[6].querySelectorAll(newsSourceSelector);
        });

        it('successfully', function () {
          chai.expect(allSettingsRows[6]).to.exist;
        });

        it('with an existing and correct label', function () {
          const newsLabelItem = allSettingsRows[6]
            .querySelector(settingsAreaLabelSelector);
          chai.expect(newsLabelItem).to.exist;
          chai.expect(newsLabelItem).to.have.text('freshtab.app.settings.news.label');
        });

        it('with an existing switch turned on', function () {
          chai.expect(allSettingsRows[6].querySelector('input.switch')).to.exist;
          chai.expect(allSettingsRows[6].querySelector('input.switch'))
            .to.have.property('checked', true);
        });

        it('with 3 source options', function () {
          chai.expect(newsSourceItems.length).to.equal(3);
        });

        it('with source options with existing and correct labels', function () {
          const newsSourceLabelSelector = 'label';
          chai.expect(newsSourceItems[0].querySelector(newsSourceLabelSelector)).to.exist;
          chai.expect(newsSourceItems[0].querySelector(newsSourceLabelSelector))
            .to.have.text('freshtab.app.settings.news.language.de');

          chai.expect(newsSourceItems[1].querySelector(newsSourceLabelSelector)).to.exist;
          chai.expect(newsSourceItems[1].querySelector(newsSourceLabelSelector))
            .to.have.text('freshtab.app.settings.news.language.fr');

          chai.expect(newsSourceItems[2].querySelector(newsSourceLabelSelector)).to.exist;
          chai.expect(newsSourceItems[2].querySelector(newsSourceLabelSelector))
            .to.have.text('freshtab.app.settings.news.language.en');
        });
      });
    });
  });

});
