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

describe('Fresh tab buttons interactions', function () {
  const settingsPanelSelector = '#settings-panel';
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

  beforeEach(function () {
    subject = new Subject();
    subject.respondsWith({
      module: 'core',
      action: 'sendTelemetry',
      response: ''
    });

    subject.respondsWith(defaultConfig);

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
    subject.unload();
    clearIntervals();
  });

  describe('clicking on a home button', function () {
    const settingsRowSelector = '#settings-panel div.settings-row';
    const settingsSwitchSelector = 'div.switch-container input.switch';
    const mostVisitedAreaSelector = '#section-most-visited';
    const favoritesAreaSelector = '#section-favorites';
    const searchAreaSelector = 'div.search';
    const newsAreaSelector = '#section-news';
    let mostVisitedSwitch;
    let favoritesSwitch;
    let searchSwitch;
    let newsSwitch;
    let allSettingsRows;

    describe('when all areas are set to be hidden', function () {
      beforeEach(function () {
        return subject.load().then(() => {
          allSettingsRows = subject.queryAll(settingsRowSelector);
          mostVisitedSwitch = allSettingsRows[1].querySelector(settingsSwitchSelector);
          favoritesSwitch = allSettingsRows[2].querySelector(settingsSwitchSelector);
          searchSwitch = allSettingsRows[3].querySelector(settingsSwitchSelector);
          newsSwitch = allSettingsRows[4].querySelector(settingsSwitchSelector);
        });
      });

      it('loads Fresh tab', function () {
        const homeIconSelector = '#cliqz-home';
        subject.query(homeIconSelector).click();

        const iframes = document.getElementsByTagName('iframe');
        chai.expect(iframes[iframes.length - 1].contentWindow.location.href)
          .to.contain('freshtab/home.html');
      });

      it('keeps the settings panel closed', function () {
        const settingsPanelSelector = '#settings-panel';
        chai.expect(subject.query(settingsPanelSelector)).to.exist;
        chai.expect(subject.query(settingsPanelSelector).className).to.not.contain('visible');
      });

      it('loads Fresh Tab with all areas hidden', function () {
        chai.expect(subject.query(mostVisitedAreaSelector)).to.not.exist;
        chai.expect(subject.query(favoritesAreaSelector)).to.not.exist;
        chai.expect(subject.query(searchAreaSelector)).to.not.exist;
        chai.expect(subject.query(newsAreaSelector)).to.not.exist;
      });

      it('keeps all settings switches state as inactive', function () {
        chai.expect(mostVisitedSwitch).to.have.property('checked', false);
        chai.expect(favoritesSwitch).to.have.property('checked', false);
        chai.expect(searchSwitch).to.have.property('checked', false);
        chai.expect(newsSwitch).to.have.property('checked', false);
      });
    });

    describe('when all areas are set to be visible', function () {
      beforeEach(function () {
        const configVisible = clone(defaultConfig);
        configVisible.response.componentsState.historyDials.visible = true;
        configVisible.response.componentsState.customDials.visible = true;
        configVisible.response.componentsState.search.visible = true;
        configVisible.response.componentsState.news.visible = true;
        subject.respondsWith(configVisible);
        return subject.load().then(() => {
          allSettingsRows = subject.queryAll(settingsRowSelector);
          mostVisitedSwitch = allSettingsRows[1].querySelector(settingsSwitchSelector);
          favoritesSwitch = allSettingsRows[2].querySelector(settingsSwitchSelector);
          searchSwitch = allSettingsRows[3].querySelector(settingsSwitchSelector);
          newsSwitch = allSettingsRows[4].querySelector(settingsSwitchSelector);
        });
      });

      it('loads Fresh tab', function () {
        const homeIconSelector = '#cliqz-home';
        subject.query(homeIconSelector).click();
        return waitFor(() => subject.query(homeIconSelector));

        const iframes = document.getElementsByTagName('iframe');
        chai.expect(iframes[iframes.length - 1].contentWindow.location.href)
          .to.contain('freshtab/home.html');
      });

      it('keeps the settings panel closed', function () {
        const settingsPanelSelector = '#settings-panel';
        chai.expect(subject.query(settingsPanelSelector)).to.exist;
        chai.expect(subject.query(settingsPanelSelector).className).to.not.contain('visible');
      });

      it('loads Fresh Tab with all areas visible', function () {
        chai.expect(subject.query(mostVisitedAreaSelector)).to.exist;
        chai.expect(subject.query(favoritesAreaSelector)).to.exist;
        chai.expect(subject.query(searchAreaSelector)).to.exist;
        chai.expect(subject.query(newsAreaSelector)).to.exist;
      });

      it('keeps all settings switches state as active', function () {
        chai.expect(mostVisitedSwitch).to.have.property('checked', true);
        chai.expect(favoritesSwitch).to.have.property('checked', true);
        chai.expect(searchSwitch).to.have.property('checked', true);
        chai.expect(newsSwitch).to.have.property('checked', true);
      });
    });
  });

  describe('clicking on a settings button', function () {
    beforeEach(function () {
      const settingsButtonSelector = '#settings-btn';
      return subject.load().then(() => {
        subject.query(settingsButtonSelector).click();
        return waitFor(() => subject.query(settingsPanelSelector).classList.contains('visible'));
      });
    });

    it('show settings panel', function () {
      chai.expect(subject.query('#settings-panel')).to.exist;
      chai.expect(subject.query('#settings-panel').className).to.contain('visible');
    });
  });

  describe('clicking on a settings button and then on a close button', function () {
    beforeEach(function () {
      const settingsButtonSelector = '#settings-btn';
      const settingsCloseButtonSelector = "button.close";
      return subject.load().then(() => {
        subject.query(settingsButtonSelector).click();
        return waitFor(() => subject.query(settingsPanelSelector).classList.contains('visible'))
          .then(function () {
            subject.query(settingsCloseButtonSelector).click();
            return waitFor(() => !subject.query(settingsPanelSelector).classList.contains('visible'));
          });
        });
    });

    it('hides settings panel', function () {
      chai.expect(subject.query('#settings-panel')).to.exist;
      chai.expect(subject.query('#settings-panel').className).to.not.contain('visible');
    });
  });
});
