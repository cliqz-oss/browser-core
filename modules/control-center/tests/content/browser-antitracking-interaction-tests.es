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

function antitrackingInteractionTests(amo) {
  let subject;

  beforeEach(function () {
    subject = new Subject();
    return subject.load();
  })

  afterEach(function () {
    subject.unload();
    clearIntervals();
  });

  function updateGeneralStateTest(selector, state) {
    it('sends message to update general state', function () {
      subject.query(selector).click();

      return waitFor(
        () => subject.messages.find(message => message.message.action === 'updateState')
      ).then(
        message => chai.expect(message).to.have.deep.property('message.data', state)
      );
    });
  };

  function antitrackingDropdown() {
    it('renders "This domain"', function () {
      chai.expect(subject.query('#anti-tracking .new-dropdown .new-dropdown-content .dropdown-content-option[value="this"]')).to.exist;
      chai.expect(subject.getComputedStyle('#anti-tracking .new-dropdown .new-dropdown-content .dropdown-content-option[value="this"]').display).to.not.equal('none');
    });

    it('renders "All websites"', function () {
      chai.expect(subject.query('#anti-tracking .new-dropdown .new-dropdown-content .dropdown-content-option[value="all"]')).to.exist;
      chai.expect(subject.getComputedStyle('#anti-tracking .new-dropdown .new-dropdown-content .dropdown-content-option[value="all"]').display).to.not.equal('none');
    });
  };

  it('loads', function () {
    chai.expect(true).to.eql(true);
  })

  describe('with anti-tracking on', function () {
    const data = {
      activeURL: 'http://www.spiegel.de/',
      friendlyURL: 'http://www.spiegel.de/',
      isSpecialUrl: false,
      domain: 'spiegel.de',
      extraUrl: '',
      hostname: 'www.spiegel.de',
      module: {
        antitracking: {
          visible: true,
          strict: false,
          hostname: 'www.spiegel.de',
          cookiesCount: 54,
          requestsCount: 0,
          totalCount: 54,
          badgeData: 54,
          enabled: true,
          isWhitelisted: true,
          reload: false,
          ps: null,
          state: 'active'
        },
      },
      generalState: 'active',
      feedbackURL: 'https://cliqz.com/feedback/1.19.0.dev-40',
      amo: amo,
      funnelCake: false
    };

    beforeEach(() => {
      return subject.pushData(data);
    });

    it('renders anti-tracking box', function () {
      chai.expect(subject.query('#anti-tracking')).to.exist;
    });

    describe("click on antitracking switch", function () {
      updateGeneralStateTest('#anti-tracking .antitracking .cqz-switch-box', 'inactive');

      it('sends message to deactivate antitracking', function () {
        subject.query('#anti-tracking .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.message.action === "antitracking-activator")
        ).then(
          message => {
            chai.expect(message).to.have.deep.property("message.data.type", "switch");
            chai.expect(message).to.have.deep.property("message.data.state", "inactive");
            chai.expect(message).to.have.deep.property("message.data.status", "inactive");
            chai.expect(message).to.have.deep.property("message.data.hostname", data.hostname);
          }
        );
      });
    });
  });

  describe('with anti-tracking off for this domain', function () {
    const data = {
      activeURL: 'http://www.spiegel.de/',
      friendlyURL: 'http://www.spiegel.de/',
      isSpecialUrl: false,
      domain: 'spiegel.de',
      extraUrl: '',
      hostname: 'www.spiegel.de',
      module: {
        antitracking: {
          visible: true,
          strict: false,
          hostname: 'www.spiegel.de',
          cookiesCount: 54,
          requestsCount: 0,
          totalCount: 54,
          badgeData: 54,
          enabled: false,
          isWhitelisted: true,
          reload: false,
          ps: null,
          state: 'inactive'
        },
      },
      generalState: 'inactive',
      feedbackURL: 'https://cliqz.com/feedback/1.19.0.dev-40',
      amo: amo,
      funnelCake: false
    };

    beforeEach(() => {
      return subject.pushData(data);
    });

    it('renders anti-tracking box', function () {
      chai.expect(subject.query('#anti-tracking')).to.exist;
    });

    describe("click on antitracking switch", function () {
      updateGeneralStateTest('#anti-tracking .antitracking .cqz-switch-box', 'active');

      it('sends message to activate antitracking', function () {
        subject.query('#anti-tracking .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.message.action === "antitracking-activator")
        ).then(
          message => {
            chai.expect(message).to.have.deep.property("message.data.type", "switch");
            chai.expect(message).to.have.deep.property("message.data.state", "active");
            chai.expect(message).to.have.deep.property("message.data.status", "active");
            chai.expect(message).to.have.deep.property("message.data.hostname", data.hostname);
          }
        );
      });
    });

    describe('click on dropdown', function () {
      beforeEach(function () {
        subject.query('#anti-tracking .new-dropdown .dropdown-btn').click();
        return waitFor(() => subject.query('#anti-tracking .new-dropdown .new-dropdown-content').classList.contains('visible'));
      });

      antitrackingDropdown();

      context('click on "All websites"', function () {
        updateGeneralStateTest('#anti-tracking .new-dropdown .new-dropdown-content .dropdown-content-option[value="all"]', 'critical');

        it('sends message to deactivate antitracking for all websites', function () {
          subject.query('#anti-tracking .new-dropdown .new-dropdown-content .dropdown-content-option[value="all"]').click();

          return waitFor(
            () => subject.messages.find(message => message.message.action === 'antitracking-activator')
          ).then(
            message => {
             chai.expect(message).to.have.deep.property('message.data.type', 'off_select');
             chai.expect(message).to.have.deep.property('message.data.state', 'off_all');
             chai.expect(message).to.have.deep.property('message.data.status', 'critical');
             chai.expect(message).to.have.deep.property('message.data.hostname', data.hostname);
            }
          );
        });
      });
    });

  });

  describe('with anti-tracking off for all websites', function () {
    const data = {
      activeURL: 'http://www.spiegel.de/',
      friendlyURL: 'http://www.spiegel.de/',
      isSpecialUrl: false,
      domain: 'spiegel.de',
      extraUrl: '',
      hostname: 'www.spiegel.de',
      module: {
        antitracking: {
          visible: true,
          strict: false,
          hostname: 'www.spiegel.de',
          cookiesCount: 54,
          requestsCount: 0,
          totalCount: 54,
          badgeData: 54,
          enabled: false,
          isWhitelisted: true,
          reload: false,
          ps: null,
          state: 'inactive'
        },
      },
      generalState: 'inactive',
      feedbackURL: 'https://cliqz.com/feedback/1.19.0.dev-40',
      amo: amo,
      funnelCake: false
    };

    beforeEach(() => {
      return subject.pushData(data);
    });

    it('renders anti-tracking box', function () {
      chai.expect(subject.query('#anti-tracking')).to.exist;
    });

    describe("click on antitracking switch", function () {
      updateGeneralStateTest('#anti-tracking .antitracking .cqz-switch-box', 'active');

      it('sends message to activate antitracking', function () {
        subject.query('#anti-tracking .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.message.action === "antitracking-activator")
        ).then(
          message => {
            chai.expect(message).to.have.deep.property("message.data.type", "switch");
            chai.expect(message).to.have.deep.property("message.data.state", "active");
            chai.expect(message).to.have.deep.property("message.data.status", "active");
            chai.expect(message).to.have.deep.property("message.data.hostname", data.hostname);
          }
        );
      });
    });

    describe('click on dropdown', function () {
      beforeEach(function () {
        subject.query('#anti-tracking .new-dropdown .dropdown-btn').click();
        return waitFor(() => subject.query('#anti-tracking .new-dropdown .new-dropdown-content').classList.contains('visible'));
      });

      antitrackingDropdown();

      context('click on "This domain"', function () {
        updateGeneralStateTest('#anti-tracking .new-dropdown .new-dropdown-content .dropdown-content-option[value="this"]', 'inactive');

        it('sends message to deactivate antitracking for this domain', function () {
          subject.query('#anti-tracking .new-dropdown .new-dropdown-content .dropdown-content-option[value="this"]').click();

          return waitFor(
            () => subject.messages.find(message => message.message.action === 'antitracking-activator')
          ).then(
            message => {
             chai.expect(message).to.have.deep.property('message.data.type', 'off_select');
             chai.expect(message).to.have.deep.property('message.data.state', 'off_website');
             chai.expect(message).to.have.deep.property('message.data.status', 'inactive');
             chai.expect(message).to.have.deep.property('message.data.hostname', data.hostname);
            }
          );
        });
      });
    });
  });
};

describe('Anti-Tracking interaction browser', function () {
  antitrackingInteractionTests(false);
});

describe('AMO Anti-Tracking Interaction tests', function () {
  antitrackingInteractionTests(true);
})
