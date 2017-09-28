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

describe('Fresh tab interactions with notifications', function () {
  const notificationAreaSelector = 'div.notification';
  const settingsPanelSelector = '#settings-panel';
  const someMessage = {
    singleNotification: {
      id: 'singleNotification',
      active: true,
      type: 'notification',
      title: 'Title 1',
      description: 'Description 1',
      icon: 'settings-icon_blue.svg',
      cta_text: 'TRY IT NOW 1',
      cta_url: 'home-action:settings',
      handler: 'MESSAGE_HANDLER_FRESHTAB_MIDDLE',
      position: 'middle'
    },
  };
  const otherMessage = {
      id: 'doubleNotification',
      active: true,
      type: 'notification',
      title: 'Title 2',
      description: 'Description 2',
      icon: 'settings-icon_blue.svg',
      cta_text: 'TRY IT NOW 2',
      cta_url: 'home-action:settings',
      handler: 'MESSAGE_HANDLER_FRESHTAB_MIDDLE',
      position: 'middle'
  };
  const defaultConfig = {
    module: 'freshtab',
    action: 'getConfig',
    response: {
      locale: 'en-US',
      newTabUrl: 'resource://cliqz/freshtab/home.html',
      isBrowser: false,
      showNewBrandAlert: false,
      messages: someMessage,
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

    describe('clicking on a notification icon', function () {
      const notificationIconSelector = 'div.notification div.icon';

      beforeEach(function () {
        subject.query(notificationIconSelector).click();
        return waitFor(() => subject.query(notificationAreaSelector));
      });

      it('keeps settings panel closed', function () {
        chai.expect(subject.query(settingsPanelSelector)).to.exist;
        chai.expect(subject.query(settingsPanelSelector).className).to.not.contain('visible');
      });

      it('keeps notification area open', function () {
        chai.expect(subject.query(notificationAreaSelector)).to.exist;
      });
    });

    describe('clicking on a notification title', function () {
      const notificationTitleSelector = 'div.notification div.content h1';

      beforeEach(function () {
        subject.query(notificationTitleSelector).click();
        return waitFor(() => subject.query(notificationAreaSelector));
      });

      it('keeps settings panel closed', function () {
        chai.expect(subject.query(settingsPanelSelector)).to.exist;
        chai.expect(subject.query(settingsPanelSelector).className).to.not.contain('visible');
      });

      it('keeps notification area open', function () {
        chai.expect(subject.query(notificationAreaSelector)).to.exist;
      });
    });

    describe('clicking on a notification decription', function () {
      const notificationDescriptionSelector = 'div.notification div.content p';

      beforeEach(function () {
        subject.query(notificationDescriptionSelector).click();
        return waitFor(() => subject.query(notificationAreaSelector));
      });

      it('keeps settings panel closed', function () {
        chai.expect(subject.query(settingsPanelSelector)).to.exist;
        chai.expect(subject.query(settingsPanelSelector).className).to.not.contain('visible');
      });

      it('keeps notification area open', function () {
        chai.expect(subject.query(notificationAreaSelector)).to.exist;
      });
    });

    describe('clicking on a close button', function () {
      const notificationCloseSelector = 'div.notification div.close';

      beforeEach(function() {
        subject.query(notificationCloseSelector).click();
        return waitFor(() => !subject.query(notificationAreaSelector));
      });

      it('keeps settings panel closed', function () {
        chai.expect(subject.query(settingsPanelSelector)).to.exist;
        chai.expect(subject.query(settingsPanelSelector).className).to.not.contain('visible');
      });

      it('closes notification area', function () {
        chai.expect(subject.query(notificationAreaSelector)).to.not.exist;
      });
    });

    describe('clicking on a notification call to action button once', function () {
      const notificationCtaSelector = 'div.notification div.content button.cta-btn';

      beforeEach(function () {
        subject.query(notificationCtaSelector).click();
        return waitFor(() => subject.query(notificationAreaSelector));
      });

      it('opens settings panel', function () {
        chai.expect(subject.query(settingsPanelSelector)).to.exist;
        chai.expect(subject.query(settingsPanelSelector).className).to.contain('visible');
      });

      it('keeps notification area open', function () {
        chai.expect(subject.query(notificationAreaSelector)).to.exist;
      });
    });

    describe('clicking on a notification call to action button twice', function () {
      const notificationCtaSelector = 'div.notification div.content button.cta-btn';

      beforeEach(function () {
        subject.query(notificationCtaSelector).click();
        return waitFor(() => subject.query(notificationAreaSelector)).then(function () {
          subject.query(notificationCtaSelector).click();
          return waitFor(() => subject.query(notificationAreaSelector));
        });
      });

      it('results in settings panel being closed', function () {
        chai.expect(subject.query(settingsPanelSelector)).to.exist;
        chai.expect(subject.query(settingsPanelSelector).className).to.not.contain('visible');
      });

      it('keeps notification area open', function () {
        chai.expect(subject.query(notificationAreaSelector)).to.exist;
      });
    });

    describe('simulating 3rd click on the call to action button', function () {
      beforeEach(function () {
        const iframes = document.getElementsByTagName('iframe');
        const thisWindow = iframes[iframes.length - 1].contentWindow;
        thisWindow.postMessage(JSON.stringify({
          action: 'closeNotification',
          messageId: 'singleNotification',
        }), '*');
        return waitFor(() => !subject.query(notificationAreaSelector));
      });

      it('hides the notification area', function () {
        chai.expect(subject.query(notificationAreaSelector)).to.not.exist;
      });
    });

    describe('refreshing Fresh Tab', function () {
      const homeIconSelector = '#cliqz-home';

      beforeEach(function () {
        subject.query(homeIconSelector).click();
        return waitFor(() => subject.query(homeIconSelector));
      });

      it('keeps notification area open', function () {
        chai.expect(subject.query(notificationAreaSelector)).to.exist;
      });
    });

  });

  context('when no notification is displayed', function () {
    beforeEach(function () {
      const oneNotificationConfig = clone(defaultConfig);
      oneNotificationConfig.response.messages = {};
      subject.respondsWith(oneNotificationConfig);
      return subject.load();
    });

    describe('simulating adding a new notification from message-center', function () {
      beforeEach(function () {
        const iframes = document.getElementsByTagName('iframe');
        const thisWindow = iframes[iframes.length - 1].contentWindow;
        thisWindow.postMessage(JSON.stringify({
          action: 'addMessage',
          message: otherMessage,
        }), '*');
        return waitFor(() => subject.query(notificationAreaSelector));
      });

      it('shows the notification area', function () {
        chai.expect(subject.query(notificationAreaSelector)).to.exist;
      });

      it('shows only one notification', function () {
        chai.expect(subject.queryAll(notificationAreaSelector).length).to.equal(1);
      });
    });
  });
});
