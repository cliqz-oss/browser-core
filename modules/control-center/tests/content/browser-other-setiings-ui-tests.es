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

describe("Other Settings section UI browser", function () {
  let subject;

  before(function () {
    subject = new Subject();
    return subject.load();
  })

  after(function () {
    subject.unload();
    clearIntervals();
  });

  it('loads', function () {
    chai.expect(true).to.eql(true);
  })

  describe('Other Settings', function () {
    const data = {
      activeURL: 'http://www.spiegel.de/',
      friendlyURL: 'http://www.spiegel.de/',
      isSpecialUrl: false,
      domain: 'spiegel.de',
      extraUrl: '',
      hostname: 'www.spiegel.de',
      generalState: 'active',
      feedbackURL: 'https://cliqz.com/feedback/1.19.0.dev-40',
      amo: false,
      funnelCake: false
    };

    before(() => {
      return subject.pushData(data);
    });

    it('other setting section exists', function () {
      chai.expect(subject.query('#othersettings')).to.exist;
    });

    it('renders other settings section header', function () {
      chai.expect(subject.query('#othersettings .header')).to.exist;
    });

    it('renders title', function () {
      const titleSelector = '#othersettings .header .title [data-i18n="control-center-othersettings"]';
      chai.expect(subject.query(titleSelector)).to.exist;
      chai.expect(subject.query(titleSelector).textContent.trim()).to.equal('control-center-othersettings');
    });

    it('support section exists', function () {
      chai.expect(subject.query('#othersettings .title #support')).to.exist;
    });

    it('renders "Support"', function () {
      const supportSelector = '#othersettings .title #support [data-i18n="control-center-support"]';
      chai.expect(subject.query(supportSelector)).to.exist;
      chai.expect(subject.query(supportSelector).textContent.trim()).to.equal('control-center-support');
    });

    it('url for Support is correct', function () {
      const supportSelector = '#othersettings .title #support [data-i18n="control-center-support"]';
      chai.expect(subject.query(supportSelector).hasAttribute('openurl')).to.be.true;
      chai.expect(subject.query(supportSelector).getAttribute('openurl')).to.equal('https://cliqz.com/feedback/1.19.0.dev-40');
    });

    it('renders "Tips"', function () {
      const tipsSelector = '#othersettings .title #support [data-i18n="control-center-tips"]';
      chai.expect(subject.query(tipsSelector)).to.exist;
      chai.expect(subject.query(tipsSelector).textContent.trim()).to.equal('control-center-tips');
    });

    it('url for Tips is correct', function () {
      const tipsSelector = '#othersettings .title #support [data-i18n="control-center-tips"]';
      chai.expect(subject.query(tipsSelector).hasAttribute('openurl')).to.be.true;
      chai.expect(subject.query(tipsSelector).getAttribute('openurl')).to.equal('https://cliqz.com/tips');
    });

    it('renders "Search options"', function () {
      const titleSelector = '#othersettings .accordion .accordion-section-title[href="#accordion-2"] [data-i18n="control-center-searchoptions"]';
      chai.expect(subject.query(titleSelector)).to.exist;
      chai.expect(subject.query(titleSelector).textContent.trim()).to.equal('control-center-searchoptions');
    });

    it('renders arrow for search options', function () {
      const arrowSelector = '#othersettings .accordion .accordion-section-title[href="#accordion-2"] #arrow';
      chai.expect(subject.query(arrowSelector)).to.exist;
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
  });
})
