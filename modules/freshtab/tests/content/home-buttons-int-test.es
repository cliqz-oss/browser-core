import {
  expect,
  waitFor,
} from '../../core/test-helpers';
import {
  checkTelemetry,
  defaultConfig,
  Subject,
} from '../../core/test-helpers-freshtab';

describe('Freshtab interactions with buttons', function () {
  const settingsPanelSelector = '#settings-panel';
  let subject;

  beforeEach(async function () {
    subject = new Subject();
    subject.respondsWithEmptyTelemetry();
    subject.respondsWith(defaultConfig);
    subject.respondsWithEmptySpeedDials();
    subject.respondsWithEmptyNews();
    subject.respondsWithEmptyStats();

    await subject.load();
  });

  afterEach(function () {
    subject.unload();
  });

  describe('clicking on a settings button', function () {
    beforeEach(function () {
      subject.startListening();
      const settingsButtonSelector = '#settings-btn';
      subject.query(settingsButtonSelector).click();
      return waitFor(() => subject.query(settingsPanelSelector).classList.contains('visible'));
    });

    it('show settings panel', function () {
      expect(subject.query('#settings-panel')).to.exist;
      expect(subject.query('#settings-panel').className).to.contain('visible');
    });

    it('sends a "settings > click" telemetry signal', function () {
      checkTelemetry({
        action: 'click',
        subject: () => subject,
        target: 'settings',
        type: 'home',
      });
    });

    describe('and then clicking on a close button', function () {
      beforeEach(function () {
        const settingsCloseButtonSelector = '#settings-panel button.close';
        subject.query(settingsCloseButtonSelector).click();
      });

      it('hides settings panel', function () {
        expect(subject.query('#settings-panel')).to.not.exist;
      });

      it('sends a "settings > close > click" telemetry signal', function () {
        checkTelemetry({
          action: 'click',
          subject: () => subject,
          target: 'close',
          type: 'home',
          view: 'settings',
        });
      });
    });
  });

  describe('clicking on a history button', function () {
    beforeEach(function () {
      subject.startListening();
      const historyButtonSelector = '#cliqz-history';
      subject.query(historyButtonSelector).click();
    });

    it('sends a "home > history > click" telemetry signal', function () {
      checkTelemetry({
        action: 'click',
        subject: () => subject,
        target: 'history',
        type: 'home',
      });
    });
  });
});
