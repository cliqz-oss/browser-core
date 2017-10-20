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

function antitrackingUiTests(amo) {
  let subject;

  before(function () {
    subject = new Subject();
    return subject.load();
  })

  after(function () {
    subject.unload();
    clearIntervals();
  });

  function headerProtected() {
    context('control center header', function () {
      it('renders header', function () {
        chai.expect(subject.query('#header')).to.exist;
      });

      it('renders cliqz logo', function () {
        chai.expect(subject.query('#header .pause img')).to.exist;
        chai.expect(subject.getComputedStyle('#header .pause img').display).to.not.equal('none');
        chai.expect(subject.query('#header .pause img').getAttribute('src')).to.equal('./images/cliqz.svg');
      });

      it('renders "Your data is protected"', function () {
        chai.expect(subject.query('#header .title [data-i18n="control-center-txt-header"]')).to.exist;
        chai.expect(subject.getComputedStyle('#header .title [data-i18n="control-center-txt-header"]').display).to.not.equal('none');
        chai.expect(subject.getComputedStyle('#header .title [data-i18n="control-center-txt-header-not"][visible-on-state="inactive"]').display).to.equal('none');
        chai.expect(subject.getComputedStyle('#header .title [data-i18n="control-center-txt-header-not"][visible-on-state="critical"]').display).to.equal('none');
        chai.expect(subject.query('#header .title [data-i18n="control-center-txt-header"]').textContent.trim()).to.equal('control-center-txt-header');
      });

      it('doesn\'t render warning icon', function () {
        chai.expect(subject.query('#header .title img')).to.exist;
        chai.expect(subject.getComputedStyle('#header .title img').display).to.equal('none');
      });
    });
  };

  function antiTrackingUiTests(data) {
    it("renders antitracking box", function () {
      chai.expect(subject.query('#anti-tracking')).to.not.be.null;
    });

    it('renders info button', function () {
      chai.expect(subject.query('#anti-tracking .title .infobutton')).to.exist;
    });

    it('renders title', function () {
      chai.expect(subject.query('#anti-tracking .title span[start-navigation=""]')).to.exist;
      chai.expect(subject.query('#anti-tracking .title span[start-navigation=""]').textContent.trim()).to.equal('Anti-Tracking');
    });

    it('renders arrow', function () {
      chai.expect(subject.query('#anti-tracking .title #smallarrow')).to.exist;
    });

    it('renders switch', function () {
      chai.expect(subject.query('#anti-tracking .title .switches .cqz-switch-box')).to.exist;
    });

    it('renders shield', function () {
      chai.expect(subject.query('#anti-tracking #antitracker-counter #shield')).to.exist;
    });
  };

  it('loads', function () {
    chai.expect(true).to.eql(true);
  })

  describe('anti-tracking on', function () {
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

    before(() => {
      return subject.pushData(data);
    });

    headerProtected();

    antiTrackingUiTests(data);

    it('renders correct colour of switch', function () {
      chai.expect(subject.getComputedStyle('#anti-tracking .cqz-switch-box').background).to.contain('rgb(0, 173, 239)');
    });

    it('renders "ON"', function () {
      chai.expect(subject.query('#anti-tracking .switches [data-i18n="control-center-switch-on"]')).to.exist;
      chai.expect(subject.getComputedStyle('#anti-tracking .switches [data-i18n="control-center-switch-on"]').display).to.not.equal('none');
      chai.expect(subject.query('#anti-tracking .switches [visible-on-state="inactive"][data-i18n="control-center-switch-off"]')).to.exist;
      chai.expect(subject.getComputedStyle('#anti-tracking .switches [visible-on-state="inactive"][data-i18n="control-center-switch-off"]').display).to.equal('none');
      chai.expect(subject.query('#anti-tracking .switches [visible-on-state="critical"][data-i18n="control-center-switch-off"]')).to.exist;
      chai.expect(subject.getComputedStyle('#anti-tracking .switches [visible-on-state="critical"][data-i18n="control-center-switch-off"]').display).to.equal('none');
      chai.expect(subject.query('#anti-tracking .switches [data-i18n="control-center-switch-on"]').textContent.trim()).to.equal('control-center-switch-on')
    });

    it('renders text about private points', function () {
      chai.expect(subject.query('#anti-tracking .row-text [visible-on-state="active"][data-i18n="control-center-datapoints"]')).to.exist;
      chai.expect(subject.query('#anti-tracking .row-text [visible-on-state="inactive"][data-i18n="control-center-datapoints-inactive"]')).to.exist;
      chai.expect(subject.query('#anti-tracking .row-text [visible-on-state="critical"][data-i18n="control-center-datapoints-off"]')).to.exist;
      chai.expect(subject.getComputedStyle('#anti-tracking .row-text [visible-on-state="active"][data-i18n="control-center-datapoints"]').display).to.not.equal('none');
      chai.expect(subject.getComputedStyle('#anti-tracking .row-text [visible-on-state="inactive"][data-i18n="control-center-datapoints-inactive"]').display).to.equal('none');
      chai.expect(subject.getComputedStyle('#anti-tracking .row-text [visible-on-state="critical"][data-i18n="control-center-datapoints-off"]').display).to.equal('none');
      chai.expect(subject.query('#anti-tracking .row-text [visible-on-state="active"][data-i18n="control-center-datapoints"]').textContent.trim()).to.equal('control-center-datapoints');
    });

    it('dropdown is invisible', function () {
      chai.expect(subject.query('#anti-tracking .new-dropdown .dropdown-btn')).to.exist;
      chai.expect(subject.getComputedStyle('#anti-tracking .new-dropdown .dropdown-btn').display).to.equal('none');
    });

    it('renders correct amount of data points', function () {
      chai.expect(subject.query('#anti-tracking #antitracker-counter #count [visible-on-state="active"]')).to.exist;
      chai.expect(subject.query('#anti-tracking #antitracker-counter #count [visible-on-state="inactive"]')).to.exist;
      chai.expect(subject.query('#anti-tracking #antitracker-counter #count [visible-on-state="critical"]')).to.exist;
      chai.expect(subject.getComputedStyle('#anti-tracking #antitracker-counter #count [visible-on-state="active"]').display).to.not.equal('none');
      chai.expect(subject.getComputedStyle('#anti-tracking #antitracker-counter #count [visible-on-state="inactive"]').display).to.equal('none');
      chai.expect(subject.getComputedStyle('#anti-tracking #antitracker-counter #count [visible-on-state="critical"]').display).to.equal('none');
      chai.expect(subject.query('#anti-tracking #antitracker-counter #count [visible-on-state="active"]').textContent.trim()).to.equal(data.module.antitracking.totalCount.toString());
    });
  });

  describe('anti-tracking off for the particular website', function () {
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

    before(() => {
      return subject.pushData(data);
    });

    context('control center header', function () {
      it('renders header', function () {
        chai.expect(subject.query('#header')).to.exist;
      });

      it('renders cliqz logo', function () {
        chai.expect(subject.query('#header .pause img')).to.exist;
        chai.expect(subject.query('#header .pause img').getAttribute('src')).to.equal('./images/cliqz.svg');
      });

      it('renders header with the correct text', function () {
        chai.expect(subject.query('#header .title')).to.exist;
        chai.expect(subject.getComputedStyle('#header .title [data-i18n="control-center-txt-header"]').display).to.equal('none');
        chai.expect(subject.getComputedStyle('#header .title [data-i18n="control-center-txt-header-not"][visible-on-state="critical"]').display).to.equal('none');
        chai.expect(subject.getComputedStyle('#header .title [data-i18n="control-center-txt-header-not"][visible-on-state="inactive"]').display).to.not.equal('none');
        chai.expect(subject.query('#header .title [data-i18n="control-center-txt-header-not"][visible-on-state="inactive"]').textContent.trim()).to.equal('control-center-txt-header-not');
      });

      it('renders warning icon', function () {
        chai.expect(subject.query('#header .title img')).to.exist;
        chai.expect(subject.getComputedStyle('#header .title img').display).to.not.equal('none');
        chai.expect(subject.query('#header .title img').getAttribute('src')).to.equal('./images/alert-privacy.svg');
      });
    });

    antiTrackingUiTests(data);

    it('renders correct colour of switch', function () {
      chai.expect(subject.getComputedStyle('#anti-tracking .cqz-switch-box').background).to.contain('rgb(246, 112, 87)');
    });

    it('renders "OFF"', function () {
      chai.expect(subject.query('#anti-tracking .switches [data-i18n="control-center-switch-on"]')).to.exist;
      chai.expect(subject.getComputedStyle('#anti-tracking .switches [data-i18n="control-center-switch-on"]').display).to.equal('none');
      chai.expect(subject.query('#anti-tracking .switches [visible-on-state="inactive"][data-i18n="control-center-switch-off"]')).to.exist;
      chai.expect(subject.getComputedStyle('#anti-tracking .switches [visible-on-state="inactive"][data-i18n="control-center-switch-off"]').display).to.not.equal('none');
      chai.expect(subject.query('#anti-tracking .switches [visible-on-state="critical"][data-i18n="control-center-switch-off"]')).to.exist;
      chai.expect(subject.getComputedStyle('#anti-tracking .switches [visible-on-state="critical"][data-i18n="control-center-switch-off"]').display).to.equal('none');
      chai.expect(subject.query('#anti-tracking .switches [visible-on-state="inactive"][data-i18n="control-center-switch-off"]').textContent.trim()).to.equal('control-center-switch-off');
    });

    it('renders "Turned off for this domain"', function () {
      chai.expect(subject.query('#anti-tracking .row-text [visible-on-state="active"][data-i18n="control-center-datapoints"]')).to.exist;
      chai.expect(subject.query('#anti-tracking .row-text [visible-on-state="inactive"][data-i18n="control-center-datapoints-inactive"]')).to.exist;
      chai.expect(subject.query('#anti-tracking .row-text [visible-on-state="critical"][data-i18n="control-center-datapoints-off"]')).to.exist;
      chai.expect(subject.getComputedStyle('#anti-tracking .row-text [visible-on-state="active"][data-i18n="control-center-datapoints"]').display).to.equal('none');
      chai.expect(subject.getComputedStyle('#anti-tracking .row-text [visible-on-state="inactive"][data-i18n="control-center-datapoints-inactive"]').display).to.not.equal('none');
      chai.expect(subject.getComputedStyle('#anti-tracking .row-text [visible-on-state="critical"][data-i18n="control-center-datapoints-off"]').display).to.equal('none');
      chai.expect(subject.query('#anti-tracking .row-text [visible-on-state="inactive"][data-i18n="control-center-datapoints-inactive"]').textContent.trim()).to.equal('control-center-datapoints-inactive');
    });

    it('renders dropdown with "This domain"', function () {
      chai.expect(subject.query('#anti-tracking .new-dropdown .dropdown-btn [visible-on-state="inactive"][data-i18n="control-center-this-domain"]')).to.exist;
      chai.expect(subject.getComputedStyle('#anti-tracking .new-dropdown .dropdown-btn [visible-on-state="inactive"][data-i18n="control-center-this-domain"]').display).to.not.equal('none');
      chai.expect(subject.query('#anti-tracking .new-dropdown .dropdown-btn [visible-on-state="critical"][data-i18n="control-center-all-sites"]')).to.exist;
      chai.expect(subject.getComputedStyle('#anti-tracking .new-dropdown .dropdown-btn [visible-on-state="critical"][data-i18n="control-center-all-sites"]').display).to.equal('none');
      chai.expect(subject.query('#anti-tracking .new-dropdown .dropdown-btn [visible-on-state="inactive"][data-i18n="control-center-this-domain"]').textContent.trim()).to.equal('control-center-this-domain');
    });

    it('renders correct amount of data points', function () {
      chai.expect(subject.query('#anti-tracking #antitracker-counter #count [visible-on-state="active"]')).to.exist;
      chai.expect(subject.query('#anti-tracking #antitracker-counter #count [visible-on-state="inactive"]')).to.exist;
      chai.expect(subject.query('#anti-tracking #antitracker-counter #count [visible-on-state="critical"]')).to.exist;
      chai.expect(subject.getComputedStyle('#anti-tracking #antitracker-counter #count [visible-on-state="active"]').display).to.equal('none');
      chai.expect(subject.getComputedStyle('#anti-tracking #antitracker-counter #count [visible-on-state="inactive"]').display).to.not.equal('none');
      chai.expect(subject.getComputedStyle('#anti-tracking #antitracker-counter #count [visible-on-state="critical"]').display).to.equal('none');
      chai.expect(subject.query('#anti-tracking #antitracker-counter #count [visible-on-state="inactive"]').textContent.trim()).to.equal('0');
    });
  });

  describe('anti-tracking off for all websites', function () {
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
          totalCount: 0,
          state: 'critical'
        },
      },
      generalState: 'critical',
      feedbackURL: 'https://cliqz.com/feedback/1.19.0.dev-40',
      amo: amo,
      funnelCake: false
    };

    before(() => {
      return subject.pushData(data);
    });

    context('control center header', function () {
      it('renders header', function () {
        chai.expect(subject.query('#header')).to.exist;
      });

      it('renders cliqz logo', function () {
        chai.expect(subject.query('#header .pause img')).to.exist;
        chai.expect(subject.query('#header .pause img').getAttribute('src')).to.equal('./images/cliqz.svg');
      });

      it("renders header with the correct text", function () {
        chai.expect(subject.query('#header .title')).to.exist;
        chai.expect(subject.getComputedStyle('#header .title [data-i18n="control-center-txt-header"]').display).to.equal('none');
        chai.expect(subject.getComputedStyle('#header .title [data-i18n="control-center-txt-header-not"][visible-on-state="inactive"]').display).to.equal('none');
        chai.expect(subject.getComputedStyle('#header .title [data-i18n="control-center-txt-header-not"][visible-on-state="critical"]').display).to.not.equal('none');
        chai.expect(subject.query('#header .title [data-i18n="control-center-txt-header-not"]').textContent.trim()).to.equal('control-center-txt-header-not');
      });

      it('renders warning icon', function () {
        chai.expect(subject.query('#header .title img')).to.exist;
        chai.expect(subject.getComputedStyle('#header .title img').display).to.not.equal('none');
        chai.expect(subject.query('#header .title img').getAttribute('src')).to.equal('./images/alert-privacy.svg');
      });
    });

    antiTrackingUiTests(data);

    it('renders correct colour of switch', function () {
      chai.expect(subject.getComputedStyle('#anti-tracking .cqz-switch-box').background).to.contain('rgb(246, 112, 87)');
    });

    it('renders "OFF"', function () {
      chai.expect(subject.query('#anti-tracking .switches [data-i18n="control-center-switch-on"]')).to.exist;
      chai.expect(subject.getComputedStyle('#anti-tracking .switches [data-i18n="control-center-switch-on"]').display).to.equal('none');
      chai.expect(subject.query('#anti-tracking .switches [visible-on-state="critical"][data-i18n="control-center-switch-off"]')).to.exist;
      chai.expect(subject.getComputedStyle('#anti-tracking .switches [visible-on-state="critical"][data-i18n="control-center-switch-off"]').display).to.not.equal('none');
      chai.expect(subject.query('#anti-tracking .switches [visible-on-state="inactive"][data-i18n="control-center-switch-off"]')).to.exist;
      chai.expect(subject.getComputedStyle('#anti-tracking .switches [visible-on-state="inactive"][data-i18n="control-center-switch-off"]').display).to.equal('none');
      chai.expect(subject.query('#anti-tracking .switches [visible-on-state="critical"][data-i18n="control-center-switch-off"]').textContent.trim()).to.equal('control-center-switch-off');
    });

    it('renders "Turned off for all websites"', function () {
      chai.expect(subject.query('#anti-tracking .row-text [visible-on-state="active"][data-i18n="control-center-datapoints"]')).to.exist;
      chai.expect(subject.query('#anti-tracking .row-text [visible-on-state="inactive"][data-i18n="control-center-datapoints-inactive"]')).to.exist;
      chai.expect(subject.query('#anti-tracking .row-text [visible-on-state="critical"][data-i18n="control-center-datapoints-off"]')).to.exist;
      chai.expect(subject.getComputedStyle('#anti-tracking .row-text [visible-on-state="active"][data-i18n="control-center-datapoints"]').display).to.equal('none');
      chai.expect(subject.getComputedStyle('#anti-tracking .row-text [visible-on-state="inactive"][data-i18n="control-center-datapoints-inactive"]').display).to.equal('none');
      chai.expect(subject.getComputedStyle('#anti-tracking .row-text [visible-on-state="critical"][data-i18n="control-center-datapoints-off"]').display).to.not.equal('none');
      chai.expect(subject.query('#anti-tracking .row-text [visible-on-state="inactive"][data-i18n="control-center-datapoints-inactive"]').textContent.trim()).to.equal('control-center-datapoints-inactive');
    });

    it('renders dropdown with "All websites"', function () {
      chai.expect(subject.query('#anti-tracking .new-dropdown .dropdown-btn [visible-on-state="inactive"][data-i18n="control-center-this-domain"]')).to.exist;
      chai.expect(subject.getComputedStyle('#anti-tracking .new-dropdown .dropdown-btn [visible-on-state="inactive"][data-i18n="control-center-this-domain"]').display).to.equal('none');
      chai.expect(subject.query('#anti-tracking .new-dropdown .dropdown-btn [visible-on-state="critical"][data-i18n="control-center-all-sites"]')).to.exist;
      chai.expect(subject.getComputedStyle('#anti-tracking .new-dropdown .dropdown-btn [visible-on-state="critical"][data-i18n="control-center-all-sites"]').display).to.not.equal('none');
      chai.expect(subject.query('#anti-tracking .new-dropdown .dropdown-btn [visible-on-state="critical"][data-i18n="control-center-all-sites"]').textContent.trim()).to.equal('control-center-all-sites');
    });

    it('renders correct amount of data points', function () {
      chai.expect(subject.query('#anti-tracking #antitracker-counter #count [visible-on-state="active"]')).to.exist;
      chai.expect(subject.query('#anti-tracking #antitracker-counter #count [visible-on-state="inactive"]')).to.exist;
      chai.expect(subject.query('#anti-tracking #antitracker-counter #count [visible-on-state="critical"]')).to.exist;
      chai.expect(subject.getComputedStyle('#anti-tracking #antitracker-counter #count [visible-on-state="active"]').display).to.equal('none');
      chai.expect(subject.getComputedStyle('#anti-tracking #antitracker-counter #count [visible-on-state="inactive"]').display).to.equal('none');
      chai.expect(subject.getComputedStyle('#anti-tracking #antitracker-counter #count [visible-on-state="critical"]').display).to.not.equal('none');
      chai.expect(subject.query('#anti-tracking #antitracker-counter #count [visible-on-state="critical"]').textContent.trim()).to.equal('0');
    });
  });
}

describe('Anti-Tracking UI browser', function () {
  antitrackingUiTests(false);
});

describe('AMO Anti-Tracking UI tests', function () {
  antitrackingUiTests(true);
})
