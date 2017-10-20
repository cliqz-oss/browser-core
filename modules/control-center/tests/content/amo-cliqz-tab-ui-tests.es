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
    this.messages = [];
  }

  load() {
    this.iframe = document.createElement('iframe');
    this.iframe.src = '/build/cliqz@cliqz.com/chrome/content/control-center/index.html';
    this.iframe.width = 455;
    this.iframe.height = 500;
    document.body.appendChild(this.iframe)

    return new Promise(resolve => {
      this.iframe.contentWindow.addEventListener('load', () => resolve());
    }).then(() => {

      this.iframe.contentWindow.addEventListener('message', ev => {
        var data = JSON.parse(ev.data);
        this.messages.push(data);
      });

      return waitFor(() => {
        return this.messages.length === 1
      })
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
      target: 'cliqz-control-center',
      origin: 'window',
      message:  {
        action: 'pushData',
        data,
      }
    }), "*");
    return wait(500);
  }

  getComputedStyle(selector) {
    return this.iframe.contentWindow.getComputedStyle(this.query(selector));
  }
}

describe("AMO Cliqz tab UI tests", function () {
  let subject;

  before(function () {
    subject = new Subject();
    return subject.load();
  })

  after(function () {
    subject.unload();
    clearIntervals();
  });

  function cliqzTabUiTests(data) {
    it("renders cliqz tab box", function () {
      chai.expect(subject.query('.amo #cliqz-tab')).to.not.be.null;
    });

    it('renders info button', function () {
      chai.expect(subject.query('.amo #cliqz-tab .title .infobutton')).to.exist;
    });

    it('renders title', function () {
      const titleSelector = '.amo #cliqz-tab .title > span';
      chai.expect(subject.query(titleSelector)).to.exist;
      chai.expect(subject.query(titleSelector).textContent.trim()).to.equal('Cliqz Tab');
    });

    it('renders switch', function () {
      chai.expect(subject.query('.amo #cliqz-tab .title .switches .cqz-switch-box')).to.exist;
    });
  };

  it('loads', function () {
    chai.expect(true).to.eql(true);
  })

  describe('Cliqz tab on', function () {
    const data = {
      activeURL: 'http://www.spiegel.de/',
      friendlyURL: 'http://www.spiegel.de/',
      isSpecialUrl: false,
      domain: 'spiegel.de',
      extraUrl: '',
      hostname: 'www.spiegel.de',
      module: {
        antitracking: {
          visible: false,
        },
        freshtab: {
          visible: true,
          enabled: true
        },
      },
      generalState: 'active',
      feedbackURL: 'https://cliqz.com/feedback/1.19.0.dev-40',
      amo: true,
      funnelCake: false
    };

    before(() => {
      return subject.pushData(data);
    });

    cliqzTabUiTests(data);

    it('renders correct colour of switch', function () {
      chai.expect(subject.getComputedStyle('.amo #cliqz-tab .cqz-switch-box').background).to.contain('rgb(0, 173, 239)');
    });

    it('renders "ON"', function () {
      const onSelector = '.amo #cliqz-tab .switches [data-i18n="control-center-switch-on"]';
      const offSelector = '.amo #cliqz-tab .switches [data-i18n="control-center-switch-off"]';
      chai.expect(subject.query(onSelector)).to.exist;
      chai.expect(subject.query(offSelector)).to.exist;
      chai.expect(subject.getComputedStyle(onSelector).display).to.not.equal('none');
      chai.expect(subject.getComputedStyle(offSelector).display).to.equal('none');
      chai.expect(subject.query(onSelector).textContent.trim()).to.equal('control-center-switch-on')
    });

  });

  describe('Cliqz tab off', function () {
    const data = {
      activeURL: 'http://www.spiegel.de/',
      friendlyURL: 'http://www.spiegel.de/',
      isSpecialUrl: false,
      domain: 'spiegel.de',
      extraUrl: '',
      hostname: 'www.spiegel.de',
      module: {
        antitracking: {
          visible: false,
        },
        freshtab: {
          visible: true,
          enabled: false
        },
      },
      generalState: 'active',
      feedbackURL: 'https://cliqz.com/feedback/1.19.0.dev-40',
      amo: true,
      funnelCake: false
    };

    before(() => {
      return subject.pushData(data);
    });

    cliqzTabUiTests(data);

    it('renders correct colour of switch', function () {
      chai.expect(subject.getComputedStyle('.amo #cliqz-tab .cqz-switch-box').background).to.contain('rgb(246, 112, 87)');
    });

    it('renders "OFF"', function () {
      const onSelector = '.amo #cliqz-tab .switches [data-i18n="control-center-switch-on"]';
      const offSelector = '.amo #cliqz-tab .switches [data-i18n="control-center-switch-off"]';
      chai.expect(subject.query(onSelector)).to.exist;
      chai.expect(subject.query(offSelector)).to.exist;
      chai.expect(subject.getComputedStyle(onSelector).display).to.equal('none');
      chai.expect(subject.getComputedStyle(offSelector).display).to.not.equal('none');
      chai.expect(subject.query(offSelector).textContent.trim()).to.equal('control-center-switch-off')
    });
  });
})
