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

describe("History options browser", function () {
  let subject;

  beforeEach(function () {
    subject = new Subject();
    return subject.load();
  })

  afterEach(function () {
    subject.unload();
    clearIntervals();
  });

  function historySectionTests() {
    it('history section appeared', function () {
      chai.expect(subject.query('.accordion #accordion-3.accordion-section-content.open')).to.exist;
    });

    it('renders "History options"', function () {
      const titleSelector = '#othersettings .accordion .accordion-section-title[href="#accordion-3"] [data-i18n="control-center-history-options"]';
      chai.expect(subject.query(titleSelector)).to.exist;
      chai.expect(subject.query(titleSelector).textContent.trim()).to.equal('control-center-history-options');
    });

    it('renders arrow for history options', function () {
      const arrowSelector = '#othersettings .accordion .accordion-section-title[href="#accordion-3"] #arrow';
      chai.expect(subject.query(arrowSelector)).to.exist;
    });

    it('renders three options', function () {
      chai.expect(subject.queryAll('.accordion #accordion-3 .bullet').length).to.equal(3);
    });

    it('renders "Show all history"', function () {
      const historySelector = '.accordion #accordion-3 .bullet [data-i18n="control-center-show-history"]';
      chai.expect(subject.query(historySelector)).to.exist;
      chai.expect(subject.query(historySelector).textContent.trim()).to.equal('control-center-show-history');
    });

    it('renders button "Open" for "Show all history"', function () {
      const buttonSelector = '.accordion #accordion-3 .bullet [openurl="history"]';
      chai.expect(subject.query(buttonSelector)).to.exist;
      chai.expect(subject.query(buttonSelector).textContent.trim()).to.equal('control-center-open');
    });

    it('renders "Forget history"', function () {
      const forgetSelector = '.accordion #accordion-3 .bullet [data-i18n="control-center-forget-history"]';
      chai.expect(subject.query(forgetSelector)).to.exist;
      chai.expect(subject.query(forgetSelector).textContent.trim()).to.equal('control-center-forget-history');
    });

    it('renders button "Open" for "Forget history"', function () {
      const buttonSelector = '.accordion #accordion-3 .bullet [openurl="forget_history"]';
      chai.expect(subject.query(buttonSelector)).to.exist;
      chai.expect(subject.query(buttonSelector).textContent.trim()).to.equal('control-center-open');
    });

    it('renders dropdown for autoforget mode', function () {
      chai.expect(subject.query('.accordion #accordion-3 .bullet .custom-dropdown')).to.exist;
    });
  }

  it('loads', function () {
    chai.expect(true).to.eql(true);
  })

  describe('with autoforget mode on', function () {
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
        apt: {
          visible: true,
          state: true
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

    it('history section exists', function () {
      chai.expect(subject.query('#othersettings .accordion [data-target="history"]')).to.exist;
    });

    describe('click on the history section', function () {
      beforeEach(function () {
        subject.query('#othersettings .accordion [data-target="history"]').click();
        return waitFor(() => subject.query('.accordion .accordion-section-title[href="#accordion-3"]').classList.contains('active'));
      });

      historySectionTests();

      it('renders "Automatic forget mode"', function () {
        const modeSelector = '.accordion #accordion-3 .bullet [data-i18n="control-center-forget-mode"]';
        chai.expect(subject.query(modeSelector)).to.exist;
        chai.expect(subject.query(modeSelector).textContent.trim()).to.equal('control-center-forget-mode');
      });

      it('renders info button', function () {
        chai.expect(subject.query('.accordion #accordion-3 .bullet .infobutton')).to.exist;
      });


      it("Automatic forget mode is on", function () {
        const select = subject.query('.accordion #accordion-3 .bullet .custom-dropdown');
        const evt = document.createEvent("HTMLEvents");
        select.addEventListener('change', console.log);
        evt.initEvent('change', true, true);
        select.dispatchEvent(evt);
        return waitFor(
          () => subject.messages.find(message => message.message.action === "updatePref")
        ).then(
          message => {
            chai.expect(message).to.have.deep.property("message.data.pref", "browser.privatebrowsing.apt");
            chai.expect(message).to.have.deep.property("message.data.value", "true");
            chai.expect(message).to.have.deep.property("message.data.target", "history_autoforget");
            chai.expect(message).to.have.deep.property("message.data.prefType", "boolean");
          }
        );
      });
    });
  });

  describe('with autoforget mode off', function () {
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
        apt: {
          visible: true,
          state: false
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

    it('history section exists', function () {
      chai.expect(subject.query('#othersettings .accordion [data-target="history"]')).to.exist;
    });

    describe('click on the history section', function () {
      beforeEach(function () {
        subject.query('#othersettings .accordion [data-target="history"]').click();
        return waitFor(() => subject.query('.accordion .accordion-section-title[href="#accordion-3"]').classList.contains('active'));
      });

      historySectionTests();

      it('renders "Automatic forget mode"', function () {
        const modeSelector = '.accordion #accordion-3 .bullet [data-i18n="control-center-forget-mode"]';
        chai.expect(subject.query(modeSelector)).to.exist;
        chai.expect(subject.query(modeSelector).textContent.trim()).to.equal('control-center-forget-mode');
      });

      it('renders info button', function () {
        chai.expect(subject.query('.accordion #accordion-3 .bullet .infobutton')).to.exist;
      });

      it("Automatic forget mode is off", function () {
        const select = subject.query('.accordion #accordion-3 .bullet .custom-dropdown');
        const evt = document.createEvent("HTMLEvents");
        select.addEventListener('change', console.log);
        evt.initEvent('change', true, true);
        select.dispatchEvent(evt);
        return waitFor(
          () => subject.messages.find(message => message.message.action === "updatePref")
        ).then(
          message => {
            chai.expect(message).to.have.deep.property("message.data.pref", "browser.privatebrowsing.apt");
            chai.expect(message).to.have.deep.property("message.data.value", "false");
            chai.expect(message).to.have.deep.property("message.data.target", "history_autoforget");
            chai.expect(message).to.have.deep.property("message.data.prefType", "boolean");
          }
        );
      });
    });
  });
})
