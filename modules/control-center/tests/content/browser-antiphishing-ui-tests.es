import {
  wait,
  registerInterval,
  clearIntervals,
  waitFor,
  Subject
} from './helpers';

import {generateDataOn, generateDataOffSite, generateDataOffAll} from './fixtures/antiphishing';

function antiphishingUiTests(amo) {
  const dataOn = generateDataOn(amo);
  const dataOffSite = generateDataOffSite(amo);
  const dataOffAll = generateDataOffAll(amo);
  let subject;

  before(function () {
    subject = new Subject();
    return subject.load();
  });

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
        chai.expect(subject.getComputedStyle('#header .title [data-i18n="control-center-txt-header-not"][data-visible-on-state="inactive"]').display).to.equal('none');
        chai.expect(subject.getComputedStyle('#header .title [data-i18n="control-center-txt-header-not"][data-visible-on-state="critical"]').display).to.equal('none');
        chai.expect(subject.query('#header .title [data-i18n="control-center-txt-header"]').textContent.trim()).to.equal('control-center-txt-header');
      });

      it('doesn\'t render warning icon', function () {
        chai.expect(subject.query('#header .title img')).to.exist;
        chai.expect(subject.getComputedStyle('#header .title img').display).to.equal('none');
      });
    });
  };

  function antiPhishingUiTests() {
    it("renders antiphishing box", function () {
      chai.expect(subject.query('#anti-phising')).to.not.be.null;
    });

    it('renders info button', function () {
      chai.expect(subject.query('#anti-phising .title .infobutton')).to.exist;
    });

    it('renders title', function () {
      chai.expect(subject.query('#anti-phising .title>span')).to.exist;
      chai.expect(subject.query('#anti-phising .title>span').textContent.trim()).to.equal('Anti-Phishing');
    });

    it('renders switch', function () {
      chai.expect(subject.query('#anti-phising .title .switches .cqz-switch-box')).to.exist;
    });
  };

  it('loads', function () {
    chai.expect(true).to.eql(true);
  })

  describe('anti-phishing on', function () {
    before(() => {
      return subject.pushData(dataOn);
    });

    headerProtected();
    antiPhishingUiTests();

    it('dropdown is invisible', function () {
      chai.expect(subject.query('#anti-phising .new-dropdown .dropdown-btn')).to.exist;
      chai.expect(subject.getComputedStyle('#anti-phising .new-dropdown .dropdown-btn').display).to.equal('none');
    });

    it('renders correct colour of switch', function () {
      chai.expect(subject.getComputedStyle('#anti-phising .switches .cqz-switch-box').background).to.contain('rgb(0, 173, 239)');
    });

    it('renders "ON"', function () {
      chai.expect(subject.query('#anti-phising .switches [data-visible-on-state="active"][data-i18n="control-center-switch-on"]')).to.exist;
      chai.expect(subject.getComputedStyle('#anti-phising .switches [data-visible-on-state="active"][data-i18n="control-center-switch-on"]').display).to.not.equal('none');
      chai.expect(subject.query('#anti-phising .switches [data-invisible-on-state="active"][data-i18n="control-center-switch-off"]')).to.exist;
      chai.expect(subject.getComputedStyle('#anti-phising .switches [data-invisible-on-state="active"][data-i18n="control-center-switch-off"]').display).to.equal('none');
      chai.expect(subject.query('#anti-phising .switches [data-visible-on-state="active"][data-i18n="control-center-switch-on"]').textContent.trim()).to.equal('control-center-switch-on')
    });

  });

  describe('anti-phishing off for particular domain', function () {
    before(() => {
      return subject.pushData(dataOffSite);
    });

    headerProtected();
    antiPhishingUiTests();

    it('renders correct colour of switch', function () {
      chai.expect(subject.getComputedStyle('#anti-phising .switches .cqz-switch-box').background).to.contain('rgb(255, 126, 116)');
    });

    it('renders "OFF"', function () {
      chai.expect(subject.query('#anti-phising .switches [data-visible-on-state="active"][data-i18n="control-center-switch-on"]')).to.exist;
      chai.expect(subject.getComputedStyle('#anti-phising .switches [data-visible-on-state="active"][data-i18n="control-center-switch-on"]').display).to.equal('none');
      chai.expect(subject.query('#anti-phising .switches [data-invisible-on-state="active"][data-i18n="control-center-switch-off"]')).to.exist;
      chai.expect(subject.getComputedStyle('#anti-phising .switches [data-invisible-on-state="active"][data-i18n="control-center-switch-off"]').display).to.not.equal('none');
      chai.expect(subject.query('#anti-phising .switches [data-invisible-on-state="active"][data-i18n="control-center-switch-off"]').textContent.trim()).to.equal('control-center-switch-off')
    });

    it('renders dropdown with "This domain"', function () {
      chai.expect(subject.query('#anti-phising .new-dropdown .dropdown-btn [data-visible-on-state="inactive"][data-i18n="control-center-this-domain"]')).to.exist;
      chai.expect(subject.getComputedStyle('#anti-phising .new-dropdown .dropdown-btn [data-visible-on-state="inactive"][data-i18n="control-center-this-domain"]').display).to.not.equal('none');
      chai.expect(subject.query('#anti-phising .new-dropdown .dropdown-btn [data-visible-on-state="critical"][data-i18n="control-center-all-sites"]')).to.exist;
      chai.expect(subject.getComputedStyle('#anti-phising .new-dropdown .dropdown-btn [data-visible-on-state="critical"][data-i18n="control-center-all-sites"]').display).to.equal('none');
      chai.expect(subject.query('#anti-phising .new-dropdown .dropdown-btn [data-visible-on-state="inactive"][data-i18n="control-center-this-domain"]').textContent.trim()).to.equal('control-center-this-domain');
    });
  });

  describe('anti-phishing off for all websites', function () {


    before(() => {
      return subject.pushData(dataOffAll);
    });

    headerProtected();
    antiPhishingUiTests();

    it('renders correct colour of switch', function () {
      chai.expect(subject.getComputedStyle('#anti-phising .switches .cqz-switch-box').background).to.contain('rgb(255, 126, 116)');
    });

    it('renders "OFF"', function () {
      chai.expect(subject.query('#anti-phising .switches [data-visible-on-state="active"][data-i18n="control-center-switch-on"]')).to.exist;
      chai.expect(subject.getComputedStyle('#anti-phising .switches [data-visible-on-state="active"][data-i18n="control-center-switch-on"]').display).to.equal('none');
      chai.expect(subject.query('#anti-phising .switches [data-invisible-on-state="active"][data-i18n="control-center-switch-off"]')).to.exist;
      chai.expect(subject.getComputedStyle('#anti-phising .switches [data-invisible-on-state="active"][data-i18n="control-center-switch-off"]').display).to.not.equal('none');
      chai.expect(subject.query('#anti-phising .switches [data-invisible-on-state="active"][data-i18n="control-center-switch-off"]').textContent.trim()).to.equal('control-center-switch-off')
    });

    it('renders dropdown with "All websites"', function () {
      chai.expect(subject.query('#anti-phising .new-dropdown .dropdown-btn [data-visible-on-state="inactive"][data-i18n="control-center-this-domain"]')).to.exist;
      chai.expect(subject.getComputedStyle('#anti-phising .new-dropdown .dropdown-btn [data-visible-on-state="inactive"][data-i18n="control-center-this-domain"]').display).to.equal('none');
      chai.expect(subject.query('#anti-phising .new-dropdown .dropdown-btn [data-visible-on-state="critical"][data-i18n="control-center-all-sites"]')).to.exist;
      chai.expect(subject.getComputedStyle('#anti-phising .new-dropdown .dropdown-btn [data-visible-on-state="critical"][data-i18n="control-center-all-sites"]').display).to.not.equal('none');
      chai.expect(subject.query('#anti-phising .new-dropdown .dropdown-btn [data-visible-on-state="critical"][data-i18n="control-center-all-sites"]').textContent.trim()).to.equal('control-center-all-sites');
    });
  });
};

describe("Control Center: Anti-Phishing UI browser", function () {
  antiphishingUiTests(false);
});

describe('Control Center: AMO, Anti-Phishing UI tests', function () {
  antiphishingUiTests(true);
})
