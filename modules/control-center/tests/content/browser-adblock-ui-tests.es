import {
  wait,
  registerInterval,
  clearIntervals,
  waitFor,
  Subject
} from './helpers';

import {dataOn, dataOffPage, dataOffSite, dataOffAll} from './fixtures/adblocker';

describe("Control Center: Ad-Block UI browser", function () {
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

  function adBlockerUiTests(data) {
    it("renders ad-blocker box", function () {
      chai.expect(subject.query('#ad-blocking')).to.not.be.null;
    });

    it('renders info button', function () {
      chai.expect(subject.query('#ad-blocking .title .infobutton')).to.exist;
    });

    it('renders title', function () {
      const titleSelector = '#ad-blocking .title [data-i18n="control-center-adblock-title"]';
      chai.expect(subject.query(titleSelector)).to.exist;
      chai.expect(subject.query(titleSelector).textContent.trim()).to.equal('control-center-adblock-title');
    });

    it('renders arrow', function () {
      chai.expect(subject.query('#ad-blocking .title #smallarrow')).to.exist;
    });

    it('renders switch', function () {
      chai.expect(subject.query('#ad-blocking .title .switches .cqz-switch-box')).to.exist;
    });

    it('renders ad-block icon', function () {
      chai.expect(subject.query('#ad-blocking .settings-section-row .counter #block')).to.exist;
    });
  };

  it('loads', function () {
    chai.expect(true).to.eql(true);
  });

  describe('ad-blocker on', function () {

    before(() => {
      return subject.pushData(dataOn);
    });

    headerProtected();
    adBlockerUiTests(dataOn);

    it('renders correct colour of switch', function () {
      chai.expect(subject.getComputedStyle('#ad-blocking .cqz-switch-box').background).to.contain('rgb(0, 173, 239)');
    });

    it('renders "ON"', function () {
      const onSelector = '#ad-blocking .switches [visible-on-state="active"][data-i18n="control-center-switch-on"]';
      const offSelector = '#ad-blocking .switches [visible-on-state="off"][data-i18n="control-center-switch-off"]';
      chai.expect(subject.query(onSelector)).to.exist;
      chai.expect(subject.query(offSelector)).to.exist;
      chai.expect(subject.getComputedStyle(onSelector).display).to.not.equal('none');
      chai.expect(subject.getComputedStyle(offSelector).display).to.equal('none');
      chai.expect(subject.query(onSelector).textContent.trim()).to.equal('control-center-switch-on')
    });

    it('renders text about ads', function () {
      const onSelector = '#ad-blocking .row-text [visible-on-state="active"][data-i18n="control-center-adblock-description"]';
      const pageSelector = '#ad-blocking .row-text [visible-on-state="off"][data-i18n="control-center-adblock-description-off-website"]';
      const domainSelector = '#ad-blocking .row-text [visible-on-state="off"][data-i18n="control-center-adblock-description-off-domain"]';
      const allSelector = '#ad-blocking .row-text [visible-on-state="off"][data-i18n="control-center-adblock-description-off-all"]';
      chai.expect(subject.query(onSelector)).to.exist;
      chai.expect(subject.query(pageSelector)).to.exist;
      chai.expect(subject.query(domainSelector)).to.exist;
      chai.expect(subject.query(allSelector)).to.exist;
      chai.expect(subject.getComputedStyle(onSelector).display).to.not.equal('none');
      chai.expect(subject.getComputedStyle(pageSelector).display).to.equal('none');
      chai.expect(subject.getComputedStyle(domainSelector).display).to.equal('none');
      chai.expect(subject.getComputedStyle(allSelector).display).to.equal('none');
      chai.expect(subject.query(onSelector).textContent.trim()).to.equal('control-center-adblock-description');
    });

    it('dropdown is invisible', function () {
      const dropdownSelector = '#ad-blocking .new-dropdown .dropdown-btn';
      chai.expect(subject.query(dropdownSelector)).to.exist;
      chai.expect(subject.getComputedStyle(dropdownSelector).display).to.equal('none');
    });

    it('renders correct amount of blocked ads', function () {
      const adsNumberSelector = '#ad-blocking .counter #count';
      const adsNumberActiveSelector = adsNumberSelector + ' [visible-on-state="active"]';
      const adsNumberOffSelector = adsNumberSelector + ' [visible-on-state="off"]';
      chai.expect(subject.query(adsNumberSelector)).to.exist;
      chai.expect(subject.query(adsNumberActiveSelector)).to.exist;
      chai.expect(subject.query(adsNumberOffSelector)).to.exist;
      chai.expect(subject.query(adsNumberActiveSelector).textContent.trim()).to.equal(dataOn.module.adblocker.totalCount.toString());
      chai.expect(subject.getComputedStyle(adsNumberActiveSelector).display).to.not.equal('none');
      chai.expect(subject.getComputedStyle(adsNumberOffSelector).display).to.equal('none');
      //chai.expect(subject.query(adsNumberOffSelector).textContent.trim()).to.equal('0');
    });
  });

  describe('ad-blocker off for the particular page', function () {
    before(() => {
      return subject.pushData(dataOffPage);
    });

    headerProtected();
    adBlockerUiTests(dataOffPage);

    it('renders correct colour of switch', function () {
      chai.expect(subject.getComputedStyle('#ad-blocking .cqz-switch-box').background).to.contain('rgb(255, 126, 116)');
    });

    it('renders "OFF"', function () {
      const onSelector = '#ad-blocking .switches [visible-on-state="active"][data-i18n="control-center-switch-on"]';
      const offSelector = '#ad-blocking .switches [visible-on-state="off"][data-i18n="control-center-switch-off"]';
      chai.expect(subject.query(onSelector)).to.exist;
      chai.expect(subject.query(offSelector)).to.exist;
      chai.expect(subject.getComputedStyle(onSelector).display).to.equal('none');
      chai.expect(subject.getComputedStyle(offSelector).display).to.not.equal('none');
      chai.expect(subject.query(offSelector).textContent.trim()).to.equal('control-center-switch-off')
    });

    it('renders text about ads', function () {
      const onSelector = '#ad-blocking .row-text [visible-on-state="active"][data-i18n="control-center-adblock-description"]';
      const pageSelector = '#ad-blocking .row-text [visible-on-state="off"][data-i18n="control-center-adblock-description-off-website"]';
      const domainSelector = '#ad-blocking .row-text [visible-on-state="off"][data-i18n="control-center-adblock-description-off-domain"]';
      const allSelector = '#ad-blocking .row-text [visible-on-state="off"][data-i18n="control-center-adblock-description-off-all"]';
      chai.expect(subject.query(onSelector)).to.exist;
      chai.expect(subject.query(pageSelector)).to.exist;
      chai.expect(subject.query(domainSelector)).to.exist;
      chai.expect(subject.query(allSelector)).to.exist;
      chai.expect(subject.getComputedStyle(onSelector).display).to.equal('none');
      chai.expect(subject.getComputedStyle(pageSelector).display).to.not.equal('none');
      chai.expect(subject.getComputedStyle(domainSelector).display).to.equal('none');
      chai.expect(subject.getComputedStyle(allSelector).display).to.equal('none');
      chai.expect(subject.query(pageSelector).textContent.trim()).to.equal('control-center-adblock-description-off-website');
    });

    it('dropdown is visible', function () {
      const dropdownSelector = '#ad-blocking .new-dropdown .dropdown-btn';
      chai.expect(subject.query(dropdownSelector)).to.exist;
      chai.expect(subject.getComputedStyle(dropdownSelector).display).to.not.equal('none');
    });

    it('renders correct text in dropdown', function () {
      const pageSelector = '#ad-blocking .new-dropdown .dropdown-content-option-text[data-i18n="control-center-this-site"]';
      const domainSelector = '#ad-blocking .new-dropdown .dropdown-content-option-text[data-i18n="control-center-this-domain"]';
      const allSelector = '#ad-blocking .new-dropdown .dropdown-content-option-text[data-i18n="control-center-all-sites"]';
      chai.expect(subject.query(pageSelector)).to.exist;
      chai.expect(subject.query(domainSelector)).to.exist;
      chai.expect(subject.query(allSelector)).to.exist;
      chai.expect(subject.getComputedStyle(pageSelector).display).to.not.equal('none');
      chai.expect(subject.getComputedStyle(domainSelector).display).to.equal('none');
      chai.expect(subject.getComputedStyle(allSelector).display).to.equal('none');
      chai.expect(subject.query(pageSelector).textContent.trim()).to.equal('control-center-this-site');
    });

    it('renders correct amount of blocked ads', function () {
      const adsNumberSelector = '#ad-blocking .counter #count';
      const adsNumberActiveSelector = adsNumberSelector + ' [visible-on-state="active"]';
      const adsNumberOffSelector = adsNumberSelector + ' [visible-on-state="off"]';
      chai.expect(subject.query(adsNumberSelector)).to.exist;
      chai.expect(subject.query(adsNumberActiveSelector)).to.exist;
      chai.expect(subject.query(adsNumberOffSelector)).to.exist;
      chai.expect(subject.getComputedStyle(adsNumberActiveSelector).display).to.equal('none');
      chai.expect(subject.getComputedStyle(adsNumberOffSelector).display).to.not.equal('none');
      chai.expect(subject.query(adsNumberOffSelector).textContent.trim()).to.equal('0');
    });
  });

  describe('ad-blocker off for the particular domain', function () {
    before(() => {
      return subject.pushData(dataOffSite);
    });

    headerProtected();
    adBlockerUiTests(dataOffSite);

    it('renders correct colour of switch', function () {
      chai.expect(subject.getComputedStyle('#ad-blocking .cqz-switch-box').background).to.contain('rgb(255, 126, 116)');
    });

    it('renders "OFF"', function () {
      const onSelector = '#ad-blocking .switches [visible-on-state="active"][data-i18n="control-center-switch-on"]';
      const offSelector = '#ad-blocking .switches [visible-on-state="off"][data-i18n="control-center-switch-off"]';
      chai.expect(subject.query(onSelector)).to.exist;
      chai.expect(subject.query(offSelector)).to.exist;
      chai.expect(subject.getComputedStyle(onSelector).display).to.equal('none');
      chai.expect(subject.getComputedStyle(offSelector).display).to.not.equal('none');
      chai.expect(subject.query(offSelector).textContent.trim()).to.equal('control-center-switch-off')
    });

    it('renders text about ads', function () {
      const onSelector = '#ad-blocking .row-text [visible-on-state="active"][data-i18n="control-center-adblock-description"]';
      const pageSelector = '#ad-blocking .row-text [visible-on-state="off"][data-i18n="control-center-adblock-description-off-website"]';
      const domainSelector = '#ad-blocking .row-text [visible-on-state="off"][data-i18n="control-center-adblock-description-off-domain"]';
      const allSelector = '#ad-blocking .row-text [visible-on-state="off"][data-i18n="control-center-adblock-description-off-all"]';
      chai.expect(subject.query(onSelector)).to.exist;
      chai.expect(subject.query(pageSelector)).to.exist;
      chai.expect(subject.query(domainSelector)).to.exist;
      chai.expect(subject.query(allSelector)).to.exist;
      chai.expect(subject.getComputedStyle(onSelector).display).to.equal('none');
      chai.expect(subject.getComputedStyle(pageSelector).display).to.equal('none');
      chai.expect(subject.getComputedStyle(domainSelector).display).to.not.equal('none');
      chai.expect(subject.getComputedStyle(allSelector).display).to.equal('none');
      chai.expect(subject.query(domainSelector).textContent.trim()).to.equal('control-center-adblock-description-off-domain');
    });

    it('dropdown is visible', function () {
      const dropdownSelector = '#ad-blocking .new-dropdown .dropdown-btn';
      chai.expect(subject.query(dropdownSelector)).to.exist;
      chai.expect(subject.getComputedStyle(dropdownSelector).display).to.not.equal('none');
    });

    it('renders correct text in dropdown', function () {
      const pageSelector = '#ad-blocking .new-dropdown .dropdown-content-option-text[data-i18n="control-center-this-site"]';
      const domainSelector = '#ad-blocking .new-dropdown .dropdown-content-option-text[data-i18n="control-center-this-domain"]';
      const allSelector = '#ad-blocking .new-dropdown .dropdown-content-option-text[data-i18n="control-center-all-sites"]';
      chai.expect(subject.query(pageSelector)).to.exist;
      chai.expect(subject.query(domainSelector)).to.exist;
      chai.expect(subject.query(allSelector)).to.exist;
      chai.expect(subject.getComputedStyle(pageSelector).display).to.equal('none');
      chai.expect(subject.getComputedStyle(domainSelector).display).to.not.equal('none');
      chai.expect(subject.getComputedStyle(allSelector).display).to.equal('none');
      chai.expect(subject.query(domainSelector).textContent.trim()).to.equal('control-center-this-domain');
    });

    it('renders correct amount of blocked ads', function () {
      const adsNumberSelector = '#ad-blocking .counter #count';
      const adsNumberActiveSelector = adsNumberSelector + ' [visible-on-state="active"]';
      const adsNumberOffSelector = adsNumberSelector + ' [visible-on-state="off"]';
      chai.expect(subject.query(adsNumberSelector)).to.exist;
      chai.expect(subject.query(adsNumberActiveSelector)).to.exist;
      chai.expect(subject.query(adsNumberOffSelector)).to.exist;
      chai.expect(subject.getComputedStyle(adsNumberActiveSelector).display).to.equal('none');
      chai.expect(subject.getComputedStyle(adsNumberOffSelector).display).to.not.equal('none');
      chai.expect(subject.query(adsNumberOffSelector).textContent.trim()).to.equal('0');
    });
  });

  describe('ad-blocker off for all websites', function () {
    before(() => {
      return subject.pushData(dataOffAll);
    });

    headerProtected();
    adBlockerUiTests(dataOffAll);

    it('renders correct colour of switch', function () {
      chai.expect(subject.getComputedStyle('#ad-blocking .cqz-switch-box').background).to.contain('rgb(255, 126, 116)');
    });

    it('renders "OFF"', function () {
      const onSelector = '#ad-blocking .switches [visible-on-state="active"][data-i18n="control-center-switch-on"]';
      const offSelector = '#ad-blocking .switches [visible-on-state="off"][data-i18n="control-center-switch-off"]';
      chai.expect(subject.query(onSelector)).to.exist;
      chai.expect(subject.query(offSelector)).to.exist;
      chai.expect(subject.getComputedStyle(onSelector).display).to.equal('none');
      chai.expect(subject.getComputedStyle(offSelector).display).to.not.equal('none');
      chai.expect(subject.query(offSelector).textContent.trim()).to.equal('control-center-switch-off')
    });

    it('renders text about ads', function () {
      const onSelector = '#ad-blocking .row-text [visible-on-state="active"][data-i18n="control-center-adblock-description"]';
      const pageSelector = '#ad-blocking .row-text [visible-on-state="off"][data-i18n="control-center-adblock-description-off-website"]';
      const domainSelector = '#ad-blocking .row-text [visible-on-state="off"][data-i18n="control-center-adblock-description-off-domain"]';
      const allSelector = '#ad-blocking .row-text [visible-on-state="off"][data-i18n="control-center-adblock-description-off-all"]';
      chai.expect(subject.query(onSelector)).to.exist;
      chai.expect(subject.query(pageSelector)).to.exist;
      chai.expect(subject.query(domainSelector)).to.exist;
      chai.expect(subject.query(allSelector)).to.exist;
      chai.expect(subject.getComputedStyle(onSelector).display).to.equal('none');
      chai.expect(subject.getComputedStyle(pageSelector).display).to.equal('none');
      chai.expect(subject.getComputedStyle(domainSelector).display).to.equal('none');
      chai.expect(subject.getComputedStyle(allSelector).display).to.not.equal('none');
      chai.expect(subject.query(allSelector).textContent.trim()).to.equal('control-center-adblock-description-off-all');
    });

    it('dropdown is visible', function () {
      const dropdownSelector = '#ad-blocking .new-dropdown .dropdown-btn';
      chai.expect(subject.query(dropdownSelector)).to.exist;
      chai.expect(subject.getComputedStyle(dropdownSelector).display).to.not.equal('none');
    });

    it('renders correct text in dropdown', function () {
      const pageSelector = '#ad-blocking .new-dropdown .dropdown-content-option-text[data-i18n="control-center-this-site"]';
      const domainSelector = '#ad-blocking .new-dropdown .dropdown-content-option-text[data-i18n="control-center-this-domain"]';
      const allSelector = '#ad-blocking .new-dropdown .dropdown-content-option-text[data-i18n="control-center-all-sites"]';
      chai.expect(subject.query(pageSelector)).to.exist;
      chai.expect(subject.query(domainSelector)).to.exist;
      chai.expect(subject.query(allSelector)).to.exist;
      chai.expect(subject.getComputedStyle(pageSelector).display).to.equal('none');
      chai.expect(subject.getComputedStyle(domainSelector).display).to.equal('none');
      chai.expect(subject.getComputedStyle(allSelector).display).to.not.equal('none');
      chai.expect(subject.query(allSelector).textContent.trim()).to.equal('control-center-all-sites');
    });

    it('renders correct amount of blocked ads', function () {
      const adsNumberSelector = '#ad-blocking .counter #count';
      const adsNumberActiveSelector = adsNumberSelector + ' [visible-on-state="active"]';
      const adsNumberOffSelector = adsNumberSelector + ' [visible-on-state="off"]';
      chai.expect(subject.query(adsNumberSelector)).to.exist;
      chai.expect(subject.query(adsNumberActiveSelector)).to.exist;
      chai.expect(subject.query(adsNumberOffSelector)).to.exist;
      chai.expect(subject.getComputedStyle(adsNumberActiveSelector).display).to.equal('none');
      chai.expect(subject.getComputedStyle(adsNumberOffSelector).display).to.not.equal('none');
      chai.expect(subject.query(adsNumberOffSelector).textContent.trim()).to.equal('0');
    });
  });
})
