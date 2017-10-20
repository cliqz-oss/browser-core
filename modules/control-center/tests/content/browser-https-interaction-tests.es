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

describe('HTTPS Everywhere interaction browser', function () {
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
  })

  describe('with https everywhere on', function () {
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
        'https-everywhere': {
          visible: true,
          active: true
        },
      },
      generalState: 'active',
      feedbackURL: 'https://cliqz.com/feedback/1.19.0.dev-40',
      amo: false,
      funnelCake: false
    };

    beforeEach(() => {
      return subject.pushData(data);
    });

    it('renders https box', function () {
      chai.expect(subject.query('#https')).to.exist;
    });

    describe('click on https switch', function () {
      updateGeneralStateTest('#https .cqz-switch-box');

      it('sends message to deactivate https', function () {
        subject.query('#https .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.message.action === 'updatePref')
        ).then(
          message => {
            chai.expect(message).to.have.deep.property('message.data.pref', 'extensions.https_everywhere.globalEnabled');
            chai.expect(message).to.have.deep.property('message.data.value', false);
            chai.expect(message).to.have.deep.property('message.data.target', 'https_switch');
          }
        );
      });
    });
  });

  describe('with https everywhere off', function () {
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
        'https-everywhere': {
          visible: true,
          active: false
        },
      },
      generalState: 'active',
      feedbackURL: 'https://cliqz.com/feedback/1.19.0.dev-40',
      amo: false,
      funnelCake: false
    };

    beforeEach(() => {
      return subject.pushData(data);
    });

    it('renders https box', function () {
      chai.expect(subject.query('#https')).to.exist;
    });

    describe('click on https switch', function () {
      updateGeneralStateTest('#https .cqz-switch-box');
      
      it('sends message to activate https', function () {
        subject.query('#https .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.message.action === 'updatePref')
        ).then(
          message => {
            chai.expect(message).to.have.deep.property('message.data.pref', 'extensions.https_everywhere.globalEnabled');
            chai.expect(message).to.have.deep.property('message.data.value', true);
            chai.expect(message).to.have.deep.property('message.data.target', 'https_switch');
          }
        );
      });
    });
  });
})
