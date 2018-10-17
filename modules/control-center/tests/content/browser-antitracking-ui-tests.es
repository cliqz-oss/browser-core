import {
  expect,
} from '../../core/test-helpers';
import Subject from './local-helpers';
import { generateDataOn, generateDataOffSite, generateDataOffAll } from './fixtures/antitracking';

function antitrackingUiTests(amo) {
  const dataOn = generateDataOn(amo);
  const dataOffSite = generateDataOffSite(amo);
  const dataOffAll = generateDataOffAll(amo);
  const target = 'control-center';
  let subject;

  before(function () {
    subject = new Subject();
  });

  after(function () {
    subject.unload();
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

  function antiTrackingUiTests() {
    it('renders antitracking box', function () {
      expect(subject.query('#anti-tracking')).to.not.be.null;
    });

    it('renders info button', function () {
      expect(subject.query('#anti-tracking .title .cc-tooltip')).to.exist;
    });

    it('renders title', function () {
      expect(subject.query('#anti-tracking .title span[data-start-navigation=""]')).to.exist;
      expect(subject.query('#anti-tracking .title span[data-start-navigation=""]').textContent.trim()).to.equal('Anti-Tracking');
    });

    it('renders arrow', function () {
      expect(subject.query('#anti-tracking .title #smallarrow')).to.exist;
    });

    it('renders switch', function () {
      expect(subject.query('#anti-tracking .title .switches .cqz-switch-box')).to.exist;
    });

    it('renders shield', function () {
      expect(subject.query('#anti-tracking #antitracker-counter #shield')).to.exist;
    });
  }

  describe('anti-tracking on', function () {
    before(function () {
      subject.respondsWith({
        module: target,
        action: 'getData',
        response: dataOn
      });
      return subject.load();
    });
    headerProtected();
    antiTrackingUiTests();

    it('renders correct colour of switch', function () {
      expect(subject.getComputedStyle(subject.query('#anti-tracking .cqz-switch-box')).background).to.contain('rgb(0, 173, 239)');
    });

    it('renders "ON"', function () {
      expect(subject.query('#anti-tracking .switches [data-i18n="control_center_switch_on"]')).to.exist;
      expect(subject.getComputedStyle(subject.query('#anti-tracking .switches [data-i18n="control_center_switch_on"]')).display).to.not.equal('none');
      expect(subject.query('#anti-tracking .switches [data-visible-on-state="inactive"][data-i18n="control_center_switch_off"]')).to.exist;
      expect(subject.getComputedStyle(subject.query('#anti-tracking .switches [data-visible-on-state="inactive"][data-i18n="control_center_switch_off"]')).display).to.equal('none');
      expect(subject.query('#anti-tracking .switches [data-visible-on-state="critical"][data-i18n="control_center_switch_off"]')).to.exist;
      expect(subject.getComputedStyle(subject.query('#anti-tracking .switches [data-visible-on-state="critical"][data-i18n="control_center_switch_off"]')).display).to.equal('none');
      expect(subject.query('#anti-tracking .switches [data-i18n="control_center_switch_on"]').textContent.trim()).to.equal('control_center_switch_on');
    });

    it('renders text about private points', function () {
      expect(subject.query('#anti-tracking .row-text [data-visible-on-state="active"][data-i18n="control_center_datapoints"]')).to.exist;
      expect(subject.query('#anti-tracking .row-text [data-visible-on-state="inactive"][data-i18n="control_center_datapoints_inactive"]')).to.exist;
      expect(subject.query('#anti-tracking .row-text [data-visible-on-state="critical"][data-i18n="control_center_datapoints_off"]')).to.exist;
      expect(subject.getComputedStyle(subject.query('#anti-tracking .row-text [data-visible-on-state="active"][data-i18n="control_center_datapoints"]')).display).to.not.equal('none');
      expect(subject.getComputedStyle(subject.query('#anti-tracking .row-text [data-visible-on-state="inactive"][data-i18n="control_center_datapoints_inactive"]')).display).to.equal('none');
      expect(subject.getComputedStyle(subject.query('#anti-tracking .row-text [data-visible-on-state="critical"][data-i18n="control_center_datapoints_off"]')).display).to.equal('none');
      expect(subject.query('#anti-tracking .row-text [data-visible-on-state="active"][data-i18n="control_center_datapoints"]').textContent.trim()).to.equal('control_center_datapoints');
    });

    it('dropdown is invisible', function () {
      expect(subject.query('#anti-tracking .new-dropdown .dropdown-btn')).to.exist;
      expect(subject.getComputedStyle(subject.query('#anti-tracking .new-dropdown .dropdown-btn')).display).to.equal('none');
    });

    it('renders correct amount of data points', function () {
      expect(subject.query('#anti-tracking #antitracker-counter #count [data-visible-on-state="active"]')).to.exist;
      expect(subject.query('#anti-tracking #antitracker-counter #count [data-visible-on-state="inactive"]')).to.exist;
      expect(subject.query('#anti-tracking #antitracker-counter #count [data-visible-on-state="critical"]')).to.exist;
      expect(subject.getComputedStyle(subject.query('#anti-tracking #antitracker-counter #count [data-visible-on-state="active"]')).display).to.not.equal('none');
      expect(subject.getComputedStyle(subject.query('#anti-tracking #antitracker-counter #count [data-visible-on-state="inactive"]')).display).to.equal('none');
      expect(subject.getComputedStyle(subject.query('#anti-tracking #antitracker-counter #count [data-visible-on-state="critical"]')).display).to.equal('none');
      expect(subject.query('#anti-tracking #antitracker-counter #count [data-visible-on-state="active"]').textContent.trim()).to.equal(dataOn.module.antitracking.totalCount.toString());
    });
  });

  describe('anti-tracking off for the particular website', function () {
    before(function () {
      subject.respondsWith({
        module: target,
        action: 'getData',
        response: dataOffSite
      });
      return subject.load();
    });

    context('control center header', function () {
      it('renders header', function () {
        expect(subject.query('#header')).to.exist;
      });

      it('renders cliqz logo', function () {
        expect(subject.query('#header .pause img')).to.exist;
        expect(subject.query('#header .pause img').getAttribute('src')).to.equal('./images/cliqz.svg');
      });

      it('renders header with the correct text', function () {
        expect(subject.query('#header .title')).to.exist;
        expect(subject.getComputedStyle(subject.query('#header .title [data-i18n="control_center_txt_header"]')).display).to.equal('none');
        expect(subject.getComputedStyle(subject.query('#header .title [data-i18n="control_center_txt_header_not"][data-visible-on-state="critical"]')).display).to.equal('none');
        expect(subject.getComputedStyle(subject.query('#header .title [data-i18n="control_center_txt_header_not"][data-visible-on-state="inactive"]')).display).to.not.equal('none');
        expect(subject.query('#header .title [data-i18n="control_center_txt_header_not"][data-visible-on-state="inactive"]').textContent.trim()).to.equal('control_center_txt_header_not');
      });

      it('renders warning icon', function () {
        expect(subject.query('#header .title img')).to.exist;
        expect(subject.getComputedStyle(subject.query('#header .title img')).display).to.not.equal('none');
        expect(subject.query('#header .title img').getAttribute('src')).to.equal('./images/alert-privacy.svg');
      });
    });

    antiTrackingUiTests();

    it('renders correct colour of switch', function () {
      expect(subject.getComputedStyle(subject.query('#anti-tracking .cqz-switch-box')).background).to.contain('rgb(255, 126, 116)');
    });

    it('renders "OFF"', function () {
      expect(subject.query('#anti-tracking .switches [data-i18n="control_center_switch_on"]')).to.exist;
      expect(subject.getComputedStyle(subject.query('#anti-tracking .switches [data-i18n="control_center_switch_on"]')).display).to.equal('none');
      expect(subject.query('#anti-tracking .switches [data-visible-on-state="inactive"][data-i18n="control_center_switch_off"]')).to.exist;
      expect(subject.getComputedStyle(subject.query('#anti-tracking .switches [data-visible-on-state="inactive"][data-i18n="control_center_switch_off"]')).display).to.not.equal('none');
      expect(subject.query('#anti-tracking .switches [data-visible-on-state="critical"][data-i18n="control_center_switch_off"]')).to.exist;
      expect(subject.getComputedStyle(subject.query('#anti-tracking .switches [data-visible-on-state="critical"][data-i18n="control_center_switch_off"]')).display).to.equal('none');
      expect(subject.query('#anti-tracking .switches [data-visible-on-state="inactive"][data-i18n="control_center_switch_off"]').textContent.trim()).to.equal('control_center_switch_off');
    });

    it('renders "Turned off for this domain"', function () {
      expect(subject.query('#anti-tracking .row-text [data-visible-on-state="active"][data-i18n="control_center_datapoints"]')).to.exist;
      expect(subject.query('#anti-tracking .row-text [data-visible-on-state="inactive"][data-i18n="control_center_datapoints_inactive"]')).to.exist;
      expect(subject.query('#anti-tracking .row-text [data-visible-on-state="critical"][data-i18n="control_center_datapoints_off"]')).to.exist;
      expect(subject.getComputedStyle(subject.query('#anti-tracking .row-text [data-visible-on-state="active"][data-i18n="control_center_datapoints"]')).display).to.equal('none');
      expect(subject.getComputedStyle(subject.query('#anti-tracking .row-text [data-visible-on-state="inactive"][data-i18n="control_center_datapoints_inactive"]')).display).to.not.equal('none');
      expect(subject.getComputedStyle(subject.query('#anti-tracking .row-text [data-visible-on-state="critical"][data-i18n="control_center_datapoints_off"]')).display).to.equal('none');
      expect(subject.query('#anti-tracking .row-text [data-visible-on-state="inactive"][data-i18n="control_center_datapoints_inactive"]').textContent.trim()).to.equal('control_center_datapoints_inactive');
    });

    it('renders dropdown with "This domain"', function () {
      expect(subject.query('#anti-tracking .new-dropdown .dropdown-btn [data-visible-on-state="inactive"][data-i18n="control_center_this_domain"]')).to.exist;
      expect(subject.getComputedStyle(subject.query('#anti-tracking .new-dropdown .dropdown-btn [data-visible-on-state="inactive"][data-i18n="control_center_this_domain"]')).display).to.not.equal('none');
      expect(subject.query('#anti-tracking .new-dropdown .dropdown-btn [data-visible-on-state="critical"][data-i18n="control_center_all_sites"]')).to.exist;
      expect(subject.getComputedStyle(subject.query('#anti-tracking .new-dropdown .dropdown-btn [data-visible-on-state="critical"][data-i18n="control_center_all_sites"]')).display).to.equal('none');
      expect(subject.query('#anti-tracking .new-dropdown .dropdown-btn [data-visible-on-state="inactive"][data-i18n="control_center_this_domain"]').textContent.trim()).to.equal('control_center_this_domain');
    });

    it('renders correct amount of data points', function () {
      expect(subject.query('#anti-tracking #antitracker-counter #count [data-visible-on-state="active"]')).to.exist;
      expect(subject.query('#anti-tracking #antitracker-counter #count [data-visible-on-state="inactive"]')).to.exist;
      expect(subject.query('#anti-tracking #antitracker-counter #count [data-visible-on-state="critical"]')).to.exist;
      expect(subject.getComputedStyle(subject.query('#anti-tracking #antitracker-counter #count [data-visible-on-state="active"]')).display).to.equal('none');
      expect(subject.getComputedStyle(subject.query('#anti-tracking #antitracker-counter #count [data-visible-on-state="inactive"]')).display).to.not.equal('none');
      expect(subject.getComputedStyle(subject.query('#anti-tracking #antitracker-counter #count [data-visible-on-state="critical"]')).display).to.equal('none');
      expect(subject.query('#anti-tracking #antitracker-counter #count [data-visible-on-state="inactive"]').textContent.trim()).to.equal('0');
    });
  });

  describe('anti-tracking off for all websites', function () {
    before(function () {
      subject.respondsWith({
        module: target,
        action: 'getData',
        response: dataOffAll
      });
      return subject.load();
    });

    context('control center header', function () {
      it('renders header', function () {
        expect(subject.query('#header')).to.exist;
      });

      it('renders cliqz logo', function () {
        expect(subject.query('#header .pause img')).to.exist;
        expect(subject.query('#header .pause img').getAttribute('src')).to.equal('./images/cliqz.svg');
      });

      it('renders header with the correct text', function () {
        expect(subject.query('#header .title')).to.exist;
        expect(subject.getComputedStyle(subject.query('#header .title [data-i18n="control_center_txt_header"]')).display).to.equal('none');
        expect(subject.getComputedStyle(subject.query('#header .title [data-i18n="control_center_txt_header_not"][data-visible-on-state="inactive"]')).display).to.equal('none');
        expect(subject.getComputedStyle(subject.query('#header .title [data-i18n="control_center_txt_header_not"][data-visible-on-state="critical"]')).display).to.not.equal('none');
        expect(subject.query('#header .title [data-i18n="control_center_txt_header_not"]').textContent.trim()).to.equal('control_center_txt_header_not');
      });

      it('renders warning icon', function () {
        expect(subject.query('#header .title img')).to.exist;
        expect(subject.getComputedStyle(subject.query('#header .title img')).display).to.not.equal('none');
        expect(subject.query('#header .title img').getAttribute('src')).to.equal('./images/alert-privacy.svg');
      });
    });

    antiTrackingUiTests();

    it('renders correct colour of switch', function () {
      expect(subject.getComputedStyle(subject.query('#anti-tracking .cqz-switch-box')).background).to.contain('rgb(255, 126, 116)');
    });

    it('renders "OFF"', function () {
      expect(subject.query('#anti-tracking .switches [data-i18n="control_center_switch_off"]')).to.exist;
      expect(subject.getComputedStyle(subject.query('#anti-tracking .switches [data-i18n="control_center_switch_on"]')).display).to.equal('none');
      expect(subject.query('#anti-tracking .switches [data-visible-on-state="critical"][data-i18n="control_center_switch_off"]')).to.exist;
      expect(subject.getComputedStyle(subject.query('#anti-tracking .switches [data-visible-on-state="critical"][data-i18n="control_center_switch_off"]')).display).to.not.equal('none');
      expect(subject.query('#anti-tracking .switches [data-visible-on-state="inactive"][data-i18n="control_center_switch_off"]')).to.exist;
      expect(subject.getComputedStyle(subject.query('#anti-tracking .switches [data-visible-on-state="inactive"][data-i18n="control_center_switch_off"]')).display).to.equal('none');
      expect(subject.query('#anti-tracking .switches [data-visible-on-state="critical"][data-i18n="control_center_switch_off"]').textContent.trim()).to.equal('control_center_switch_off');
    });

    it('renders "Turned off for all websites"', function () {
      expect(subject.query('#anti-tracking .row-text [data-visible-on-state="active"][data-i18n="control_center_datapoints"]')).to.exist;
      expect(subject.query('#anti-tracking .row-text [data-visible-on-state="inactive"][data-i18n="control_center_datapoints_inactive"]')).to.exist;
      expect(subject.query('#anti-tracking .row-text [data-visible-on-state="critical"][data-i18n="control_center_datapoints_off"]')).to.exist;
      expect(subject.getComputedStyle(subject.query('#anti-tracking .row-text [data-visible-on-state="active"][data-i18n="control_center_datapoints"]')).display).to.equal('none');
      expect(subject.getComputedStyle(subject.query('#anti-tracking .row-text [data-visible-on-state="inactive"][data-i18n="control_center_datapoints_inactive"]')).display).to.equal('none');
      expect(subject.getComputedStyle(subject.query('#anti-tracking .row-text [data-visible-on-state="critical"][data-i18n="control_center_datapoints_off"]')).display).to.not.equal('none');
      expect(subject.query('#anti-tracking .row-text [data-visible-on-state="inactive"][data-i18n="control_center_datapoints_inactive"]').textContent.trim()).to.equal('control_center_datapoints_inactive');
    });

    it('renders dropdown with "All websites"', function () {
      expect(subject.query('#anti-tracking .new-dropdown .dropdown-btn [data-visible-on-state="inactive"][data-i18n="control_center_this_domain"]')).to.exist;
      expect(subject.getComputedStyle(subject.query('#anti-tracking .new-dropdown .dropdown-btn [data-visible-on-state="inactive"][data-i18n="control_center_this_domain"]')).display).to.equal('none');
      expect(subject.query('#anti-tracking .new-dropdown .dropdown-btn [data-visible-on-state="critical"][data-i18n="control_center_all_sites"]')).to.exist;
      expect(subject.getComputedStyle(subject.query('#anti-tracking .new-dropdown .dropdown-btn [data-visible-on-state="critical"][data-i18n="control_center_all_sites"]')).display).to.not.equal('none');
      expect(subject.query('#anti-tracking .new-dropdown .dropdown-btn [data-visible-on-state="critical"][data-i18n="control_center_all_sites"]').textContent.trim()).to.equal('control_center_all_sites');
    });

    it('renders correct amount of data points', function () {
      expect(subject.query('#anti-tracking #antitracker-counter #count [data-visible-on-state="active"]')).to.exist;
      expect(subject.query('#anti-tracking #antitracker-counter #count [data-visible-on-state="inactive"]')).to.exist;
      expect(subject.query('#anti-tracking #antitracker-counter #count [data-visible-on-state="critical"]')).to.exist;
      expect(subject.getComputedStyle(subject.query('#anti-tracking #antitracker-counter #count [data-visible-on-state="active"]')).display).to.equal('none');
      expect(subject.getComputedStyle(subject.query('#anti-tracking #antitracker-counter #count [data-visible-on-state="inactive"]')).display).to.equal('none');
      expect(subject.getComputedStyle(subject.query('#anti-tracking #antitracker-counter #count [data-visible-on-state="critical"]')).display).to.not.equal('none');
      expect(subject.query('#anti-tracking #antitracker-counter #count [data-visible-on-state="critical"]').textContent.trim()).to.equal('0');
    });
  });
}

describe('Control Center: Anti-Tracking UI browser', function () {
  antitrackingUiTests(false);
});

describe('Control Center: AMO, Anti-Tracking UI tests', function () {
  antitrackingUiTests(true);
});
