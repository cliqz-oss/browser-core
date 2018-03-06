import {
  clearIntervals,
  defaultConfig,
  expect,
  Subject,
  waitFor
} from './helpers';

describe('Fresh tab interactions with background', function () {
  const blueBgSelector = 'img[data-bg="bg-blue"]';
  const darkBgSelector = 'img[data-bg="bg-dark"]';
  const lightBgSelector = 'img[data-bg="bg-light"]';
  const alpsBgSelector = 'img[data-bg="bg-matterhorn"]';
  let subject;
  let messages;
  let listener;

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

  describe('clicking on a dark icon', function () {
    beforeEach(function () {
      subject.query(darkBgSelector).click();
      return waitFor(() => subject.query('body.theme-bg-dark'));
    });

    it('changes bg to dark', function () {
      expect(subject.query('body').className).to.contain('theme-bg-dark');
    });

    it('changes settings selection to dark bg', function () {
      expect(subject.query(darkBgSelector).className).to.contain('active');
      expect(subject.query(lightBgSelector).className).to.not.contain('active');
      expect(subject.query(blueBgSelector).className).to.not.contain('active');
    });

    it('sends a "saveBackgroundImage" message once', function () {
      expect(messages.has('saveBackgroundImage')).to.equal(true);
      expect(messages.get('saveBackgroundImage').length).to.equal(1);
    });

    it('sends a "home > settings > background_image > click" telemetry signal', function () {
      expect(messages.has('sendTelemetry')).to.equal(true);

      const telemetrySignals = messages.get('sendTelemetry');
      let signalExist = false;
      let count = 0;

      expect(telemetrySignals.length).to.be.above(0);
      telemetrySignals.forEach(function (item) {
        if ((item.args[0].type === 'home') &&
            (item.args[0].view === 'settings') &&
            (item.args[0].target === 'background_image') &&
            (item.args[0].action === 'click')) {
              signalExist = true;
              count += 1;
        }
      });

      expect(signalExist).to.be.true;
      expect(count).to.equal(1);
    });
  });

  describe('clicking on a light icon', function () {
    beforeEach(function () {
      subject.query(lightBgSelector).click();
      return waitFor(() => subject.query('body.theme-bg-light'));
    });

    afterEach(function () {
      subject.chrome.runtime.onMessage.removeListener(listener);
    });

    it('changes bg to light', function () {
      expect(subject.query('body').className).to.contain('theme-bg-light');
    });

    it('changes settings selection to light bg', function () {
      expect(subject.query(darkBgSelector).className).to.not.contain('active');
      expect(subject.query(lightBgSelector).className).to.contain('active');
      expect(subject.query(blueBgSelector).className).to.not.contain('active');
    });

    it('sends a "saveBackgroundImage" message once', function () {
      expect(messages.has('saveBackgroundImage')).to.equal(true);
      expect(messages.get('saveBackgroundImage').length).to.equal(1);
    });

    it('sends a "home > settings > background_image > click" telemetry signal', function () {
      expect(messages.has('sendTelemetry')).to.equal(true);

      const telemetrySignals = messages.get('sendTelemetry');
      let signalExist = false;
      let count = 0;

      expect(telemetrySignals.length).to.be.above(0);
      telemetrySignals.forEach(function (item) {
        if ((item.args[0].type === 'home') &&
            (item.args[0].view === 'settings') &&
            (item.args[0].target === 'background_image') &&
            (item.args[0].action === 'click')) {
              signalExist = true;
              count += 1;
        }
      });

      expect(signalExist).to.be.true;
      expect(count).to.equal(1);
    });
  });


  describe('clicking on a blue icon', function () {
    beforeEach(function () {
      subject.query(blueBgSelector).click();
      return waitFor(() => subject.query('body.theme-bg-blue'));
    });

    afterEach(function () {
      subject.chrome.runtime.onMessage.removeListener(listener);
    });

    it('changes bg to blue', function () {
      expect(subject.query('body').className).to.contain('theme-bg-blue');
    });

    it('changes settings selection to blue bg', function () {
      expect(subject.query(darkBgSelector).className).to.not.contain('active');
      expect(subject.query(lightBgSelector).className).to.not.contain('active');
      expect(subject.query(blueBgSelector).className).to.contain('active');
    });

    it('sends a "saveBackgroundImage" message once', function () {
      expect(messages.has('saveBackgroundImage')).to.equal(true);
      expect(messages.get('saveBackgroundImage').length).to.equal(1);
    });

    it('sends a "home > settings > background_image > click" telemetry signal', function () {
      expect(messages.has('sendTelemetry')).to.equal(true);

      const telemetrySignals = messages.get('sendTelemetry');
      let signalExist = false;
      let count = 0;

      expect(telemetrySignals.length).to.be.above(0);
      telemetrySignals.forEach(function (item) {
        if ((item.args[0].type === 'home') &&
            (item.args[0].view === 'settings') &&
            (item.args[0].target === 'background_image') &&
            (item.args[0].action === 'click')) {
              signalExist = true;
              count += 1;
        }
      });

      expect(signalExist).to.be.true;
      expect(count).to.equal(1);
    });
  });

  describe('clicking on a matterhorn icon', function () {
    beforeEach(function () {
      subject.query(alpsBgSelector).click();
      return waitFor(() => subject.query('body.theme-bg-matterhorn'));
    });

    afterEach(function () {
      subject.chrome.runtime.onMessage.removeListener(listener);
    });

    it('changes bg to matthorn', function () {
      expect(subject.query('body').className).to.contain('theme-bg-matterhorn');
    });

    it('changes settings selection to matthorn bg', function () {
      expect(subject.query(darkBgSelector).className).to.not.contain('active');
      expect(subject.query(lightBgSelector).className).to.not.contain('active');
      expect(subject.query(blueBgSelector).className).to.not.contain('active');
      expect(subject.query(alpsBgSelector).className).to.contain('active');
    });

    it('sends a "saveBackgroundImage" message once', function () {
      expect(messages.has('saveBackgroundImage')).to.equal(true);
      expect(messages.get('saveBackgroundImage').length).to.equal(1);
    });

    it('sends a "home > settings > background_image > click" telemetry signal', function () {
      expect(messages.has('sendTelemetry')).to.equal(true);

      const telemetrySignals = messages.get('sendTelemetry');
      let signalExist = false;
      let count = 0;

      expect(telemetrySignals.length).to.be.above(0);
      telemetrySignals.forEach(function (item) {
        if ((item.args[0].type === 'home') &&
            (item.args[0].view === 'settings') &&
            (item.args[0].target === 'background_image') &&
            (item.args[0].action === 'click')) {
              signalExist = true;
              count += 1;
        }
      });

      expect(signalExist).to.be.true;
      expect(count).to.equal(1);
    });
  });
});
