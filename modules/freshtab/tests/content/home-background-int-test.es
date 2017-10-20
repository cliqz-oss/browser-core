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
              action,
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

describe('Fresh tab background interactions', function () {
  const blueBgSelector = 'img[data-bg="bg-blue"]';
  const darkBgSelector = 'img[data-bg="bg-dark"]';
  const lightBgSelector = 'img[data-bg="bg-light"]';
  const bgSwitch = '.switch[name="background"]';

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
  let messages;
  let listener;

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

  describe('clicking on a dark icon', function () {

    beforeEach(function () {
      return subject.load().then(() => {
        // Keep track of received messages
        messages = new Map();
        listener = function (msg) {
          if (!messages.has(msg.action)) {
            messages.set(msg.action, []);
          }

          messages.get(msg.action).push(msg);
        };
        subject.chrome.runtime.onMessage.addListener(listener);

        subject.query(bgSwitch).click();
        subject.query(darkBgSelector).click();
        return waitFor(() => subject.query('body.theme-bg-dark'));
      });
    });

    afterEach(function () {
      subject.chrome.runtime.onMessage.removeListener(listener);
    });

    it('changes bg to dark', function () {
      chai.expect(subject.query('body').className).to.contain('theme-bg-dark');
    });

    it('changes settings selection to dark bg', function () {
      chai.expect(subject.query(darkBgSelector).className).to.contain('active');
      chai.expect(subject.query(lightBgSelector).className).to.not.contain('active');
      chai.expect(subject.query(blueBgSelector).className).to.not.contain('active');
    });

    it('sends a "saveBackgroundImage" message twice', function () {
      chai.expect(messages.has('saveBackgroundImage')).to.equal(true);
      chai.expect(messages.get('saveBackgroundImage').length).to.equal(2);
    });
  });

  describe('clicking on a light icon', function () {

    beforeEach(function () {
      return subject.load().then(() => {
        // Keep track of received messages
        messages = new Map();
        listener = function (msg) {
          if (!messages.has(msg.action)) {
            messages.set(msg.action, []);
          }

          messages.get(msg.action).push(msg);
        };
        subject.chrome.runtime.onMessage.addListener(listener);

        subject.query(bgSwitch).click();
        subject.query(lightBgSelector).click();
        return waitFor(() => subject.query('body.theme-bg-light'));
      });
    });

    afterEach(function () {
      subject.chrome.runtime.onMessage.removeListener(listener);
    });

    it('changes bg to light', function () {
      chai.expect(subject.query('body').className).to.contain('theme-bg-light');
    });

    it('changes settings selection to light bg', function () {
      chai.expect(subject.query(darkBgSelector).className).to.not.contain('active');
      chai.expect(subject.query(lightBgSelector).className).to.contain('active');
      chai.expect(subject.query(blueBgSelector).className).to.not.contain('active');
    });

    it('sends a "saveBackgroundImage" message twice', function () {
      chai.expect(messages.has('saveBackgroundImage')).to.equal(true);
      chai.expect(messages.get('saveBackgroundImage').length).to.equal(2);
    });

  });


  describe('clicking on a blue icon', function () {

    beforeEach(function () {
      return subject.load().then(() => {
        // Keep track of received messages
        messages = new Map();
        listener = function (msg) {
          if (!messages.has(msg.action)) {
            messages.set(msg.action, []);
          }

          messages.get(msg.action).push(msg);
        };
        subject.chrome.runtime.onMessage.addListener(listener);
        subject.query(bgSwitch).click();
        subject.query(blueBgSelector).click();
        return waitFor(() => subject.query('body.theme-bg-blue'));

      });
    });

    afterEach(function () {
      subject.chrome.runtime.onMessage.removeListener(listener);
    });

    it('changes bg to blue', function () {
      chai.expect(subject.query('body').className).to.contain('theme-bg-blue');
    });

    it('changes settings selection to blue bg', function () {
      chai.expect(subject.query(darkBgSelector).className).to.not.contain('active');
      chai.expect(subject.query(lightBgSelector).className).to.not.contain('active');
      chai.expect(subject.query(blueBgSelector).className).to.contain('active');
    });

    it('sends a "saveBackgroundImage" message twice', function () {
      chai.expect(messages.has('saveBackgroundImage')).to.equal(true);
      chai.expect(messages.get('saveBackgroundImage').length).to.equal(2);
    });
  });

});
