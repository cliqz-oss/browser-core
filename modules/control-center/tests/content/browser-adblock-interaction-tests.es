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

describe("Ad-Block interaction browser", function () {
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

  function adblockerDropdown() {
    it('renders "This page"', function () {
      chai.expect(subject.query('#ad-blocking .new-dropdown .new-dropdown-content .dropdown-content-option[value="page"]')).to.exist;
      chai.expect(subject.getComputedStyle('#ad-blocking .new-dropdown .new-dropdown-content .dropdown-content-option[value="page"]').display).to.not.equal('none');
    });

    it('renders "This domain"', function () {
      chai.expect(subject.query('#ad-blocking .new-dropdown .new-dropdown-content .dropdown-content-option[value="domain"]')).to.exist;
      chai.expect(subject.getComputedStyle('#ad-blocking .new-dropdown .new-dropdown-content .dropdown-content-option[value="domain"]').display).to.not.equal('none');
    });

    it('renders "All websites"', function () {
      chai.expect(subject.query('#ad-blocking .new-dropdown .new-dropdown-content .dropdown-content-option[value="all-sites"]')).to.exist;
      chai.expect(subject.getComputedStyle('#ad-blocking .new-dropdown .new-dropdown-content .dropdown-content-option[value="all-sites"]').display).to.not.equal('none');
    });
  }

  it('loads', function () {
    chai.expect(true).to.eql(true);
  });

  describe('with ad-blocker on', function () {
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
        adblocker: {
          visible: true,
          enabled: true,
          optimized: false,
          disabledForUrl: false,
          disabledForDomain: false,
          disabledEverywhere: false,
          totalCount: 12,
          advertisersList: {},
          state: "active",
          off_state: "off_website"
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

    it('renders ad-blocker box', function () {
      chai.expect(subject.query('#ad-blocking')).to.exist;
    });

    describe("click on ad-blocker switch", function () {
      updateGeneralStateTest('#ad-blocking .adblocker .cqz-switch-box');

      it('sends message to deactivate ad-blocker', function () {
        subject.query('#ad-blocking .adblocker .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.message.action === 'adb-activator')
        ).then(
          message => {
            chai.expect(message).to.have.deep.property('message.data.type', 'switch');
            chai.expect(message).to.have.deep.property('message.data.state', 'off');
            chai.expect(message).to.have.deep.property('message.data.status', 'off');
            chai.expect(message).to.have.deep.property('message.data.url', data.activeURL);
          }
        );
      });
    });
  });

  describe('with ad-blocker off for this page', function () {
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
        adblocker: {
          visible: true,
          enabled: false,
          optimized: false,
          disabledForUrl: true,
          disabledForDomain: false,
          disabledEverywhere: false,
          totalCount: 12,
          advertisersList: {},
          state: "off",
          off_state: "off_website"
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

    it('renders ad-blocker box', function () {
      chai.expect(subject.query('#ad-blocking')).to.exist;
    });

    describe('click on ad-blocker switch', function () {
      updateGeneralStateTest('#ad-blocking .adblocker .cqz-switch-box');

      it('sends message to activate ad-blocker', function () {
        subject.query('#ad-blocking .adblocker .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.message.action === "adb-activator")
        ).then(
          message => {
            chai.expect(message).to.have.deep.property("message.data.type", "switch");
            chai.expect(message).to.have.deep.property("message.data.state", "active");
            chai.expect(message).to.have.deep.property("message.data.status", "active");
            chai.expect(message).to.have.deep.property("message.data.url", data.activeURL);
          }
        );
      });
    });

    describe('click on dropdown', function () {
      beforeEach(function () {
        subject.query('#ad-blocking .new-dropdown .dropdown-btn').click();
        return waitFor(() => subject.query('#ad-blocking .new-dropdown .new-dropdown-content').classList.contains('visible'));
      });

      adblockerDropdown();

      context('click on "This domain"', function () {
        updateGeneralStateTest('#ad-blocking .new-dropdown .new-dropdown-content .dropdown-content-option[value="domain"]');

        it('sends message to deactivate adblocker for this domain', function () {
          subject.query('#ad-blocking .new-dropdown .new-dropdown-content .dropdown-content-option[value="domain"]').click();

          return waitFor(
            () => subject.messages.find(message => message.message.action === 'adb-activator')
          ).then(
            message => {
             chai.expect(message).to.have.deep.property('message.data.type', 'off_select');
             chai.expect(message).to.have.deep.property('message.data.state', 'off_domain');
             chai.expect(message).to.have.deep.property('message.data.status', 'off');
             chai.expect(message).to.have.deep.property('message.data.url', data.activeURL);
            }
          );
        });
      });

      context('click on "All websites"', function () {
        updateGeneralStateTest('#ad-blocking .new-dropdown .new-dropdown-content .dropdown-content-option[value="all-sites"]');

        it('sends message to deactivate adblocker for all websites', function () {
          subject.query('#ad-blocking .new-dropdown .new-dropdown-content .dropdown-content-option[value="all-sites"]').click();

          return waitFor(
            () => subject.messages.find(message => message.message.action === 'adb-activator')
          ).then(
            message => {
             chai.expect(message).to.have.deep.property('message.data.type', 'off_select');
             chai.expect(message).to.have.deep.property('message.data.state', 'off_all');
             chai.expect(message).to.have.deep.property('message.data.status', 'off');
             chai.expect(message).to.have.deep.property('message.data.url', data.activeURL);
            }
          );
        });
      });
    });
  });

  describe('with ad-blocker off for this domain', function () {
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
        adblocker: {
          visible: true,
          enabled: false,
          optimized: false,
          disabledForUrl: false,
          disabledForDomain: true,
          disabledEverywhere: false,
          totalCount: 12,
          advertisersList: {},
          state: "off",
          off_state: "off_domain"
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

    it('renders ad-blocker box', function () {
      chai.expect(subject.query('#ad-blocking')).to.exist;
    });

    describe('click on ad-blocker switch', function () {
      updateGeneralStateTest('#ad-blocking .adblocker .cqz-switch-box');

      it('sends message to activate ad-blocker', function () {
        subject.query('#ad-blocking .adblocker .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.message.action === "adb-activator")
        ).then(
          message => {
            chai.expect(message).to.have.deep.property("message.data.type", "switch");
            chai.expect(message).to.have.deep.property("message.data.state", "active");
            chai.expect(message).to.have.deep.property("message.data.status", "active");
            chai.expect(message).to.have.deep.property("message.data.url", data.activeURL);
          }
        );
      });
    });

    describe('click on dropdown', function () {
      beforeEach(function () {
        subject.query('#ad-blocking .new-dropdown .dropdown-btn').click();
        return waitFor(() => subject.query('#ad-blocking .new-dropdown .new-dropdown-content').classList.contains('visible'));
      });

      adblockerDropdown();

      context('click on "This page"', function () {
        updateGeneralStateTest('#ad-blocking .new-dropdown .new-dropdown-content .dropdown-content-option[value="page"]');

        it('sends message to deactivate adblocker for this page', function () {
          subject.query('#ad-blocking .new-dropdown .new-dropdown-content .dropdown-content-option[value="page"]').click();

          return waitFor(
            () => subject.messages.find(message => message.message.action === 'adb-activator')
          ).then(
            message => {
             chai.expect(message).to.have.deep.property('message.data.type', 'off_select');
             chai.expect(message).to.have.deep.property('message.data.state', 'off_website');
             chai.expect(message).to.have.deep.property('message.data.status', 'off');
             chai.expect(message).to.have.deep.property('message.data.url', data.activeURL);
            }
          );
        });
      });

      context('click on "All websites"', function () {
        updateGeneralStateTest('#ad-blocking .new-dropdown .new-dropdown-content .dropdown-content-option[value="all-sites"]');

        it('sends message to deactivate adblocker for all websites', function () {
          subject.query('#ad-blocking .new-dropdown .new-dropdown-content .dropdown-content-option[value="all-sites"]').click();

          return waitFor(
            () => subject.messages.find(message => message.message.action === 'adb-activator')
          ).then(
            message => {
             chai.expect(message).to.have.deep.property('message.data.type', 'off_select');
             chai.expect(message).to.have.deep.property('message.data.state', 'off_all');
             chai.expect(message).to.have.deep.property('message.data.status', 'off');
             chai.expect(message).to.have.deep.property('message.data.url', data.activeURL);
            }
          );
        });
      });
    });
  });

  describe('with ad-blocker off for all websites', function () {
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
        adblocker: {
          visible: true,
          enabled: false,
          optimized: false,
          disabledForUrl: false,
          disabledForDomain: false,
          disabledEverywhere: true,
          totalCount: 12,
          advertisersList: {},
          state: "off",
          off_state: "off_all"
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

    it('renders ad-blocker box', function () {
      chai.expect(subject.query('#ad-blocking')).to.exist;
    });

    describe('click on ad-blocker switch', function () {
      updateGeneralStateTest('#ad-blocking .adblocker .cqz-switch-box');

      it('sends message to activate ad-blocker', function () {
        subject.query('#ad-blocking .adblocker .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.message.action === "adb-activator")
        ).then(
          message => {
            chai.expect(message).to.have.deep.property("message.data.type", "switch");
            chai.expect(message).to.have.deep.property("message.data.state", "active");
            chai.expect(message).to.have.deep.property("message.data.status", "active");
            chai.expect(message).to.have.deep.property("message.data.url", data.activeURL);
          }
        );
      });
    });

    describe('click on dropdown', function () {
      beforeEach(function () {
        subject.query('#ad-blocking .new-dropdown .dropdown-btn').click();
        return waitFor(() => subject.query('#ad-blocking .new-dropdown .new-dropdown-content').classList.contains('visible'));
      });

      adblockerDropdown();

      context('click on "This page"', function () {
        updateGeneralStateTest('#ad-blocking .new-dropdown .new-dropdown-content .dropdown-content-option[value="page"]');

        it('sends message to deactivate adblocker for this page', function () {
          subject.query('#ad-blocking .new-dropdown .new-dropdown-content .dropdown-content-option[value="page"]').click();

          return waitFor(
            () => subject.messages.find(message => message.message.action === 'adb-activator')
          ).then(
            message => {
             chai.expect(message).to.have.deep.property('message.data.type', 'off_select');
             chai.expect(message).to.have.deep.property('message.data.state', 'off_website');
             chai.expect(message).to.have.deep.property('message.data.status', 'off');
             chai.expect(message).to.have.deep.property('message.data.url', data.activeURL);
            }
          );
        });
      });

      context('click on "This domain"', function () {
        updateGeneralStateTest('#ad-blocking .new-dropdown .new-dropdown-content .dropdown-content-option[value="domain"]');

        it('sends message to deactivate adblocker for this domain', function () {
          subject.query('#ad-blocking .new-dropdown .new-dropdown-content .dropdown-content-option[value="domain"]').click();

          return waitFor(
            () => subject.messages.find(message => message.message.action === 'adb-activator')
          ).then(
            message => {
             chai.expect(message).to.have.deep.property('message.data.type', 'off_select');
             chai.expect(message).to.have.deep.property('message.data.state', 'off_domain');
             chai.expect(message).to.have.deep.property('message.data.status', 'off');
             chai.expect(message).to.have.deep.property('message.data.url', data.activeURL);
            }
          );
        });
      });
    });
  });
})
