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

  load(width) {
    this.iframe = document.createElement('iframe');
    this.iframe.src = '/build/cliqz@cliqz.com/chrome/content/freshtab/home.html';
    this.iframe.width = width;
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
describe('Fresh tab buttons UI', function () {
  const homeButtonSelector = '#cliqz-home';
  const historyButtonSelector = '#cliqz-history';
  const settingsButtonSelector = '#settings-btn';
  let subject;

  before(function () {
    subject = new Subject();
    subject.respondsWith({
      module: 'core',
      action: 'sendTelemetry',
      response: ''
    });

    subject.respondsWith({
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
            visible: false
          },
          background: {
            image: 'bg-dark'
          }
        }
      },
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
    clearIntervals();
  });


  context('rendered in wide window', function () {

    before(function () {
      return subject.load(900);
    })

    after(function () {
      subject.unload();
    });

    describe('renders home icon', function () {
      it('successfully', function () {
        chai.expect(subject.query(homeButtonSelector)).to.exist;
      });

      it('not hidden', function () {
        chai.expect(subject.getComputedStyle(homeButtonSelector).display).to.not.equal('none');
      });


      it('with correct text', function () {
        chai.expect(subject.query(homeButtonSelector)).to.have.text('Home');
      });

      it('with correct link', function () {
        chai.expect(subject.query(homeButtonSelector).href)
          .to.equal('chrome://cliqz/content/freshtab/home.html');
      });
    });

    describe('renders history icon', function () {
      it('successfully', function () {
        chai.expect(subject.query(historyButtonSelector)).to.exist;
      });

      it('not hidden', function () {
        chai.expect(subject.getComputedStyle(historyButtonSelector).display).to.not.equal('none');
      });

      it('with correct text', function () {
        chai.expect(subject.query(historyButtonSelector)).to.have.text('History');
      });

      it('with correct link', function () {
        chai.expect(subject.query(historyButtonSelector).href)
          .to.contain("resource://cliqz/cliqz-history/index.html#/");
      });
    });

    describe('renders settings icon', function () {
      it('successfully', function () {
        chai.expect(subject.query(settingsButtonSelector)).to.exist;
      });

      it('not hidden', function () {
        chai.expect(subject.getComputedStyle(settingsButtonSelector).display).to.not.equal('none');
      });

      it('with correct text', function () {
        chai.expect(subject.query(settingsButtonSelector)).to.have.text('Settings');
      });
    });

  });

  context('rendered in narrow window', function () {
    before(function () {
      return subject.load(300);
    })

    after(function () {
      subject.unload();
    });

    describe('renders home icon', function () {
      it('successfully', function () {
        chai.expect(subject.query(homeButtonSelector)).to.exist;
      });

      it('hidden', function () {
        chai.expect(subject.getComputedStyle(homeButtonSelector).display).to.equal('none');
      });
    });

    describe('renders history icon', function () {
      it('successfully', function () {
        chai.expect(subject.query(historyButtonSelector)).to.exist;
      });

      it('hidden', function () {
        chai.expect(subject.getComputedStyle(historyButtonSelector).display).to.equal('none');
      });
    });

    describe('renders settings icon', function () {
      it('successfully', function () {
        chai.expect(subject.query(settingsButtonSelector)).to.exist;
      });

      it('hidden', function () {
        chai.expect(subject.getComputedStyle(settingsButtonSelector).display).to.equal('none');
      });
    });
  });
});
