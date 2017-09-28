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

describe('Fresh tab notification UI', function () {
  const mockMessage = {
    'new-cliqz-tab': {
      id: 'new-cliqz-tab',
      active: true,
      type: 'notification',
      title: 'It’s not only the inner values that count!',
      description: 'Now you can change the style on Cliqz Tab.',
      icon: 'settings-icon_blue.svg',
      cta_text: 'TRY IT NOW',
      cta_url: 'home-action:settings',
      handler: 'MESSAGE_HANDLER_FRESHTAB_MIDDLE',
      position: 'middle'
    }
  };
  const defaultConfig = {
    module: 'freshtab',
    action: 'getConfig',
    response: {
      locale: 'en-US',
      newTabUrl: 'resource://cliqz/freshtab/home.html',
      isBrowser: false,
      showNewBrandAlert: false,
      messages: mockMessage,
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

  context('when one notification message is available', function () {
    beforeEach(function() {
      return subject.load();
    });

    it('the area with notification is visible', function () {
      const notificationAreaSelector = 'div.notification';
      chai.expect(subject.query(notificationAreaSelector)).to.exist;
    });

    describe('renders a notification', function () {
      it('with an existing and correct icon', function () {
        const notificationIconSelector = 'div.notification div.icon';
        chai.expect(subject.query(notificationIconSelector)).to.exist;
        chai.expect(subject.getComputedStyle(notificationIconSelector).backgroundImage)
          .to.contain('settings-icon_blue.svg');
      });

      it('with an existing and correct title', function () {
        const notificationTitleSelector = 'div.notification div.content h1';
        const notificationTitleItem = subject.query(notificationTitleSelector);
        chai.expect(notificationTitleItem).to.exist;
        chai.expect(notificationTitleItem).to.have.text(mockMessage['new-cliqz-tab'].title);
      });

      it('with an existing and correct text', function () {
        const notificationTextSelector = 'div.notification div.content p';
        const notificationTextItem = subject.query(notificationTextSelector);
        chai.expect(notificationTextItem).to.exist;
        chai.expect(notificationTextItem).to.have.text(mockMessage['new-cliqz-tab'].description);
      });

      it('with an existing call to action button', function () {
        const notificationCtaSelector = 'div.notification div.content button.cta-btn';
        const notificationCtaItem = subject.query(notificationCtaSelector);
        chai.expect(notificationCtaItem).to.exist;
        chai.expect(notificationCtaItem).to.have.text(mockMessage['new-cliqz-tab'].cta_text);
      });

      it('with an existing close button', function () {
        const notificationCloseSelector = 'div.notification div.close';
        const notificationCloseItem = subject.query(notificationCloseSelector);
        chai.expect(notificationCloseItem).to.exist;
      });
    });
  });

  context('when no messages are available', function () {
    beforeEach(function () {
      const configNotVisible = clone(defaultConfig);
      configNotVisible.response.messages = [];
      subject.respondsWith(configNotVisible);
      return subject.load();
    });

    it('the area with notification is not visible', function () {
      const notificationAreaSelector = 'div.notification';
      chai.expect(subject.query(notificationAreaSelector)).to.not.exist;
    });

  });

  /* TODO */
  /* context('when two notification messages are available', function () {

  }); */

});
