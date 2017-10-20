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

  getComputedStyle(selector) {
    return this.iframe.contentWindow.getComputedStyle(this.query(selector));
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

  respondsWith({ module, action, response, requestId }) {
    this.modules[module] = this.modules[module] || { actions: {} };
    this.modules[module].actions[action] = response;
  }
}

describe('Fresh tab background UI', function () {
  const settingsRowSelector = '#settings-panel div.settings-row';
  const settingsSwitchSelector = 'div.switch-container input.switch';
  let allSettingsRows;
  let backgroundSwitch;
  let subject;
  const defaultConfig = {
    module: 'freshtab',
    action: 'getConfig',
    response: {
      locale: 'en-US',
      newTabUrl: 'chrome://cliqz/content/freshtab/home.html',
      isBrowser: false,
      showNewBrandAlert: false,
      messages: {},
      isBlueBackgroundSupported: true,
      isHistoryEnabled: true,
      hasActiveNotifications: false,
      componentsState: {
        historyDials: {
          visible: true
        },
        customDials: {
          visible: false
        },
        search: {
          visible: false
        },
        news: {
          visible: false
        },
        background: {
          image: 'bg-default'
        }
      }
    },
  };

  before(function () {
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
            title: 'https://s3.amazonaws.com/cdncliqz/update/browser/latest.html',
            id: 's3.amazonaws.com/cdncliqz/update/browser/latest.html',
            url: 'https://s3.amazonaws.com/cdncliqz/update/browser/latest.html',
            displayTitle: 's3.amazonaws.com',
            custom: false,
            logo: {
              text: 's3',
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
        news: []
      }
    });

    subject.respondsWith(defaultConfig);
  })

  afterEach(function () {
    clearIntervals();
  });

  context('rendered with default background', function () {
    before(function () {
      const config = clone(defaultConfig);
      config.response.componentsState.background.image = 'bg-default';
      subject.respondsWith(config);
      return subject.load().then(function () {
        allSettingsRows = subject.queryAll(settingsRowSelector);
        backgroundSwitch = allSettingsRows[0].querySelector(settingsSwitchSelector);
      });
    });

    after(function () {
      subject.unload();
    });

    it('with existing and correct class', function () {
      chai.expect(subject.getComputedStyle('body.theme-bg-default')).to.exist;
    });

    it('with correct background color', function () {
      chai.expect(subject.getComputedStyle('body.theme-bg-default').background)
        .to.contain('rgb(247, 247, 247)');
    });

    it('without any bg settings being selected', function () {
      const bsSettingsSelector = 'ul.background-selection-list';
      chai.expect(subject.query(bsSettingsSelector)).to.not.exist;
    });

    it('with background settings switch turned off', function () {
      chai.expect(backgroundSwitch).to.have.property('checked', false);
    });
  });

  context('rendered with dark background', function () {
    before(function () {
      const config = clone(defaultConfig);
      config.response.componentsState.background.image = 'bg-dark';
      subject.respondsWith(config);
      return subject.load().then(function () {
        allSettingsRows = subject.queryAll(settingsRowSelector);
        backgroundSwitch = allSettingsRows[0].querySelector(settingsSwitchSelector);
      });
    });

    after(function () {
      subject.unload();
    });

    it('with existing and correct class', function () {
      chai.expect(subject.getComputedStyle('body.theme-bg-dark')).to.exist;
    });

    it('with correct image source', function () {
      chai.expect(subject.getComputedStyle('body.theme-bg-dark').backgroundImage)
        .to.contain('https://cdn.cliqz.com/extension/newtab/background/dark.jpg');
    });

    it('with correct settings being selected', function () {
      const activeBgImage = 'img[data-bg="bg-dark"]';
      chai.expect(subject.query(activeBgImage).className).to.contain('active');
    });

    it('with background settings switch turned on', function () {
      chai.expect(backgroundSwitch).to.have.property('checked', true);
    });
  });

  context('rendered with light background', function () {
    before(function () {
      const config = clone(defaultConfig);
      config.response.componentsState.background.image = 'bg-light';
      subject.respondsWith(config);
      return subject.load().then(function () {
        allSettingsRows = subject.queryAll(settingsRowSelector);
        backgroundSwitch = allSettingsRows[0].querySelector(settingsSwitchSelector);
      });
    });

    after(function () {
      subject.unload();
    });

    it('with existing and correct class', function () {
      chai.expect(subject.getComputedStyle('body.theme-bg-light')).to.exist;
    });

    it('with correct image source', function () {
      chai.expect(subject.getComputedStyle('body.theme-bg-light').backgroundImage)
        .to.contain('https://cdn.cliqz.com/extension/newtab/background/light.jpg');
    });

    it('with correct settings being selected', function () {
      const activeBgImage = 'img[data-bg="bg-light"]';
      chai.expect(subject.query(activeBgImage).className).to.contain('active');
    });

    it('with background settings switch turned on', function () {
      chai.expect(backgroundSwitch).to.have.property('checked', true);
    });
  });

  context('rendered with blue background', function () {
    before(function () {
      const config = clone(defaultConfig);
      config.response.componentsState.background.image = 'bg-blue';
      subject.respondsWith(config);
      return subject.load().then(function () {
        allSettingsRows = subject.queryAll(settingsRowSelector);
        backgroundSwitch = allSettingsRows[0].querySelector(settingsSwitchSelector);
      });
    });

    after(function () {
      subject.unload();
    });

    it('with existing and correct class', function () {
      chai.expect(subject.getComputedStyle('body.theme-bg-blue')).to.exist;
    });

    it('with correct image source', function () {
      chai.expect(subject.getComputedStyle('body.theme-bg-blue').backgroundImage)
        .to.contain('https://cdn.cliqz.com/extension/newtab/background/alps.jpg');
    });

    it('with correct settings being selected', function () {
      const activeBgImage = 'img[data-bg="bg-blue"]';
      chai.expect(subject.query(activeBgImage).className).to.contain('active');
    });

    it('with background settings switch turned on', function () {
      chai.expect(backgroundSwitch).to.have.property('checked', true);
    });
  })

});
