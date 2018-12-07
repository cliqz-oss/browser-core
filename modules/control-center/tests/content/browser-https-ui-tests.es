import {
  expect,
} from '../../core/test-helpers';
import Subject from './local-helpers';
import { dataOn, dataOff } from './fixtures/https-everywhere';

describe('Control Center: HTTPS Everywhere UI browser', function () {
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

  function httpsUiTests() {
    it('renders https box', function () {
      expect(subject.query('#https')).to.not.be.null;
    });

    it('renders info button', function () {
      expect(subject.query('#https .title .cc-tooltip')).to.exist;
    });

    it('renders title', function () {
      const titleSelector = '#https .title [data-i18n="control_center_info_https_title"]';
      expect(subject.query(titleSelector)).to.exist;
      expect(subject.query(titleSelector).textContent.trim()).to.equal('control_center_info_https_title');
    });

    it('renders switch', function () {
      expect(subject.query('#https .title .switches .cqz-switch-box')).to.exist;
    });
  }

  describe('https everywhere on', function () {
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
    httpsUiTests();

    it('renders correct colour of switch', function () {
      expect(subject.getComputedStyle(subject.query('#https .cqz-switch-box')).background).to.contain('rgb(0, 173, 239)');
    });

    it('renders "ON"', function () {
      const onSelector = '#https .switches [data-i18n="control_center_switch_on"]';
      const offSelector = '#https .switches [data-i18n="control_center_switch_off"]';
      expect(subject.query(onSelector)).to.exist;
      expect(subject.query(offSelector)).to.exist;
      expect(subject.getComputedStyle(subject.query(onSelector)).display).to.not.equal('none');
      expect(subject.getComputedStyle(subject.query(offSelector)).display).to.equal('none');
      expect(subject.query(onSelector).textContent.trim()).to.equal('control_center_switch_on');
    });
  });

  describe('https everywhere off', function () {
    before(function () {
      subject.respondsWith({
        module: target,
        action: 'getData',
        response: dataOff
      });
      return subject.load();
    });

    after(function () {
      subject.unload();
    });

    headerProtected();
    httpsUiTests();

    it('renders correct colour of switch', function () {
      expect(subject.getComputedStyle(subject.query('#https .cqz-switch-box')).background).to.contain('rgb(255, 126, 116)');
    });

    it('renders "OFF"', function () {
      const onSelector = '#https .switches [data-i18n="control_center_switch_on"]';
      const offSelector = '#https .switches [data-i18n="control_center_switch_off"]';
      expect(subject.query(onSelector)).to.exist;
      expect(subject.query(offSelector)).to.exist;
      expect(subject.getComputedStyle(subject.query(onSelector)).display).to.equal('none');
      expect(subject.getComputedStyle(subject.query(offSelector)).display).to.not.equal('none');
      expect(subject.query(offSelector).textContent.trim()).to.equal('control_center_switch_off');
    });
  });
});
