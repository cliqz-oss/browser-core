import {
  clearIntervals,
  expect,
  Subject
} from '../../core/test-helpers';

import { dataOn, dataOff } from './fixtures/https-everywhere';

describe('Control Center: HTTPS Everywhere UI browser', function () {
  let subject;
  const buildUrl = '/build/cliqz@cliqz.com/chrome/content/control-center/index.html';
  const target = 'cliqz-control-center';

  before(function () {
    subject = new Subject();
    return subject.load(buildUrl);
  });

  after(function () {
    subject.unload();
    clearIntervals();
  });

  function headerProtected() {
    context('control center header', function () {
      it('renders header', function () {
        expect(subject.query('#header')).to.exist;
      });

      it('renders cliqz logo', function () {
        expect(subject.query('#header .pause img')).to.exist;
        expect(subject.getComputedStyle('#header .pause img').display).to.not.equal('none');
        expect(subject.query('#header .pause img').getAttribute('src')).to.equal('./images/cliqz.svg');
      });

      it('renders "Your data is protected"', function () {
        expect(subject.query('#header .title [data-i18n="control-center-txt-header"]')).to.exist;
        expect(subject.getComputedStyle('#header .title [data-i18n="control-center-txt-header"]').display).to.not.equal('none');
        expect(subject.getComputedStyle('#header .title [data-i18n="control-center-txt-header-not"][data-visible-on-state="inactive"]').display).to.equal('none');
        expect(subject.getComputedStyle('#header .title [data-i18n="control-center-txt-header-not"][data-visible-on-state="critical"]').display).to.equal('none');
        expect(subject.query('#header .title [data-i18n="control-center-txt-header"]').textContent.trim()).to.equal('control-center-txt-header');
      });

      it('doesn\'t render warning icon', function () {
        expect(subject.query('#header .title img')).to.exist;
        expect(subject.getComputedStyle('#header .title img').display).to.equal('none');
      });
    });
  }

  function httpsUiTests() {
    it('renders https box', function () {
      expect(subject.query('#https')).to.not.be.null;
    });

    it('renders info button', function () {
      expect(subject.query('#https .title .infobutton')).to.exist;
    });

    it('renders title', function () {
      const titleSelector = '#https .title [data-i18n="control-center-info-https-title"]';
      expect(subject.query(titleSelector)).to.exist;
      expect(subject.query(titleSelector).textContent.trim()).to.equal('control-center-info-https-title');
    });

    it('renders switch', function () {
      expect(subject.query('#https .title .switches .cqz-switch-box')).to.exist;
    });
  }

  describe('https everywhere on', function () {
    before(function () {
      return subject.pushData(target, dataOn);
    });

    headerProtected();
    httpsUiTests();

    it('renders correct colour of switch', function () {
      expect(subject.getComputedStyle('#https .cqz-switch-box').background).to.contain('rgb(0, 173, 239)');
    });

    it('renders "ON"', function () {
      const onSelector = '#https .switches [data-i18n="control-center-switch-on"]';
      const offSelector = '#https .switches [data-i18n="control-center-switch-off"]';
      expect(subject.query(onSelector)).to.exist;
      expect(subject.query(offSelector)).to.exist;
      expect(subject.getComputedStyle(onSelector).display).to.not.equal('none');
      expect(subject.getComputedStyle(offSelector).display).to.equal('none');
      expect(subject.query(onSelector).textContent.trim()).to.equal('control-center-switch-on');
    });
  });

  describe('https everywhere off', function () {
    before(function () {
      return subject.pushData(target, dataOff);
    });

    headerProtected();
    httpsUiTests();

    it('renders correct colour of switch', function () {
      expect(subject.getComputedStyle('#https .cqz-switch-box').background).to.contain('rgb(255, 126, 116)');
    });

    it('renders "OFF"', function () {
      const onSelector = '#https .switches [data-i18n="control-center-switch-on"]';
      const offSelector = '#https .switches [data-i18n="control-center-switch-off"]';
      expect(subject.query(onSelector)).to.exist;
      expect(subject.query(offSelector)).to.exist;
      expect(subject.getComputedStyle(onSelector).display).to.equal('none');
      expect(subject.getComputedStyle(offSelector).display).to.not.equal('none');
      expect(subject.query(offSelector).textContent.trim()).to.equal('control-center-switch-off');
    });
  });
});
