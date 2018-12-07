import {
  expect,
} from '../../core/test-helpers';
import Subject from './local-helpers';
import { dataOn, dataOffPage, dataOffSite, dataOffAll } from './fixtures/adblocker';

describe('Control Center: Ad-Block UI browser', function () {
  let subject;
  const target = 'control-center';

  before(function () {
    subject = new Subject();
  });

  function headerProtected() {
    context('control center header', function () {
      it('renders header', function () {
        expect(subject.query('#header')).to.exist;
      });

      it('renders cliqz logo', function () {
        expect(subject.query('#header .pause img')).to.exist;
        expect(subject.getComputedStyle(subject.query('#header .pause img')).display).to.not.equal('none');
        expect(subject.query('#header .pause img').getAttribute('src')).to.equal('./images/cliqz.svg');
      });

      it('renders "Your data is protected"', function () {
        expect(subject.query('#header .title [data-i18n="control_center_txt_header"]')).to.exist;
        expect(subject.getComputedStyle(subject.query('#header .title [data-i18n="control_center_txt_header"]')).display).to.not.equal('none');
        expect(subject.getComputedStyle(subject.query('#header .title [data-i18n="control_center_txt_header_not"][data-visible-on-state="inactive"]')).display).to.equal('none');
        expect(subject.getComputedStyle(subject.query('#header .title [data-i18n="control_center_txt_header_not"][data-visible-on-state="critical"]')).display).to.equal('none');
        expect(subject.query('#header .title [data-i18n="control_center_txt_header"]').textContent.trim()).to.equal('control_center_txt_header');
      });

      it('doesn\'t render warning icon', function () {
        expect(subject.query('#header .title img')).to.exist;
        expect(subject.getComputedStyle(subject.query('#header .title img')).display).to.equal('none');
      });
    });
  }

  function adBlockerUiTests() {
    it('renders ad-blocker box', function () {
      expect(subject.query('#ad-blocking')).to.not.be.null;
    });

    it('renders info button', function () {
      expect(subject.query('#ad-blocking .title .cc-tooltip')).to.exist;
    });

    it('renders title', function () {
      const titleSelector = '#ad-blocking .title [data-i18n="control_center_adblock_title"]';
      expect(subject.query(titleSelector)).to.exist;
      expect(subject.query(titleSelector).textContent.trim()).to.equal('control_center_adblock_title');
    });

    it('renders arrow', function () {
      expect(subject.query('#ad-blocking .title #smallarrow')).to.exist;
    });

    it('renders switch', function () {
      expect(subject.query('#ad-blocking .title .switches .cqz-switch-box')).to.exist;
    });

    it('renders ad-block icon', function () {
      expect(subject.query('#ad-blocking .settings-section-row .counter #block')).to.exist;
    });
  }

  it('loads', function () {
    expect(true).to.eql(true);
  });

  describe('ad-blocker on', function () {
    before(function () {
      subject.respondsWith({
        module: target,
        action: 'getData',
        response: dataOn
      });
      return subject.load();
    });

    after(function () {
      subject.unload();
    });

    headerProtected();
    adBlockerUiTests();

    it('renders correct colour of switch', function () {
      expect(subject.getComputedStyle(subject.query('#ad-blocking .cqz-switch-box')).background).to.contain('rgb(0, 173, 239)');
    });

    it('renders "ON"', function () {
      const onSelector = '#ad-blocking .switches [data-visible-on-state="active"][data-i18n="control_center_switch_on"]';
      const offSelector = '#ad-blocking .switches [data-visible-on-state="off"][data-i18n="control_center_switch_off"]';
      expect(subject.query(onSelector)).to.exist;
      expect(subject.query(offSelector)).to.exist;
      expect(subject.getComputedStyle(subject.query(onSelector)).display).to.not.equal('none');
      expect(subject.getComputedStyle(subject.query(offSelector)).display).to.equal('none');
      expect(subject.query(onSelector).textContent.trim()).to.equal('control_center_switch_on');
    });

    it('renders text about ads', function () {
      const onSelector = '#ad-blocking .row-text [data-visible-on-state="active"][data-i18n="control_center_adblock_description"]';
      const pageSelector = '#ad-blocking .row-text [data-visible-on-state="off"][data-i18n="control_center_adblock_description_off_website"]';
      const domainSelector = '#ad-blocking .row-text [data-visible-on-state="off"][data-i18n="control_center_adblock_description_off_domain"]';
      const allSelector = '#ad-blocking .row-text [data-visible-on-state="off"][data-i18n="control_center_adblock_description_off_all"]';
      expect(subject.query(onSelector)).to.exist;
      expect(subject.query(pageSelector)).to.exist;
      expect(subject.query(domainSelector)).to.exist;
      expect(subject.query(allSelector)).to.exist;
      expect(subject.getComputedStyle(subject.query(onSelector)).display).to.not.equal('none');
      expect(subject.getComputedStyle(subject.query(pageSelector)).display).to.equal('none');
      expect(subject.getComputedStyle(subject.query(domainSelector)).display).to.equal('none');
      expect(subject.getComputedStyle(subject.query(allSelector)).display).to.equal('none');
      expect(subject.query(onSelector).textContent.trim()).to.equal('control_center_adblock_description');
    });

    it('dropdown is invisible', function () {
      const dropdownSelector = '#ad-blocking .new-dropdown .dropdown-btn';
      expect(subject.query(dropdownSelector)).to.exist;
      expect(subject.getComputedStyle(subject.query(dropdownSelector)).display).to.equal('none');
    });

    it('renders correct amount of blocked ads', function () {
      const adsNumberSelector = '#ad-blocking .counter #count';
      const adsNumberActiveSelector = `${adsNumberSelector} [data-visible-on-state="active"]`;
      const adsNumberOffSelector = `${adsNumberSelector} [data-visible-on-state="off"]`;
      expect(subject.query(adsNumberSelector)).to.exist;
      expect(subject.query(adsNumberActiveSelector)).to.exist;
      expect(subject.query(adsNumberOffSelector)).to.exist;
      expect(subject.query(adsNumberActiveSelector).textContent.trim())
        .to.equal(dataOn.module.adblocker.totalCount.toString());
      expect(subject.getComputedStyle(subject.query(adsNumberActiveSelector)).display).to.not.equal('none');
      expect(subject.getComputedStyle(subject.query(adsNumberOffSelector)).display).to.equal('none');
    });
  });

  describe('ad-blocker off for the particular page', function () {
    before(function () {
      subject.respondsWith({
        module: target,
        action: 'getData',
        response: dataOffPage
      });
      return subject.load();
    });

    after(function () {
      subject.unload();
    });

    headerProtected();
    adBlockerUiTests();

    it('renders correct colour of switch', function () {
      expect(subject.getComputedStyle(subject.query('#ad-blocking .cqz-switch-box')).background).to.contain('rgb(255, 126, 116)');
    });

    it('renders "OFF"', function () {
      const onSelector = '#ad-blocking .switches [data-visible-on-state="active"][data-i18n="control_center_switch_on"]';
      const offSelector = '#ad-blocking .switches [data-visible-on-state="off"][data-i18n="control_center_switch_off"]';
      expect(subject.query(onSelector)).to.exist;
      expect(subject.query(offSelector)).to.exist;
      expect(subject.getComputedStyle(subject.query(onSelector)).display).to.equal('none');
      expect(subject.getComputedStyle(subject.query(offSelector)).display).to.not.equal('none');
      expect(subject.query(offSelector).textContent.trim()).to.equal('control_center_switch_off');
    });

    it('renders text about ads', function () {
      const onSelector = '#ad-blocking .row-text [data-visible-on-state="active"][data-i18n="control_center_adblock_description"]';
      const pageSelector = '#ad-blocking .row-text [data-visible-on-state="off"][data-i18n="control_center_adblock_description_off_website"]';
      const domainSelector = '#ad-blocking .row-text [data-visible-on-state="off"][data-i18n="control_center_adblock_description_off_domain"]';
      const allSelector = '#ad-blocking .row-text [data-visible-on-state="off"][data-i18n="control_center_adblock_description_off_all"]';
      expect(subject.query(onSelector)).to.exist;
      expect(subject.query(pageSelector)).to.exist;
      expect(subject.query(domainSelector)).to.exist;
      expect(subject.query(allSelector)).to.exist;
      expect(subject.getComputedStyle(subject.query(onSelector)).display).to.equal('none');
      expect(subject.getComputedStyle(subject.query(pageSelector)).display).to.not.equal('none');
      expect(subject.getComputedStyle(subject.query(domainSelector)).display).to.equal('none');
      expect(subject.getComputedStyle(subject.query(allSelector)).display).to.equal('none');
      expect(subject.query(pageSelector).textContent.trim()).to.equal('control_center_adblock_description_off_website');
    });

    it('dropdown is visible', function () {
      const dropdownSelector = '#ad-blocking .new-dropdown .dropdown-btn';
      expect(subject.query(dropdownSelector)).to.exist;
      expect(subject.getComputedStyle(subject.query(dropdownSelector)).display).to.not.equal('none');
    });

    it('renders correct text in dropdown', function () {
      const pageSelector = '#ad-blocking .new-dropdown .dropdown-content-option-text[data-i18n="control_center_this_site"]';
      const domainSelector = '#ad-blocking .new-dropdown .dropdown-content-option-text[data-i18n="control_center_this_domain"]';
      const allSelector = '#ad-blocking .new-dropdown .dropdown-content-option-text[data-i18n="control_center_all_sites"]';
      expect(subject.query(pageSelector)).to.exist;
      expect(subject.query(domainSelector)).to.exist;
      expect(subject.query(allSelector)).to.exist;
      expect(subject.getComputedStyle(subject.query(pageSelector)).display).to.not.equal('none');
      expect(subject.getComputedStyle(subject.query(domainSelector)).display).to.equal('none');
      expect(subject.getComputedStyle(subject.query(allSelector)).display).to.equal('none');
      expect(subject.query(pageSelector).textContent.trim()).to.equal('control_center_this_site');
    });

    it('renders correct amount of blocked ads', function () {
      const adsNumberSelector = '#ad-blocking .counter #count';
      const adsNumberActiveSelector = `${adsNumberSelector} [data-visible-on-state="active"]`;
      const adsNumberOffSelector = `${adsNumberSelector} [data-visible-on-state="off"]`;
      expect(subject.query(adsNumberSelector)).to.exist;
      expect(subject.query(adsNumberActiveSelector)).to.exist;
      expect(subject.query(adsNumberOffSelector)).to.exist;
      expect(subject.getComputedStyle(subject.query(adsNumberActiveSelector)).display).to.equal('none');
      expect(subject.getComputedStyle(subject.query(adsNumberOffSelector)).display).to.not.equal('none');
      expect(subject.query(adsNumberOffSelector).textContent.trim()).to.equal('0');
    });
  });

  describe('ad-blocker off for the particular domain', function () {
    before(function () {
      subject.respondsWith({
        module: target,
        action: 'getData',
        response: dataOffSite
      });
      return subject.load();
    });

    after(function () {
      subject.unload();
    });

    headerProtected();
    adBlockerUiTests();

    it('renders correct colour of switch', function () {
      expect(subject.getComputedStyle(subject.query('#ad-blocking .cqz-switch-box')).background).to.contain('rgb(255, 126, 116)');
    });

    it('renders "OFF"', function () {
      const onSelector = '#ad-blocking .switches [data-visible-on-state="active"][data-i18n="control_center_switch_on"]';
      const offSelector = '#ad-blocking .switches [data-visible-on-state="off"][data-i18n="control_center_switch_off"]';
      expect(subject.query(onSelector)).to.exist;
      expect(subject.query(offSelector)).to.exist;
      expect(subject.getComputedStyle(subject.query(onSelector)).display).to.equal('none');
      expect(subject.getComputedStyle(subject.query(offSelector)).display).to.not.equal('none');
      expect(subject.query(offSelector).textContent.trim()).to.equal('control_center_switch_off');
    });

    it('renders text about ads', function () {
      const onSelector = '#ad-blocking .row-text [data-visible-on-state="active"][data-i18n="control_center_adblock_description"]';
      const pageSelector = '#ad-blocking .row-text [data-visible-on-state="off"][data-i18n="control_center_adblock_description_off_website"]';
      const domainSelector = '#ad-blocking .row-text [data-visible-on-state="off"][data-i18n="control_center_adblock_description_off_domain"]';
      const allSelector = '#ad-blocking .row-text [data-visible-on-state="off"][data-i18n="control_center_adblock_description_off_all"]';
      expect(subject.query(onSelector)).to.exist;
      expect(subject.query(pageSelector)).to.exist;
      expect(subject.query(domainSelector)).to.exist;
      expect(subject.query(allSelector)).to.exist;
      expect(subject.getComputedStyle(subject.query(onSelector)).display).to.equal('none');
      expect(subject.getComputedStyle(subject.query(pageSelector)).display).to.equal('none');
      expect(subject.getComputedStyle(subject.query(domainSelector)).display).to.not.equal('none');
      expect(subject.getComputedStyle(subject.query(allSelector)).display).to.equal('none');
      expect(subject.query(domainSelector).textContent.trim()).to.equal('control_center_adblock_description_off_domain');
    });

    it('dropdown is visible', function () {
      const dropdownSelector = '#ad-blocking .new-dropdown .dropdown-btn';
      expect(subject.query(dropdownSelector)).to.exist;
      expect(subject.getComputedStyle(subject.query(dropdownSelector)).display).to.not.equal('none');
    });

    it('renders correct text in dropdown', function () {
      const pageSelector = '#ad-blocking .new-dropdown .dropdown-content-option-text[data-i18n="control_center_this_site"]';
      const domainSelector = '#ad-blocking .new-dropdown .dropdown-content-option-text[data-i18n="control_center_this_domain"]';
      const allSelector = '#ad-blocking .new-dropdown .dropdown-content-option-text[data-i18n="control_center_all_sites"]';
      expect(subject.query(pageSelector)).to.exist;
      expect(subject.query(domainSelector)).to.exist;
      expect(subject.query(allSelector)).to.exist;
      expect(subject.getComputedStyle(subject.query(pageSelector)).display).to.equal('none');
      expect(subject.getComputedStyle(subject.query(domainSelector)).display).to.not.equal('none');
      expect(subject.getComputedStyle(subject.query(allSelector)).display).to.equal('none');
      expect(subject.query(domainSelector).textContent.trim()).to.equal('control_center_this_domain');
    });

    it('renders correct amount of blocked ads', function () {
      const adsNumberSelector = '#ad-blocking .counter #count';
      const adsNumberActiveSelector = `${adsNumberSelector} [data-visible-on-state="active"]`;
      const adsNumberOffSelector = `${adsNumberSelector} [data-visible-on-state="off"]`;
      expect(subject.query(adsNumberSelector)).to.exist;
      expect(subject.query(adsNumberActiveSelector)).to.exist;
      expect(subject.query(adsNumberOffSelector)).to.exist;
      expect(subject.getComputedStyle(subject.query(adsNumberActiveSelector)).display).to.equal('none');
      expect(subject.getComputedStyle(subject.query(adsNumberOffSelector)).display).to.not.equal('none');
      expect(subject.query(adsNumberOffSelector).textContent.trim()).to.equal('0');
    });
  });

  describe('ad-blocker off for all websites', function () {
    before(function () {
      subject.respondsWith({
        module: target,
        action: 'getData',
        response: dataOffAll
      });
      return subject.load();
    });

    after(function () {
      subject.unload();
    });

    headerProtected();
    adBlockerUiTests();

    it('renders correct colour of switch', function () {
      expect(subject.getComputedStyle(subject.query('#ad-blocking .cqz-switch-box')).background).to.contain('rgb(255, 126, 116)');
    });

    it('renders "OFF"', function () {
      const onSelector = '#ad-blocking .switches [data-visible-on-state="active"][data-i18n="control_center_switch_on"]';
      const offSelector = '#ad-blocking .switches [data-visible-on-state="off"][data-i18n="control_center_switch_off"]';
      expect(subject.query(onSelector)).to.exist;
      expect(subject.query(offSelector)).to.exist;
      expect(subject.getComputedStyle(subject.query(onSelector)).display).to.equal('none');
      expect(subject.getComputedStyle(subject.query(offSelector)).display).to.not.equal('none');
      expect(subject.query(offSelector).textContent.trim()).to.equal('control_center_switch_off');
    });

    it('renders text about ads', function () {
      const onSelector = '#ad-blocking .row-text [data-visible-on-state="active"][data-i18n="control_center_adblock_description"]';
      const pageSelector = '#ad-blocking .row-text [data-visible-on-state="off"][data-i18n="control_center_adblock_description_off_website"]';
      const domainSelector = '#ad-blocking .row-text [data-visible-on-state="off"][data-i18n="control_center_adblock_description_off_domain"]';
      const allSelector = '#ad-blocking .row-text [data-visible-on-state="off"][data-i18n="control_center_adblock_description_off_all"]';
      expect(subject.query(onSelector)).to.exist;
      expect(subject.query(pageSelector)).to.exist;
      expect(subject.query(domainSelector)).to.exist;
      expect(subject.query(allSelector)).to.exist;
      expect(subject.getComputedStyle(subject.query(onSelector)).display).to.equal('none');
      expect(subject.getComputedStyle(subject.query(pageSelector)).display).to.equal('none');
      expect(subject.getComputedStyle(subject.query(domainSelector)).display).to.equal('none');
      expect(subject.getComputedStyle(subject.query(allSelector)).display).to.not.equal('none');
      expect(subject.query(allSelector).textContent.trim()).to.equal('control_center_adblock_description_off_all');
    });

    it('dropdown is visible', function () {
      const dropdownSelector = '#ad-blocking .new-dropdown .dropdown-btn';
      expect(subject.query(dropdownSelector)).to.exist;
      expect(subject.getComputedStyle(subject.query(dropdownSelector)).display).to.not.equal('none');
    });

    it('renders correct text in dropdown', function () {
      const pageSelector = '#ad-blocking .new-dropdown .dropdown-content-option-text[data-i18n="control_center_this_site"]';
      const domainSelector = '#ad-blocking .new-dropdown .dropdown-content-option-text[data-i18n="control_center_this_domain"]';
      const allSelector = '#ad-blocking .new-dropdown .dropdown-content-option-text[data-i18n="control_center_all_sites"]';
      expect(subject.query(pageSelector)).to.exist;
      expect(subject.query(domainSelector)).to.exist;
      expect(subject.query(allSelector)).to.exist;
      expect(subject.getComputedStyle(subject.query(pageSelector)).display).to.equal('none');
      expect(subject.getComputedStyle(subject.query(domainSelector)).display).to.equal('none');
      expect(subject.getComputedStyle(subject.query(allSelector)).display).to.not.equal('none');
      expect(subject.query(allSelector).textContent.trim()).to.equal('control_center_all_sites');
    });

    it('renders correct amount of blocked ads', function () {
      const adsNumberSelector = '#ad-blocking .counter #count';
      const adsNumberActiveSelector = `${adsNumberSelector} [data-visible-on-state="active"]`;
      const adsNumberOffSelector = `${adsNumberSelector} [data-visible-on-state="off"]`;
      expect(subject.query(adsNumberSelector)).to.exist;
      expect(subject.query(adsNumberActiveSelector)).to.exist;
      expect(subject.query(adsNumberOffSelector)).to.exist;
      expect(subject.getComputedStyle(subject.query(adsNumberActiveSelector)).display).to.equal('none');
      expect(subject.getComputedStyle(subject.query(adsNumberOffSelector)).display).to.not.equal('none');
      expect(subject.query(adsNumberOffSelector).textContent.trim()).to.equal('0');
    });
  });
});
