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

describe('Fresh tab search UI', function () {
  const searchAreaSelector = '#section-url-bar';
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
          visible: true
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
  })

  afterEach(function () {
    subject.unload();
    clearIntervals();
  });

  describe('when set to be visible', function () {
    beforeEach(function () {
      const configVisible = clone(defaultConfig);
      configVisible.response.componentsState.search.visible = true;
      subject.respondsWith(configVisible);
      return subject.load();
    });

    it('has the visibility switch turned on', function () {
      const settingsRowSelector = '#settings-panel div.settings-row';
      const settingsSwitchSelector = 'div.switch-container input.switch';
      const allSettingsRows = subject.queryAll(settingsRowSelector);
      chai.expect(allSettingsRows[3].querySelector(settingsSwitchSelector))
        .to.have.property('checked', true);
    });

    it('has visible area with search input', function () {
      chai.expect(subject.query(searchAreaSelector)).to.exist;
    });
  });

  describe('when set to not be visible', function () {
    beforeEach(function () {
      const configNotVisible = clone(defaultConfig);
      configNotVisible.response.componentsState.search.visible = false;
      subject.respondsWith(configNotVisible);
      return subject.load();
    });

    it('has the visibility switch turned off', function () {
      const settingsRowSelector = '#settings-panel div.settings-row';
      const settingsSwitchSelector = 'div.switch-container input.switch';
      const allSettingsRows = subject.queryAll(settingsRowSelector);
      chai.expect(allSettingsRows[3].querySelector(settingsSwitchSelector))
        .to.have.property('checked', false);
    });

    /* In contrast to other sections' behavior, #section-url-bar does
    not disappear when switched off, but gets empty */
    it('has no visible area search input', function () {
      chai.expect(subject.query(searchAreaSelector).innerHTML).to.be.empty;
    });
  });

  describe('renders search area', function () {
    beforeEach(function () {
      subject.respondsWith(defaultConfig);
      return subject.load();
    });

    it('with an input field', function () {
      const inputSelector = '#section-url-bar div.search input';
      chai.expect(subject.query(inputSelector)).to.exist;
      chai.expect(subject.query(inputSelector).type).to.equal('text');
    });

    it('with a background with Q icon', function () {
      const inputSelector = '#section-url-bar div.search input';
      chai.expect(subject.getComputedStyle(inputSelector).backgroundImage)
        .to.contain('cliqz_icon2_1024.svg');
    });
  });


});
