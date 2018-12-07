import {
  expect,
} from '../../core/test-helpers';
import Subject from './local-helpers';
import { dataOn, dataOff } from './fixtures/amo-cliqz-tab';

describe('Control Center: AMO, Cliqz tab UI tests', function () {
  let subject;
  const target = 'control-center';

  before(function () {
    subject = new Subject();
  });

  function cliqzTabUiTests() {
    it('renders cliqz tab box', function () {
      expect(subject.query('.amo #cliqz-tab')).to.not.be.null;
    });

    it('renders info button', function () {
      expect(subject.query('.amo #cliqz-tab .title .cc-tooltip')).to.exist;
    });

    it('renders title', function () {
      const titleSelector = '.amo #cliqz-tab .title > span';
      expect(subject.query(titleSelector)).to.exist;
      expect(subject.query(titleSelector).textContent.trim()).to.equal('Cliqz Tab');
    });

    it('renders switch', function () {
      expect(subject.query('.amo #cliqz-tab .title .switches .cqz-switch-box')).to.exist;
    });
  }

  describe('Cliqz tab on', function () {
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

    cliqzTabUiTests();

    it('renders correct colour of switch', function () {
      expect(subject.getComputedStyle(subject.query('.amo #cliqz-tab .cqz-switch-box')).background)
        .to.contain('rgb(0, 173, 239)');
    });

    it('renders "ON"', function () {
      const onSelector = '.amo #cliqz-tab .switches [data-i18n="control_center_switch_on"]';
      const offSelector = '.amo #cliqz-tab .switches [data-i18n="control_center_switch_off"]';
      expect(subject.query(onSelector)).to.exist;
      expect(subject.query(offSelector)).to.exist;
      expect(subject.getComputedStyle(subject.query(onSelector)).display).to.not.equal('none');
      expect(subject.getComputedStyle(subject.query(offSelector)).display).to.equal('none');
      expect(subject.query(onSelector).textContent.trim()).to.equal('control_center_switch_on');
    });
  });

  describe('Cliqz tab off', function () {
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

    cliqzTabUiTests();

    it('renders correct colour of switch', function () {
      expect(subject.getComputedStyle(subject.query('.amo #cliqz-tab .cqz-switch-box')).background)
        .to.contain('rgb(255, 126, 116)');
    });

    it('renders "OFF"', function () {
      const onSelector = '.amo #cliqz-tab .switches [data-i18n="control_center_switch_on"]';
      const offSelector = '.amo #cliqz-tab .switches [data-i18n="control_center_switch_off"]';
      expect(subject.query(onSelector)).to.exist;
      expect(subject.query(offSelector)).to.exist;
      expect(subject.getComputedStyle(subject.query(onSelector)).display).to.equal('none');
      expect(subject.getComputedStyle(subject.query(offSelector)).display).to.not.equal('none');
      expect(subject.query(offSelector).textContent.trim()).to.equal('control_center_switch_off');
    });
  });
});
