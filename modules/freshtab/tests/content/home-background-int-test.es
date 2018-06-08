import {
  clearIntervals,
  expect,
  waitFor
} from '../../core/test-helpers';
import {
  defaultConfig,
  Subject
} from '../../core/test-helpers-freshtab';

describe('Fresh tab interactions with background', function () {
  const blueBgSelector = 'img[data-bg="bg-blue"]';
  const darkBgSelector = 'img[data-bg="bg-dark"]';
  const lightBgSelector = 'img[data-bg="bg-light"]';
  const alpsBgSelector = 'img[data-bg="bg-matterhorn"]';
  const winterBgSelector = 'img[data-bg="bg-winter"]';
  const springBgSelector = 'img[data-bg="bg-spring"]';
  const summerBgSelector = 'img[data-bg="bg-summer"]';

  let subject;
  let messages;
  let listener;
  let $backgroundSwitch;

  beforeEach(async function () {
    subject = new Subject();
    subject.respondsWithEmptyTelemetry();
    subject.respondsWithEmptySpeedDials();
    subject.respondsWithEmptyNews();
    subject.respondsWith(defaultConfig);

    await subject.load();
    $backgroundSwitch = subject.getBackgroundSwitch();
    $backgroundSwitch.click();
    await waitFor(() => subject.query('ul.background-selection-list'));

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
      expect(subject.query(alpsBgSelector).className).to.not.contain('active');
      expect(subject.query(winterBgSelector).className).to.not.contain('active');
      expect(subject.query(springBgSelector).className).to.not.contain('active');
      expect(subject.query(summerBgSelector).className).to.not.contain('active');
    });

    it('sends a "saveBackgroundImage" message once', function () {
      expect(messages.has('saveBackgroundImage')).to.equal(true);
      expect(messages.get('saveBackgroundImage').length).to.equal(1);
    });

    it('sends a "home > settings > background_image > click" telemetry signal', function () {
      expect(messages.has('sendTelemetry')).to.equal(true);

      const telemetrySignals = messages.get('sendTelemetry');
      let count = 0;

      expect(telemetrySignals.length).to.be.above(0);

      count = telemetrySignals.filter(function (s) {
        return (
          s.args[0].type === 'home' &&
          s.args[0].view === 'settings' &&
          s.args[0].target === 'background_image' &&
          s.args[0].action === 'click'
        );
      }).length;

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
      expect(subject.query(alpsBgSelector).className).to.not.contain('active');
      expect(subject.query(winterBgSelector).className).to.not.contain('active');
      expect(subject.query(springBgSelector).className).to.not.contain('active');
      expect(subject.query(summerBgSelector).className).to.not.contain('active');
    });

    it('sends a "saveBackgroundImage" message once', function () {
      expect(messages.has('saveBackgroundImage')).to.equal(true);
      expect(messages.get('saveBackgroundImage').length).to.equal(1);
    });

    it('sends a "home > settings > background_image > click" telemetry signal', function () {
      expect(messages.has('sendTelemetry')).to.equal(true);

      const telemetrySignals = messages.get('sendTelemetry');
      let count = 0;

      expect(telemetrySignals.length).to.be.above(0);

      count = telemetrySignals.filter(function (s) {
        return (
          s.args[0].type === 'home' &&
          s.args[0].view === 'settings' &&
          s.args[0].target === 'background_image' &&
          s.args[0].action === 'click'
        );
      }).length;

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
      expect(subject.query(alpsBgSelector).className).to.not.contain('active');
      expect(subject.query(winterBgSelector).className).to.not.contain('active');
      expect(subject.query(springBgSelector).className).to.not.contain('active');
      expect(subject.query(summerBgSelector).className).to.not.contain('active');
    });

    it('sends a "saveBackgroundImage" message once', function () {
      expect(messages.has('saveBackgroundImage')).to.equal(true);
      expect(messages.get('saveBackgroundImage').length).to.equal(1);
    });

    it('sends a "home > settings > background_image > click" telemetry signal', function () {
      expect(messages.has('sendTelemetry')).to.equal(true);

      const telemetrySignals = messages.get('sendTelemetry');
      let count = 0;

      expect(telemetrySignals.length).to.be.above(0);

      count = telemetrySignals.filter(function (s) {
        return (
          s.args[0].type === 'home' &&
          s.args[0].view === 'settings' &&
          s.args[0].target === 'background_image' &&
          s.args[0].action === 'click'
        );
      }).length;

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

    it('changes bg to matterhorn', function () {
      expect(subject.query('body').className).to.contain('theme-bg-matterhorn');
    });

    it('changes settings selection to matterhorn bg', function () {
      expect(subject.query(darkBgSelector).className).to.not.contain('active');
      expect(subject.query(lightBgSelector).className).to.not.contain('active');
      expect(subject.query(blueBgSelector).className).to.not.contain('active');
      expect(subject.query(alpsBgSelector).className).to.contain('active');
      expect(subject.query(winterBgSelector).className).to.not.contain('active');
      expect(subject.query(springBgSelector).className).to.not.contain('active');
      expect(subject.query(summerBgSelector).className).to.not.contain('active');
    });

    it('sends a "saveBackgroundImage" message once', function () {
      expect(messages.has('saveBackgroundImage')).to.equal(true);
      expect(messages.get('saveBackgroundImage').length).to.equal(1);
    });

    it('sends a "home > settings > background_image > click" telemetry signal', function () {
      expect(messages.has('sendTelemetry')).to.equal(true);

      const telemetrySignals = messages.get('sendTelemetry');
      let count = 0;

      expect(telemetrySignals.length).to.be.above(0);

      count = telemetrySignals.filter(function (s) {
        return (
          s.args[0].type === 'home' &&
          s.args[0].view === 'settings' &&
          s.args[0].target === 'background_image' &&
          s.args[0].action === 'click'
        );
      }).length;

      expect(count).to.equal(1);
    });
  });

  describe('clicking on a winter icon', function () {
    beforeEach(function () {
      subject.query(winterBgSelector).click();
      return waitFor(() => subject.query('body.theme-bg-winter'));
    });

    afterEach(function () {
      subject.chrome.runtime.onMessage.removeListener(listener);
    });

    it('changes bg to winter', function () {
      expect(subject.query('body').className).to.contain('theme-bg-winter');
    });

    it('changes settings selection to winter bg', function () {
      expect(subject.query(darkBgSelector).className).to.not.contain('active');
      expect(subject.query(lightBgSelector).className).to.not.contain('active');
      expect(subject.query(blueBgSelector).className).to.not.contain('active');
      expect(subject.query(alpsBgSelector).className).to.not.contain('active');
      expect(subject.query(winterBgSelector).className).to.contain('active');
      expect(subject.query(springBgSelector).className).to.not.contain('active');
      expect(subject.query(summerBgSelector).className).to.not.contain('active');
    });

    it('sends a "saveBackgroundImage" message once', function () {
      expect(messages.has('saveBackgroundImage')).to.equal(true);
      expect(messages.get('saveBackgroundImage').length).to.equal(1);
    });

    it('sends a "home > settings > background_image > click" telemetry signal', function () {
      expect(messages.has('sendTelemetry')).to.equal(true);

      const telemetrySignals = messages.get('sendTelemetry');
      let count = 0;

      expect(telemetrySignals.length).to.be.above(0);

      count = telemetrySignals.filter(function (s) {
        return (
          s.args[0].type === 'home' &&
          s.args[0].view === 'settings' &&
          s.args[0].target === 'background_image' &&
          s.args[0].action === 'click'
        );
      }).length;

      expect(count).to.equal(1);
    });
  });

  describe('clicking on a spring icon', function () {
    beforeEach(function () {
      subject.query(springBgSelector).click();
      return waitFor(() => subject.query('body.theme-bg-spring'));
    });

    afterEach(function () {
      subject.chrome.runtime.onMessage.removeListener(listener);
    });

    it('changes bg to spring', function () {
      expect(subject.query('body').className).to.contain('theme-bg-spring');
    });

    it('changes settings selection to spring bg', function () {
      expect(subject.query(darkBgSelector).className).to.not.contain('active');
      expect(subject.query(lightBgSelector).className).to.not.contain('active');
      expect(subject.query(blueBgSelector).className).to.not.contain('active');
      expect(subject.query(alpsBgSelector).className).to.not.contain('active');
      expect(subject.query(winterBgSelector).className).to.not.contain('active');
      expect(subject.query(springBgSelector).className).to.contain('active');
      expect(subject.query(summerBgSelector).className).to.not.contain('active');
    });

    it('sends a "saveBackgroundImage" message once', function () {
      expect(messages.has('saveBackgroundImage')).to.equal(true);
      expect(messages.get('saveBackgroundImage').length).to.equal(1);
    });

    it('sends a "home > settings > background_image > click" telemetry signal', function () {
      expect(messages.has('sendTelemetry')).to.equal(true);

      const telemetrySignals = messages.get('sendTelemetry');
      let count = 0;

      expect(telemetrySignals.length).to.be.above(0);

      count = telemetrySignals.filter(function (s) {
        return (
          s.args[0].type === 'home' &&
          s.args[0].view === 'settings' &&
          s.args[0].target === 'background_image' &&
          s.args[0].action === 'click'
        );
      }).length;

      expect(count).to.equal(1);
    });
  });

  describe('clicking on a summer icon', function () {
    beforeEach(function () {
      subject.query(summerBgSelector).click();
      return waitFor(() => subject.query('body.theme-bg-summer'));
    });

    afterEach(function () {
      subject.chrome.runtime.onMessage.removeListener(listener);
    });

    it('changes bg to summer', function () {
      expect(subject.query('body').className).to.contain('theme-bg-summer');
    });

    it('changes settings selection to summer bg', function () {
      expect(subject.query(darkBgSelector).className).to.not.contain('active');
      expect(subject.query(lightBgSelector).className).to.not.contain('active');
      expect(subject.query(blueBgSelector).className).to.not.contain('active');
      expect(subject.query(alpsBgSelector).className).to.not.contain('active');
      expect(subject.query(winterBgSelector).className).to.not.contain('active');
      expect(subject.query(springBgSelector).className).to.not.contain('active');
      expect(subject.query(summerBgSelector).className).to.contain('active');
    });

    it('sends a "saveBackgroundImage" message once', function () {
      expect(messages.has('saveBackgroundImage')).to.equal(true);
      expect(messages.get('saveBackgroundImage').length).to.equal(1);
    });

    it('sends a "home > settings > background_image > click" telemetry signal', function () {
      expect(messages.has('sendTelemetry')).to.equal(true);

      const telemetrySignals = messages.get('sendTelemetry');
      let count = 0;

      expect(telemetrySignals.length).to.be.above(0);

      count = telemetrySignals.filter(function (s) {
        return (
          s.args[0].type === 'home' &&
          s.args[0].view === 'settings' &&
          s.args[0].target === 'background_image' &&
          s.args[0].action === 'click'
        );
      }).length;

      expect(count).to.equal(1);
    });
  });
});
