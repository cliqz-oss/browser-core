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

describe('Fresh tab interactions with settings switches', function () {
  const settingsButtonSelector = '#settings-btn';
  const settingsPanelSelector = '#settings-panel';
  const settingsRowSelector = '#settings-panel div.settings-row';
  const settingsSwitchSelector = 'div.switch-container input.switch';
  const mostVisitedAreaSelector = '#section-most-visited';
  const favoritesAreaSelector = '#section-favorites';
  const searchAreaSelector = 'div.search';
  const newsAreaSelector = '#section-news';
  const allHiddenConfig = {
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
          visible: false,
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
  let mostVisitedSwitch;
  let favoritesSwitch;
  let searchSwitch;
  let newsSwitch;
  let settingsPanel;

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
        history: [
          {
            title: `https://this.test.title`,
            id: `this.test.id`,
            url: `https://this.test.domain`,
            displayTitle: `t0`,
            custom: false,
            logo: {
              text: `0`,
              backgroundColor: 'c3043e',
              buttonsClass: 'cliqz-brands-button-1',
              style: 'background-color: #c3043e;color:#fff;'
            }
          }
        ],
        custom: []
      },
    });
    subject.respondsWith({
      module: 'freshtab',
      action: 'getNews',
      response: {
        version: 0,
        news: [
          {
            title: 'Rise in acid attacks prompts calls for widespread first aid training',
            description: 'Doctors are calling for widespread public first aid training on how to immediately help victims of an acid attack following an increase in the number of attacks.',
            displayUrl: 'itv.com',
            logo: {
              backgroundColor: '333333',
              backgroundImage: 'url(https://cdn.cliqz.com/brands-database/database/1473867650984/logos/itv/$.svg)',
              text: 'it',
              color: '#fff',
              buttonsClass: 'cliqz-brands-button-10',
              style: 'background-color: #333333;color:#fff;background-image:url(https://cdn.cliqz.com/brands-database/database/1473867650984/logos/itv/$.svg); text-indent: -10em;'
            },
            url: 'http://www.itv.com/news/2017-08-03/rise-in-acid-attacks-prompts-calls-for-widespread-first-aid-training/',
            type: 'topnews'
          },
          {
            title: 'Trump Says U.S.‘Losing’ Afghan War in Tense Meeting With Generals',
            description: 'President Donald Trump has become increasingly frustrated with his advisers tasked with crafting a new U.S. strategy in Afghanistan and recently suggested firing the war\'s top military commander during a tense meeting at the White House, according to senior administration officials.',
            displayUrl: 'nbcnews.com',
            logo:
            {
              backgroundColor: '333333',
              backgroundImage: 'url(https://cdn.cliqz.com/brands-database/database/1473867650984/logos/nbcnews/$.svg)',
              text: 'nb',
              color: '#fff',
              buttonsClass: 'cliqz-brands-button-10',
              style: 'background-color: #333333;color:#fff;background-image:url(https://cdn.cliqz.com/brands-database/database/1473867650984/logos/nbcnews/$.svg); text-indent: -10em;'
            },
            url: 'http://www.nbcnews.com/news/us-news/trump-says-u-s-losing-afghan-war-tense-meeting-generals-n789006',
            type: 'topnews'
          },
          {
            title: 'Gene editing could wipe out inherited diseases',
            description: 'The highly controversial procedure shows gene editing could prevent thousands of conditions being passed down through generations.',
            displayUrl: 'news.sky.com',
            logo: {
              backgroundColor: '333333',
              backgroundImage: 'url(https://cdn.cliqz.com/brands-database/database/1473867650984/logos/sky/$.svg)',
              text: 'sk',
              color: '#fff',
              buttonsClass: 'cliqz-brands-button-10',
              style: 'background-color: #333333;color:#fff;background-image:url(https://cdn.cliqz.com/brands-database/database/1473867650984/logos/sky/$.svg); text-indent: -10em;'
            },
            url: 'http://news.sky.com/story/scientists-edit-genes-in-human-embryos-to-prevent-inherited-diseases-10971228',
            type: 'topnews'
          }
        ]
      }
    });

  })

  afterEach(function () {
    subject.unload();
    clearIntervals();
  });

  describe('for all areas being hidden', function () {
    beforeEach(function () {
      subject.respondsWith(allHiddenConfig);
      return subject.load().then(() => {
        allSettingsRows = subject.queryAll(settingsRowSelector);
        mostVisitedSwitch = allSettingsRows[1].querySelector(settingsSwitchSelector);
        favoritesSwitch = allSettingsRows[2].querySelector(settingsSwitchSelector);
        searchSwitch = allSettingsRows[3].querySelector(settingsSwitchSelector);
        newsSwitch = allSettingsRows[4].querySelector(settingsSwitchSelector);

        subject.query(settingsButtonSelector).click();
        return waitFor(() => subject.query(settingsPanelSelector).classList.contains('visible'));
      });
    });

    describe('clicking on the most visited switch', function () {
      beforeEach(function () {
        mostVisitedSwitch.click();
        return waitFor(() => subject.query(mostVisitedAreaSelector));
      });

      it('flips the most visited switch to active', function () {
        chai.expect(mostVisitedSwitch).to.have.property('checked', true);
      });

      it('leaves other switches unchanged', function () {
        chai.expect(favoritesSwitch).to.have.property('checked', false);
        chai.expect(searchSwitch).to.have.property('checked', false);
        chai.expect(newsSwitch).to.have.property('checked', false);
      });

      it('keeps the settings panel open', function () {
        chai.expect(subject.query(settingsPanelSelector)).to.exist;
        chai.expect(subject.query(settingsPanelSelector).className).to.contain('visible');
      });

      it('shows the FT area with most visited', function () {
        chai.expect(subject.query(mostVisitedAreaSelector)).to.exist;
      });

      it('leaves other areas hidden', function () {
        chai.expect(subject.query(favoritesAreaSelector)).to.not.exist;
        chai.expect(subject.query(newsAreaSelector)).to.not.exist;
        chai.expect(subject.query(searchAreaSelector)).to.not.exist
      });
    });

    describe('clicking on the favorites switch', function () {
      beforeEach(function () {
        favoritesSwitch.click();
        return waitFor(() => subject.query(favoritesAreaSelector));
      });

      it('flips the favorites switch to active', function () {
        chai.expect(favoritesSwitch).to.have.property('checked', true);
      });

      it('leaves other switches unchanged', function () {
        chai.expect(mostVisitedSwitch).to.have.property('checked', false);
        chai.expect(searchSwitch).to.have.property('checked', false);
        chai.expect(newsSwitch).to.have.property('checked', false);
      });

      it('keeps the settings panel open', function () {
        chai.expect(subject.query(settingsPanelSelector)).to.exist;
        chai.expect(subject.query(settingsPanelSelector).className).to.contain('visible');
      });

      it('shows the FT area with favorites', function () {
        chai.expect(subject.query(favoritesAreaSelector)).to.exist;
      });

      it('leaves other areas hidden', function () {
        chai.expect(subject.query(mostVisitedAreaSelector)).to.not.exist;
        chai.expect(subject.query(newsAreaSelector)).to.not.exist;
        chai.expect(subject.query(searchAreaSelector)).to.not.exist
      });
    });

    describe('clicking on the search switch', function () {
      beforeEach(function () {
        searchSwitch.click();
        return waitFor(() => subject.query(searchAreaSelector));
      });

      it('flips the search switch to active', function () {
        chai.expect(searchSwitch).to.have.property('checked', true);
      });

      it('leaves other switches unchanged', function () {
        chai.expect(mostVisitedSwitch).to.have.property('checked', false);
        chai.expect(favoritesSwitch).to.have.property('checked', false);
        chai.expect(newsSwitch).to.have.property('checked', false);
      });

      it('keeps the settings panel open', function () {
        chai.expect(subject.query(settingsPanelSelector)).to.exist;
        chai.expect(subject.query(settingsPanelSelector).className).to.contain('visible');
      });

      it('shows the FT area with search', function () {
        chai.expect(subject.query(searchAreaSelector)).to.exist;
      });

      it('leaves other areas hidden', function () {
        chai.expect(subject.query(mostVisitedAreaSelector)).to.not.exist;
        chai.expect(subject.query(favoritesAreaSelector)).to.not.exist;
        chai.expect(subject.query(newsAreaSelector)).to.not.exist;
      });
    });

    describe('clicking on the news switch', function () {
      beforeEach(function () {
        newsSwitch.click();
        return waitFor(() => subject.query(newsAreaSelector));
      });

      it('flips the news switch to active', function () {
        chai.expect(newsSwitch).to.have.property('checked', true);
      });

      it('leaves other switches unchanged', function () {
        chai.expect(mostVisitedSwitch).to.have.property('checked', false);
        chai.expect(favoritesSwitch).to.have.property('checked', false);
        chai.expect(searchSwitch).to.have.property('checked', false);
      });

      it('keeps the settings panel open', function () {
        chai.expect(subject.query(settingsPanelSelector)).to.exist;
        chai.expect(subject.query(settingsPanelSelector).className).to.contain('visible');
      });

      it('shows the FT area with news', function () {
        chai.expect(subject.query(newsAreaSelector)).to.exist;
      });

      it('shows news sources seletion', function () {
        const newsDeLanguageSelector = '#news-radio-selector-2';
        const newsIntlLanguageSelector = '#news-radio-selector-3';
        const newsDeLanguage = subject.query(newsDeLanguageSelector);
        const newsIntlLanguage = subject.query(newsIntlLanguageSelector);

        chai.expect(newsDeLanguage).to.exist;
        chai.expect(newsIntlLanguage).to.exist;
      });

      it('leaves other areas hidden', function () {
        chai.expect(subject.query(mostVisitedAreaSelector)).to.not.exist;
        chai.expect(subject.query(favoritesAreaSelector)).to.not.exist;
        chai.expect(subject.query(searchAreaSelector)).to.not.exist
      });
    });

    describe('clicking on all switches', function () {
      beforeEach(function () {
        mostVisitedSwitch.click();
        favoritesSwitch.click();
        searchSwitch.click();
        newsSwitch.click();
        return waitFor(() => subject.query(newsAreaSelector));
      });

      it('shows all areas', function () {
        chai.expect(subject.query(mostVisitedAreaSelector)).to.exist;
        chai.expect(subject.query(favoritesAreaSelector)).to.exist;
        chai.expect(subject.query(searchAreaSelector)).to.exist;
        chai.expect(subject.query(newsAreaSelector)).to.exist;
      });

      it('changes state of all switches', function () {
        chai.expect(mostVisitedSwitch).to.have.property('checked', true);
        chai.expect(favoritesSwitch).to.have.property('checked', true);
        chai.expect(searchSwitch).to.have.property('checked', true);
        chai.expect(newsSwitch).to.have.property('checked', true);
      });

      it('keeps the settings panel open', function () {
        chai.expect(subject.query(settingsPanelSelector)).to.exist;
        chai.expect(subject.query(settingsPanelSelector).className).to.contain('visible');
      });

      describe('then closing and opening the panel', function () {
        beforeEach(function () {
          subject.query('button.close').click();
          return waitFor(() => !subject.query(settingsPanelSelector).classList.contains('visible'))
            .then(function () {
              subject.query(settingsButtonSelector).click();
              return waitFor(() => subject.query(settingsPanelSelector).classList.contains('visible'));
            });
        });

        it('keeps all switches state as active', function () {
          chai.expect(mostVisitedSwitch).to.have.property('checked', true);
          chai.expect(favoritesSwitch).to.have.property('checked', true);
          chai.expect(searchSwitch).to.have.property('checked', true);
          chai.expect(newsSwitch).to.have.property('checked', true);
        });

        it('keeps showing all areas', function () {
          chai.expect(subject.query(mostVisitedAreaSelector)).to.exist;
          chai.expect(subject.query(favoritesAreaSelector)).to.exist;
          chai.expect(subject.query(searchAreaSelector)).to.exist;
          chai.expect(subject.query(newsAreaSelector)).to.exist;
        });
      });
    });
  });

  describe('for all areas being visible', function () {
    beforeEach(function () {
      const allVisibleConfig = clone(allHiddenConfig);
      allVisibleConfig.response.componentsState.historyDials.visible = true;
      allVisibleConfig.response.componentsState.customDials.visible = true;
      allVisibleConfig.response.componentsState.search.visible = true;
      allVisibleConfig.response.componentsState.news.visible = true;
      subject.respondsWith(allVisibleConfig);

      return subject.load().then(() => {
        allSettingsRows = subject.queryAll(settingsRowSelector);
        mostVisitedSwitch = allSettingsRows[1].querySelector(settingsSwitchSelector);
        favoritesSwitch = allSettingsRows[2].querySelector(settingsSwitchSelector);
        searchSwitch = allSettingsRows[3].querySelector(settingsSwitchSelector);
        newsSwitch = allSettingsRows[4].querySelector(settingsSwitchSelector);
        subject.query(settingsButtonSelector).click();
        return waitFor(() => subject.query(settingsPanelSelector));
      });
    });

    describe('clicking on the most visited switch', function () {
      beforeEach(function () {
        mostVisitedSwitch.click();
        return waitFor(() => !subject.query(mostVisitedAreaSelector));
      });

      it('flips the most visited switch to inactive', function () {
        chai.expect(mostVisitedSwitch).to.have.property('checked', false);
      });

      it('leaves other switches unchanged', function () {
        chai.expect(favoritesSwitch).to.have.property('checked', true);
        chai.expect(searchSwitch).to.have.property('checked', true);
        chai.expect(newsSwitch).to.have.property('checked', true);
      });

      it('keeps the settings panel open', function () {
        chai.expect(subject.query(settingsPanelSelector)).to.exist;
        chai.expect(subject.query(settingsPanelSelector).className).to.contain('visible');
      });

      it('hides the FT area with most visited', function () {
        chai.expect(subject.query(mostVisitedAreaSelector)).to.not.exist;
      });

      it('leaves other areas visible', function () {
        chai.expect(subject.query(favoritesAreaSelector)).to.exist;
        chai.expect(subject.query(newsAreaSelector)).to.exist;
        chai.expect(subject.query(searchAreaSelector)).to.exist
      });

    });

    describe('clicking on the favorites switch', function () {
      beforeEach(function () {
        favoritesSwitch.click();
        return waitFor(() => !subject.query(favoritesAreaSelector));
      });

      it('flips the favorites switch to inactive', function () {
        chai.expect(favoritesSwitch).to.have.property('checked', false);
      });

      it('leaves other switches unchanged', function () {
        chai.expect(mostVisitedSwitch).to.have.property('checked', true);
        chai.expect(searchSwitch).to.have.property('checked', true);
        chai.expect(newsSwitch).to.have.property('checked', true);
      });

      it('keeps the settings panel open', function () {
        chai.expect(subject.query(settingsPanelSelector)).to.exist;
        chai.expect(subject.query(settingsPanelSelector).className).to.contain('visible');
      });

      it('hides the FT area with favorites', function () {
        chai.expect(subject.query(favoritesAreaSelector)).to.not.exist;
      });

      it('leaves other areas visible', function () {
        chai.expect(subject.query(mostVisitedAreaSelector)).to.exist;
        chai.expect(subject.query(newsAreaSelector)).to.exist;
        chai.expect(subject.query(searchAreaSelector)).to.exist
      });
    });

    describe('clicking on the search switch', function () {
      beforeEach(function () {
        searchSwitch.click();
        return waitFor(() => !subject.query(searchAreaSelector));
      });

      it('flips the search switch to inactive', function () {
        chai.expect(searchSwitch).to.have.property('checked', false);
      });

      it('leaves other switches unchanged', function () {
        chai.expect(mostVisitedSwitch).to.have.property('checked', true);
        chai.expect(favoritesSwitch).to.have.property('checked', true);
        chai.expect(newsSwitch).to.have.property('checked', true);
      });

      it('keeps the settings panel open', function () {
        chai.expect(subject.query(settingsPanelSelector)).to.exist;
        chai.expect(subject.query(settingsPanelSelector).className).to.contain('visible');
      });

      it('hides the FT area with search', function () {
        chai.expect(subject.query(searchAreaSelector)).to.not.exist;
      });

      it('leaves other areas visible', function () {
        chai.expect(subject.query(mostVisitedAreaSelector)).to.exist;
        chai.expect(subject.query(favoritesAreaSelector)).to.exist;
        chai.expect(subject.query(newsAreaSelector)).to.exist;
      });
    });

    describe('clicking on the news switch', function () {
      beforeEach(function () {
        newsSwitch.click();
        return waitFor(() => !subject.query(newsAreaSelector));
      });

      it('flips the news switch to inactive', function () {
        chai.expect(newsSwitch).to.have.property('checked', false);
      });

      it('leaves other switches unchanged', function () {
        chai.expect(mostVisitedSwitch).to.have.property('checked', true);
        chai.expect(favoritesSwitch).to.have.property('checked', true);
        chai.expect(searchSwitch).to.have.property('checked', true);
      });

      it('keeps the settings panel open', function () {
        chai.expect(subject.query(settingsPanelSelector)).to.exist;
        chai.expect(subject.query(settingsPanelSelector).className).to.contain('visible');
      });

      it('hides the FT area with news', function () {
        chai.expect(subject.query(newsAreaSelector)).to.not.exist;
      });

      it('hides news sources selection', function () {
        const newsDeLanguageSelector = '#news-radio-selector-2';
        const newsIntlLanguageSelector = '#news-radio-selector-3';
        const newsDeLanguage = subject.query(newsDeLanguageSelector);
        const newsIntlLanguage = subject.query(newsIntlLanguageSelector);

        chai.expect(newsDeLanguage).to.not.exist;
        chai.expect(newsIntlLanguage).to.not.exist;
      });

      it('leaves other areas visible', function () {
        chai.expect(subject.query(mostVisitedAreaSelector)).to.exist;
        chai.expect(subject.query(favoritesAreaSelector)).to.exist;
        chai.expect(subject.query(searchAreaSelector)).to.exist
      });
    });

    describe('clicking on all switches', function () {
      beforeEach(function () {
        mostVisitedSwitch.click();
        favoritesSwitch.click();
        searchSwitch.click();
        newsSwitch.click();
        return waitFor(() => !subject.query(newsAreaSelector));
      });

      it('hides all areas', function () {
        chai.expect(subject.query(mostVisitedAreaSelector)).to.not.exist;
        chai.expect(subject.query(favoritesAreaSelector)).to.not.exist;
        chai.expect(subject.query(searchAreaSelector)).to.not.exist;
        chai.expect(subject.query(newsAreaSelector)).to.not.exist;
      });

      it('changes state of all switches', function () {
        chai.expect(mostVisitedSwitch).to.have.property('checked', false);
        chai.expect(favoritesSwitch).to.have.property('checked', false);
        chai.expect(searchSwitch).to.have.property('checked', false);
        chai.expect(newsSwitch).to.have.property('checked', false);
      });

      it('keeps the settings panel open', function () {
        chai.expect(subject.query(settingsPanelSelector)).to.exist;
        chai.expect(subject.query(settingsPanelSelector).className).to.contain('visible');
      });

      describe('then closing and opening the panel', function () {
        beforeEach(function () {
          subject.query('button.close').click();
          return waitFor(() => !subject.query(settingsPanelSelector).classList.contains('visible'))
            .then(function () {
              subject.query(settingsButtonSelector).click();
              return waitFor(() => subject.query(settingsPanelSelector).classList.contains('visible'));
            });
        });

        it('keeps all switches state as inactive', function () {
          chai.expect(mostVisitedSwitch).to.have.property('checked', false);
          chai.expect(favoritesSwitch).to.have.property('checked', false);
          chai.expect(searchSwitch).to.have.property('checked', false);
          chai.expect(newsSwitch).to.have.property('checked', false);
        });

        it('keeps hiding all areas', function () {
          chai.expect(subject.query(mostVisitedAreaSelector)).to.not.exist;
          chai.expect(subject.query(favoritesAreaSelector)).to.not.exist;
          chai.expect(subject.query(searchAreaSelector)).to.not.exist;
          chai.expect(subject.query(newsAreaSelector)).to.not.exist;
        });
      });
    });
  });

  describe('with only news area visible', function () {

    describe('and DE as default source', function () {
      const newsDeLanguageSelector = '#news-radio-selector-2';
      const newsIntlLanguageSelector = '#news-radio-selector-3';
      let newsDeLanguage;
      let newsIntlLanguage;

      beforeEach(function () {
        const newsShownConfigDe = clone(allHiddenConfig);
        newsShownConfigDe.response.componentsState.news.visible = true;
        newsShownConfigDe.response.componentsState.news.preferedCountry = 'de';
        subject.respondsWith(newsShownConfigDe);

        return subject.load().then(() => {
          allSettingsRows = subject.queryAll(settingsRowSelector);
          mostVisitedSwitch = allSettingsRows[1].querySelector(settingsSwitchSelector);
          favoritesSwitch = allSettingsRows[2].querySelector(settingsSwitchSelector);
          searchSwitch = allSettingsRows[3].querySelector(settingsSwitchSelector);
          newsSwitch = allSettingsRows[4].querySelector(settingsSwitchSelector);

          subject.query(settingsButtonSelector).click();
          return waitFor(() => subject.query(settingsPanelSelector).classList.contains('visible'));
        });
      });

      describe('clicking on the other news source', function () {
        beforeEach(function () {
          newsDeLanguage = subject.query(newsDeLanguageSelector);
          newsIntlLanguage = subject.query(newsIntlLanguageSelector);
          subject.query(newsIntlLanguageSelector).click();
          return waitFor(() => newsIntlLanguage.checked);
        });

        it('changes news source selection to INTL', function () {
          chai.expect(newsDeLanguage).to.have.property('checked', false);
          chai.expect(newsIntlLanguage).to.have.property('checked', true);
        });

        it('leaves other panel switches unchanged', function () {
          chai.expect(mostVisitedSwitch).to.have.property('checked', false);
          chai.expect(favoritesSwitch).to.have.property('checked', false);
          chai.expect(searchSwitch).to.have.property('checked', false);
          chai.expect(newsSwitch).to.have.property('checked', true);
        });

        it('keeps the settings panel open', function () {
          chai.expect(subject.query(settingsPanelSelector)).to.exist;
          chai.expect(subject.query(settingsPanelSelector).className).to.contain('visible');
        });

        it('keeps the FT area with news visible', function () {
          chai.expect(subject.query(newsAreaSelector)).to.exist;
        });

        it('leaves other areas hidden', function () {
          chai.expect(subject.query(mostVisitedAreaSelector)).to.not.exist;
          chai.expect(subject.query(favoritesAreaSelector)).to.not.exist;
          chai.expect(subject.query(searchAreaSelector)).to.not.exist;
        });
      });

      describe('clicking on the already selected news source', function () {
        beforeEach(function () {
          newsDeLanguage = subject.query(newsDeLanguageSelector);
          newsIntlLanguage = subject.query(newsIntlLanguageSelector);
          subject.query(newsDeLanguageSelector).click();
          return waitFor(() => newsDeLanguage.checked);
        });

        it('keeps news source selection to DE', function () {
          chai.expect(newsDeLanguage).to.have.property('checked', true);
          chai.expect(newsIntlLanguage).to.have.property('checked', false);
        });

        it('leaves other panel switches unchanged', function () {
          chai.expect(mostVisitedSwitch).to.have.property('checked', false);
          chai.expect(favoritesSwitch).to.have.property('checked', false);
          chai.expect(searchSwitch).to.have.property('checked', false);
          chai.expect(newsSwitch).to.have.property('checked', true);
        });

        it('keeps the settings panel open', function () {
          chai.expect(subject.query(settingsPanelSelector)).to.exist;
          chai.expect(subject.query(settingsPanelSelector).className).to.contain('visible');
        });

        it('keeps the FT area with news visible', function () {
          chai.expect(subject.query(newsAreaSelector)).to.exist;
        });

        it('leaves other areas hidden', function () {
          chai.expect(subject.query(mostVisitedAreaSelector)).to.not.exist;
          chai.expect(subject.query(favoritesAreaSelector)).to.not.exist;
          chai.expect(subject.query(searchAreaSelector)).to.not.exist;
        });
      });

    });

    describe('and INTL as default source', function () {
      const newsDeLanguageSelector = '#news-radio-selector-2';
      const newsIntlLanguageSelector = '#news-radio-selector-3';
      let newsDeLanguage;
      let newsIntlLanguage;

      beforeEach(function () {
        const newsShownConfigIntl = clone(allHiddenConfig);
        newsShownConfigIntl.response.componentsState.news.visible = true;
        newsShownConfigIntl.response.componentsState.news.preferedCountry = 'intl';
        subject.respondsWith(newsShownConfigIntl);

        return subject.load().then(() => {
          allSettingsRows = subject.queryAll(settingsRowSelector);
          mostVisitedSwitch = allSettingsRows[1].querySelector(settingsSwitchSelector);
          favoritesSwitch = allSettingsRows[2].querySelector(settingsSwitchSelector);
          searchSwitch = allSettingsRows[3].querySelector(settingsSwitchSelector);
          newsSwitch = allSettingsRows[4].querySelector(settingsSwitchSelector);

          subject.query(settingsButtonSelector).click();
          return waitFor(() => subject.query(settingsPanelSelector).classList.contains('visible'));
        });
      });

      describe('clicking on the other news source', function () {
        beforeEach(function () {
          newsDeLanguage = subject.query(newsDeLanguageSelector);
          newsIntlLanguage = subject.query(newsIntlLanguageSelector);
          subject.query(newsDeLanguageSelector).click();
          return waitFor(() => newsDeLanguage.checked);
        });

        it('changes news source selection to DE', function () {
          chai.expect(newsDeLanguage).to.have.property('checked', true);
          chai.expect(newsIntlLanguage).to.have.property('checked', false);
        });

        it('leaves other panel switches unchanged', function () {
          chai.expect(mostVisitedSwitch).to.have.property('checked', false);
          chai.expect(favoritesSwitch).to.have.property('checked', false);
          chai.expect(searchSwitch).to.have.property('checked', false);
          chai.expect(newsSwitch).to.have.property('checked', true);
        });

        it('keeps the settings panel open', function () {
          chai.expect(subject.query(settingsPanelSelector)).to.exist;
          chai.expect(subject.query(settingsPanelSelector).className).to.contain('visible');
        });

        it('keeps the FT area with news visible', function () {
          chai.expect(subject.query(newsAreaSelector)).to.exist;
        });

        it('leaves other areas hidden', function () {
          chai.expect(subject.query(mostVisitedAreaSelector)).to.not.exist;
          chai.expect(subject.query(favoritesAreaSelector)).to.not.exist;
          chai.expect(subject.query(searchAreaSelector)).to.not.exist;
        });
      });

      describe('clicking on the already selected news source', function () {
        beforeEach(function () {
          newsDeLanguage = subject.query(newsDeLanguageSelector);
          newsIntlLanguage = subject.query(newsIntlLanguageSelector);
          subject.query(newsIntlLanguageSelector).click();
          return waitFor(() => newsIntlLanguage.checked);
        });

        it('keeps news source selection to INTL', function () {
          chai.expect(newsDeLanguage).to.have.property('checked', false);
          chai.expect(newsIntlLanguage).to.have.property('checked', true);
        });

        it('leaves other panel switches unchanged', function () {
          chai.expect(mostVisitedSwitch).to.have.property('checked', false);
          chai.expect(favoritesSwitch).to.have.property('checked', false);
          chai.expect(searchSwitch).to.have.property('checked', false);
          chai.expect(newsSwitch).to.have.property('checked', true);
        });

        it('keeps the settings panel open', function () {
          chai.expect(subject.query(settingsPanelSelector)).to.exist;
          chai.expect(subject.query(settingsPanelSelector).className).to.contain('visible');
        });

        it('keeps the FT area with news visible', function () {
          chai.expect(subject.query(newsAreaSelector)).to.exist;
        });

        it('leaves other areas hidden', function () {
          chai.expect(subject.query(mostVisitedAreaSelector)).to.not.exist;
          chai.expect(subject.query(favoritesAreaSelector)).to.not.exist;
          chai.expect(subject.query(searchAreaSelector)).to.not.exist;
        });
      });

    });

  });
});
