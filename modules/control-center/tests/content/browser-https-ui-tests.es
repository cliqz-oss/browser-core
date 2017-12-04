import {
  wait,
  registerInterval,
  clearIntervals,
  waitFor,
  Subject
} from './helpers';

import {dataOn, dataOff} from './fixtures/https-everywhere';

describe("Control Center: HTTPS Everywhere UI browser", function () {
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

  function httpsUiTests(data) {
    it("renders https box", function () {
      chai.expect(subject.query('#https')).to.not.be.null;
    });

    it('renders info button', function () {
      chai.expect(subject.query('#https .title .infobutton')).to.exist;
    });

    it('renders title', function () {
      const titleSelector = '#https .title [data-i18n="control-center-info-https-title"]';
      chai.expect(subject.query(titleSelector)).to.exist;
      chai.expect(subject.query(titleSelector).textContent.trim()).to.equal('control-center-info-https-title');
    });

    it('renders switch', function () {
      chai.expect(subject.query('#https .title .switches .cqz-switch-box')).to.exist;
    });
  };

  it('loads', function () {
    chai.expect(true).to.eql(true);
  })

  describe('https everywhere on', function () {
    before(() => {
      return subject.pushData(dataOn);
    });

    headerProtected();

    httpsUiTests(dataOn);

    it('renders correct colour of switch', function () {
      chai.expect(subject.getComputedStyle('#https .cqz-switch-box').background).to.contain('rgb(0, 173, 239)');
    });

    it('renders "ON"', function () {
      const onSelector = '#https .switches [data-i18n="control-center-switch-on"]';
      const offSelector = '#https .switches [data-i18n="control-center-switch-off"]';
      chai.expect(subject.query(onSelector)).to.exist;
      chai.expect(subject.query(offSelector)).to.exist;
      chai.expect(subject.getComputedStyle(onSelector).display).to.not.equal('none');
      chai.expect(subject.getComputedStyle(offSelector).display).to.equal('none');
      chai.expect(subject.query(onSelector).textContent.trim()).to.equal('control-center-switch-on')
    });
  });

  describe('https everywhere off', function () {
    before(() => {
      return subject.pushData(dataOff);
    });

    headerProtected();

    httpsUiTests(dataOff);

    it('renders correct colour of switch', function () {
      chai.expect(subject.getComputedStyle('#https .cqz-switch-box').background).to.contain('rgb(246, 112, 87)');
    });

    it('renders "OFF"', function () {
      const onSelector = '#https .switches [data-i18n="control-center-switch-on"]';
      const offSelector = '#https .switches [data-i18n="control-center-switch-off"]';
      chai.expect(subject.query(onSelector)).to.exist;
      chai.expect(subject.query(offSelector)).to.exist;
      chai.expect(subject.getComputedStyle(onSelector).display).to.equal('none');
      chai.expect(subject.getComputedStyle(offSelector).display).to.not.equal('none');
      chai.expect(subject.query(offSelector).textContent.trim()).to.equal('control-center-switch-off')
    });
  });
})
