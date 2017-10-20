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

describe("Anti-Phishing interaction browser", function () {
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

  it("loads", function () {
    chai.expect(true).to.eql(true);
  })

  describe("with antiphishing on", function() {
    const data = {
      activeURL: 'http://www.spiegel.de/',
      friendlyURL: 'http://www.spiegel.de/',
      isSpecialUrl: false,
      domain: 'spiegel.de',
      extraUrl: '',
      hostname: 'www.spiegel.de',
      module: {
        'antitracking': {
          visible: false,
        },
        'anti-phishing': {
          visible: true,
          active: true,
          isWhitelisted: true,
          state: 'active'
        },
      },
      generalState: 'active',
      feedbackURL: 'https://cliqz.com/feedback/1.19.0.dev-40',
      amo: false,
      funnelCake: false
    };

    beforeEach(() => {
      return subject.pushData(data);
    })

    it("renders antiphishing box", function () {
      chai.expect(subject.query('#anti-phising')).to.exist;
    });

    describe("click on antiphishing switch", function () {
      updateGeneralStateTest('#anti-phising .cqz-switch-box');

      it('sends message to deactivate antiphishing', function () {
        subject.query('#anti-phising .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.message.action === "anti-phishing-activator")
        ).then(
          message => {
            chai.expect(message).to.have.deep.property("message.data.type", "switch");
            chai.expect(message).to.have.deep.property("message.data.state", "inactive");
            chai.expect(message).to.have.deep.property("message.data.status", "inactive");
            chai.expect(message).to.have.deep.property("message.data.url", data.activeURL);
          }
        );
      });
    });
  });

  describe("with antiphishing off for this domain", function() {
    const data = {
      activeURL: 'http://www.spiegel.de/',
      friendlyURL: 'http://www.spiegel.de/',
      isSpecialUrl: false,
      domain: 'spiegel.de',
      extraUrl: '',
      hostname: 'www.spiegel.de',
      module: {
        'antitracking': {
          visible: false,
        },
        'anti-phishing': {
          visible: true,
          active: true,
          isWhitelisted: true,
          state: 'inactive'
        },
      },
      generalState: 'active',
      feedbackURL: 'https://cliqz.com/feedback/1.19.0.dev-40',
      amo: false,
      funnelCake: false
    };

    beforeEach(() => {
      return subject.pushData(data);
    })

    it('renders antiphishing box', function () {
      chai.expect(subject.query('#anti-phising')).to.exist;
    });

    describe('click on antiphishing switch', function () {
      updateGeneralStateTest('#anti-phising .cqz-switch-box');

      it('sends message to activate antiphishing', function () {
        subject.query('#anti-phising .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.message.action === 'anti-phishing-activator')
        ).then(
          message => {
            chai.expect(message).to.have.deep.property('message.data.type', 'switch');
            chai.expect(message).to.have.deep.property('message.data.state', 'active');
            chai.expect(message).to.have.deep.property('message.data.status', 'active');
            chai.expect(message).to.have.deep.property('message.data.url', data.activeURL);
          }
        );
      });
    });

    describe('click on dropdown', function () {
      beforeEach( function () {
        subject.query('#anti-phising .new-dropdown .dropdown-btn').click();
        return waitFor(() => subject.query('#anti-phising .new-dropdown .new-dropdown-content').classList.contains('visible'));
      });

      it('renders "This domain"', function () {
        chai.expect(subject.query('#anti-phising .new-dropdown .new-dropdown-content .dropdown-content-option[value="this"]')).to.exist;
        chai.expect(subject.getComputedStyle('#anti-phising .new-dropdown .new-dropdown-content .dropdown-content-option[value="this"]').display).to.not.equal('none');
      });

      it('renders "All websites"', function () {
        chai.expect(subject.query('#anti-phising .new-dropdown .new-dropdown-content .dropdown-content-option[value="all"]')).to.exist;
        chai.expect(subject.getComputedStyle('#anti-phising .new-dropdown .new-dropdown-content .dropdown-content-option[value="all"]').display).to.not.equal('none');
      });

      context('click on "All websites"', function () {
        updateGeneralStateTest('#anti-phising .new-dropdown .new-dropdown-content .dropdown-content-option[value="all"]');

        it('sends message to deactivate antiphishing', function () {
          subject.query('#anti-phising .new-dropdown .new-dropdown-content .dropdown-content-option[value="all"]').click();

          return waitFor(
            () => subject.messages.find(message => message.message.action === 'anti-phishing-activator')
          ).then(
            message => {
              chai.expect(message).to.have.deep.property('message.data.type', 'off_select');
              chai.expect(message).to.have.deep.property('message.data.state', 'off_all');
              chai.expect(message).to.have.deep.property('message.data.status', 'critical');
              chai.expect(message).to.have.deep.property('message.data.url', data.activeURL);
            }
          );
        });
      });
    });
  });

  describe('with antiphishing off for all websites', function() {
    const data = {
      activeURL: 'http://www.spiegel.de/',
      friendlyURL: 'http://www.spiegel.de/',
      isSpecialUrl: false,
      domain: 'spiegel.de',
      extraUrl: '',
      hostname: 'www.spiegel.de',
      module: {
        'antitracking': {
          visible: false,
        },
        'anti-phishing': {
          visible: true,
          active: false,
          isWhitelisted: false,
          state: 'critical'
        },
      },
      generalState: 'active',
      feedbackURL: 'https://cliqz.com/feedback/1.19.0.dev-40',
      amo: false,
      funnelCake: false
    };

    beforeEach(() => {
      return subject.pushData(data);
    })

    it('renders antiphishing box', function () {
      chai.expect(subject.query('#anti-phising')).to.exist;
    });

    describe('click on antiphishing switch', function () {
      updateGeneralStateTest('#anti-phising .cqz-switch-box');

      it('sends message to activate antiphishing', function () {
        subject.query('#anti-phising .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.message.action === 'anti-phishing-activator')
        ).then(
          message => {
            chai.expect(message).to.have.deep.property('message.data.type', 'switch');
            chai.expect(message).to.have.deep.property('message.data.state', 'active');
            chai.expect(message).to.have.deep.property('message.data.status', 'active');
            chai.expect(message).to.have.deep.property('message.data.url', data.activeURL);
          }
        );
      });
    });

    describe('click on dropdown', function () {
      beforeEach( function () {
        subject.query('#anti-phising .new-dropdown .dropdown-btn').click();
        return waitFor(() => subject.query('#anti-phising .new-dropdown .new-dropdown-content').classList.contains('visible'));
      });

      it('renders "This domain"', function () {
        chai.expect(subject.query('#anti-phising .new-dropdown .new-dropdown-content .dropdown-content-option[value="this"]')).to.exist;
        chai.expect(subject.getComputedStyle('#anti-phising .new-dropdown .new-dropdown-content .dropdown-content-option[value="this"]').display).to.not.equal('none');
      });

      it('renders "All websites"', function () {
        chai.expect(subject.query('#anti-phising .new-dropdown .new-dropdown-content .dropdown-content-option[value="all"]')).to.exist;
        chai.expect(subject.getComputedStyle('#anti-phising .new-dropdown .new-dropdown-content .dropdown-content-option[value="all"]').display).to.not.equal('none');
      });

      context('click on "This domain"', function () {
        updateGeneralStateTest('#anti-phising .new-dropdown .new-dropdown-content .dropdown-content-option[value="this"]');
        
        it('sends message to deactivate antiphishing', function () {
          subject.query('#anti-phising .new-dropdown .new-dropdown-content .dropdown-content-option[value="this"]').click();

          return waitFor(
            () => subject.messages.find(message => message.message.action === 'anti-phishing-activator')
          ).then(
            message => {
              chai.expect(message).to.have.deep.property('message.data.type', 'off_select');
              chai.expect(message).to.have.deep.property('message.data.state', 'off_website');
              chai.expect(message).to.have.deep.property('message.data.status', 'inactive');
              chai.expect(message).to.have.deep.property('message.data.url', data.activeURL);
            }
          );
        });
      });
    });
  });
});
