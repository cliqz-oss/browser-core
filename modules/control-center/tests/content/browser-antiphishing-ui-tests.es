import {
  expect,
} from '../../core/test-helpers';
import Subject from './local-helpers';
import { generateDataOn, generateDataOffSite, generateDataOffAll } from './fixtures/antiphishing';

function antiphishingUiTests(amo) {
  const dataOn = generateDataOn(amo);
  const dataOffSite = generateDataOffSite(amo);
  const dataOffAll = generateDataOffAll(amo);
  const target = 'control-center';
  let subject;

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

  function antiPhishingUiTests() {
    it('renders antiphishing box', function () {
      expect(subject.query('#anti-phising')).to.not.be.null;
    });

    it('renders info button', function () {
      expect(subject.query('#anti-phising .title .cc-tooltip')).to.exist;
    });

    it('renders title', function () {
      expect(subject.query('#anti-phising .title>span')).to.exist;
      expect(subject.query('#anti-phising .title>span').textContent.trim()).to.equal('Anti-Phishing');
    });

    it('renders switch', function () {
      expect(subject.query('#anti-phising .title .switches .cqz-switch-box')).to.exist;
    });
  }

  describe('anti-phishing on', function () {
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
    antiPhishingUiTests();

    it('dropdown is invisible', function () {
      expect(subject.query('#anti-phising .new-dropdown .dropdown-btn')).to.exist;
      expect(subject.getComputedStyle(subject.query('#anti-phising .new-dropdown .dropdown-btn')).display).to.equal('none');
    });

    it('renders correct colour of switch', function () {
      expect(subject.getComputedStyle(subject.query('#anti-phising .switches .cqz-switch-box')).background).to.contain('rgb(0, 173, 239)');
    });

    it('renders "ON"', function () {
      expect(subject.query('#anti-phising .switches [data-visible-on-state="active"][data-i18n="control_center_switch_on"]')).to.exist;
      expect(subject.getComputedStyle(subject.query('#anti-phising .switches [data-visible-on-state="active"][data-i18n="control_center_switch_on"]')).display).to.not.equal('none');
      expect(subject.query('#anti-phising .switches [data-invisible-on-state="active"][data-i18n="control_center_switch_off"]')).to.exist;
      expect(subject.getComputedStyle(subject.query('#anti-phising .switches [data-invisible-on-state="active"][data-i18n="control_center_switch_off"]')).display).to.equal('none');
      expect(subject.query('#anti-phising .switches [data-visible-on-state="active"][data-i18n="control_center_switch_on"]').textContent.trim()).to.equal('control_center_switch_on');
    });
  });

  describe('anti-phishing off for particular domain', function () {
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
    antiPhishingUiTests();

    it('renders correct colour of switch', function () {
      expect(subject.getComputedStyle(subject.query('#anti-phising .switches .cqz-switch-box')).background).to.contain('rgb(255, 126, 116)');
    });

    it('renders "OFF"', function () {
      expect(subject.query('#anti-phising .switches [data-visible-on-state="active"][data-i18n="control_center_switch_on"]')).to.exist;
      expect(subject.getComputedStyle(subject.query('#anti-phising .switches [data-visible-on-state="active"][data-i18n="control_center_switch_on"]')).display).to.equal('none');
      expect(subject.query('#anti-phising .switches [data-invisible-on-state="active"][data-i18n="control_center_switch_off"]')).to.exist;
      expect(subject.getComputedStyle(subject.query('#anti-phising .switches [data-invisible-on-state="active"][data-i18n="control_center_switch_off"]')).display).to.not.equal('none');
      expect(subject.query('#anti-phising .switches [data-invisible-on-state="active"][data-i18n="control_center_switch_off"]').textContent.trim()).to.equal('control_center_switch_off');
    });

    it('renders dropdown with "This domain"', function () {
      expect(subject.query('#anti-phising .new-dropdown .dropdown-btn [data-visible-on-state="inactive"][data-i18n="control_center_this_domain"]')).to.exist;
      expect(subject.getComputedStyle(subject.query('#anti-phising .new-dropdown .dropdown-btn [data-visible-on-state="inactive"][data-i18n="control_center_this_domain"]')).display).to.not.equal('none');
      expect(subject.query('#anti-phising .new-dropdown .dropdown-btn [data-visible-on-state="critical"][data-i18n="control_center_all_sites"]')).to.exist;
      expect(subject.getComputedStyle(subject.query('#anti-phising .new-dropdown .dropdown-btn [data-visible-on-state="critical"][data-i18n="control_center_all_sites"]')).display).to.equal('none');
      expect(subject.query('#anti-phising .new-dropdown .dropdown-btn [data-visible-on-state="inactive"][data-i18n="control_center_this_domain"]').textContent.trim()).to.equal('control_center_this_domain');
    });
  });

  describe('anti-phishing off for all websites', function () {
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
    antiPhishingUiTests();

    it('renders correct colour of switch', function () {
      expect(subject.getComputedStyle(subject.query('#anti-phising .switches .cqz-switch-box')).background).to.contain('rgb(255, 126, 116)');
    });

    it('renders "OFF"', function () {
      expect(subject.query('#anti-phising .switches [data-visible-on-state="active"][data-i18n="control_center_switch_on"]')).to.exist;
      expect(subject.getComputedStyle(subject.query('#anti-phising .switches [data-visible-on-state="active"][data-i18n="control_center_switch_on"]')).display).to.equal('none');
      expect(subject.query('#anti-phising .switches [data-invisible-on-state="active"][data-i18n="control_center_switch_off"]')).to.exist;
      expect(subject.getComputedStyle(subject.query('#anti-phising .switches [data-invisible-on-state="active"][data-i18n="control_center_switch_off"]')).display).to.not.equal('none');
      expect(subject.query('#anti-phising .switches [data-invisible-on-state="active"][data-i18n="control_center_switch_off"]').textContent.trim()).to.equal('control_center_switch_off');
    });

    it('renders dropdown with "All websites"', function () {
      expect(subject.query('#anti-phising .new-dropdown .dropdown-btn [data-visible-on-state="inactive"][data-i18n="control_center_this_domain"]')).to.exist;
      expect(subject.getComputedStyle(subject.query('#anti-phising .new-dropdown .dropdown-btn [data-visible-on-state="inactive"][data-i18n="control_center_this_domain"]')).display).to.equal('none');
      expect(subject.query('#anti-phising .new-dropdown .dropdown-btn [data-visible-on-state="critical"][data-i18n="control_center_all_sites"]')).to.exist;
      expect(subject.getComputedStyle(subject.query('#anti-phising .new-dropdown .dropdown-btn [data-visible-on-state="critical"][data-i18n="control_center_all_sites"]')).display).to.not.equal('none');
      expect(subject.query('#anti-phising .new-dropdown .dropdown-btn [data-visible-on-state="critical"][data-i18n="control_center_all_sites"]').textContent.trim()).to.equal('control_center_all_sites');
    });
  });
}

describe('Control Center: Anti-Phishing UI browser', function () {
  antiphishingUiTests(false);
});

describe('Control Center: AMO, Anti-Phishing UI tests', function () {
  antiphishingUiTests(true);
});
