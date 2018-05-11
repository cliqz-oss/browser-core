import {
  clearIntervals,
  waitFor,
  Subject,
  defaultConfig,
} from './helpers';

describe('Fresh tab interactions with buttons', function () {
  const settingsPanelSelector = '#settings-panel';
  let subject;
  let listener;
  let messages;

  beforeEach(function () {
    subject = new Subject();
    subject.respondsWith({
      module: 'core',
      action: 'sendTelemetry',
      response: ''
    });
    subject.respondsWith(defaultConfig);
    subject.respondsWith({
      module: 'freshtab',
      action: 'getSpeedDials',
      response: {
        history: [],
        custom: []
      },
    });
    subject.respondsWith({
      module: 'freshtab',
      action: 'getNews',
      response: {
        version: 0,
        news: []
      }
    });

    return subject.load().then(() => {
      // Keep track of received messages
      messages = new Map();
      listener = function (msg) {
        if (!messages.has(msg.action)) {
          messages.set(msg.action, []);
        }

        messages.get(msg.action).push(msg);
      };
      subject.chrome.runtime.onMessage.addListener(listener);
    });
  });

  afterEach(function () {
    subject.chrome.runtime.onMessage.removeListener(listener);
    subject.unload();
    clearIntervals();
  });

  describe('clicking on a settings button', function () {
    beforeEach(function () {
      const settingsButtonSelector = '#settings-btn';
      subject.query(settingsButtonSelector).click();
      return waitFor(() => subject.query(settingsPanelSelector).classList.contains('visible'));
    });

    it('show settings panel', function () {
      chai.expect(subject.query('#settings-panel')).to.exist;
      chai.expect(subject.query('#settings-panel').className).to.contain('visible');
    });

    it('sends a "settings > click" telemetry signal', function () {
      chai.expect(messages.has('sendTelemetry')).to.equal(true);

      const telemetrySignals = messages.get('sendTelemetry');
      let signalExist = false;
      let count = 0;

      telemetrySignals.forEach(function (item) {
        if ((item.args[0].type === 'home') &&
            (item.args[0].target === 'settings') &&
            (item.args[0].action === 'click')) {
              signalExist = true;
              count += 1;
        }
      });

      chai.expect(signalExist).to.be.true;
      chai.expect(count).to.equal(1);
    });

    describe('and then clicking on a close button', function () {
      beforeEach(function () {
        const settingsCloseButtonSelector = 'button.close';
        subject.query(settingsCloseButtonSelector).click();
        return waitFor(() => !subject.query(settingsPanelSelector).classList.contains('visible'));
      });

      it('hides settings panel', function () {
        chai.expect(subject.query('#settings-panel')).to.exist;
        chai.expect(subject.query('#settings-panel').className).to.not.contain('visible');
      });

      it('sends a "settings > close > click" telemetry signal', function () {
        chai.expect(messages.has('sendTelemetry')).to.equal(true);

        const telemetrySignals = messages.get('sendTelemetry');
        let signalExist = false;
        let count = 0;

        telemetrySignals.forEach(function (item) {
          if ((item.args[0].type === 'home') &&
              (item.args[0].view === 'settings') &&
              (item.args[0].target === 'close') &&
              (item.args[0].action === 'click')) {
                signalExist = true;
                count += 1;
          }
        });

        chai.expect(signalExist).to.be.true;
        chai.expect(count).to.equal(1);
      });
    });
  });

  describe('clicking on a history button', function () {
    beforeEach(function () {
      const historyButtonSelector = '#cliqz-history';
      subject.query(historyButtonSelector).click();
    });

    it('sends a "home > history > click" telemetry signal', function () {
      chai.expect(messages.has('sendTelemetry')).to.equal(true);

      const telemetrySignals = messages.get('sendTelemetry');
      let signalExist = false;
      let count = 0;

      telemetrySignals.forEach(function (item) {
        if ((item.args[0].type === 'home') &&
            (item.args[0].target === 'history') &&
            (item.args[0].action === 'click')) {
              signalExist = true;
              count += 1;
        }
      });

      chai.expect(signalExist).to.be.true;
      chai.expect(count).to.equal(1);
    });
  });
});
