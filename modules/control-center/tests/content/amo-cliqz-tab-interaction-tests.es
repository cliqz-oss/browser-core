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

describe("AMO Cliqz tab interaction tests", function () {
  let subject;

  beforeEach(function () {
    subject = new Subject();
    return subject.load();
  })

  afterEach(function () {
    subject.unload();
    clearIntervals();
  });

  function updateGeneralStateTest(selector) {
    it('sends message to update general state', function () {
      subject.query(selector).click();

      return waitFor(
        () => subject.messages.find(message => message.message.action === 'updateState')
      ).then(
        message => chai.expect(message).to.have.deep.property('message.data', 'active')
      );
    });
  };

  it('loads', function () {
    chai.expect(true).to.eql(true);
  });

  describe('with Cliqz tab on', function () {
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

    beforeEach(() => {
      return subject.pushData(data);
    });

    it('renders cliqz tab box', function () {
      chai.expect(subject.query('.amo #cliqz-tab')).to.exist;
    });

    describe('click on cliqz tab switch', function () {
      updateGeneralStateTest('.amo #cliqz-tab .cqz-switch-box');

      it('sends message to deactivate cliqz tab', function () {
        subject.query('.amo #cliqz-tab .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.message.action === 'cliqz-tab')
        ).then(
          message => {
            chai.expect(message).to.have.deep.property('message.data.status', false);
          }
        );
      });
    });
  });

  describe('with Cliqz tab off', function () {
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

    beforeEach(() => {
      return subject.pushData(data);
    });

    it('renders cliqz tab box', function () {
      chai.expect(subject.query('.amo #cliqz-tab')).to.exist;
    });

    describe('click on cliqz tab switch', function () {
      updateGeneralStateTest('.amo #cliqz-tab .cqz-switch-box');

      it('sends message to activate cliqz tab', function () {
        subject.query('.amo #cliqz-tab .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.message.action === 'cliqz-tab')
        ).then(
          message => {
            chai.expect(message).to.have.deep.property('message.data.status', true);
          }
        );
      });
    });
  });
})
