import {
  clearIntervals,
  clone,
  expect,
  waitFor
} from '../../core/test-helpers';
import {
  defaultConfig,
  mockMessage,
  Subject
} from '../../core/test-helpers-freshtab';

describe('Fresh tab interactions with notifications', function () {
  const notificationAreaSelector = '.notification';
  const settingsPanelSelector = '#settings-panel';
  const otherMessage = {
    id: 'doubleNotification',
    active: true,
    type: 'notification',
    title: 'Title 2',
    description: 'Description 2',
    icon: 'settings-icon_blue.svg',
    cta_text: 'TRY IT NOW 2',
    cta_url: 'home-action:settings',
    handler: 'MESSAGE_HANDLER_FRESHTAB_MIDDLE',
    position: 'middle'
  };
  let subject;
  let messages;
  let listener;
  let newsConfig;

  beforeEach(function () {
    subject = new Subject();
    subject.respondsWithEmptyTelemetry();

    newsConfig = clone(defaultConfig);
    newsConfig.response.componentsState.news.visible = true;
    newsConfig.response.messages = mockMessage;
    subject.respondsWith(newsConfig);
    subject.respondsWithEmptySpeedDials();
    subject.respondsWithEmptyNews();
    subject.respondsWithEmptyOffers();
  });

  afterEach(function () {
    clearIntervals();
  });

  context('when one notification message is available', function () {
    beforeEach(async function () {
      await subject.load();

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
    });

    describe('clicking on a notification icon', function () {
      const notificationIconSelector = '.notification .icon';

      beforeEach(function () {
        subject.query(notificationIconSelector).click();
        return waitFor(() => subject.query(notificationAreaSelector));
      });

      it('keeps settings panel closed', function () {
        expect(subject.query(settingsPanelSelector)).to.exist;
        expect(subject.query(settingsPanelSelector).className).to.not.contain('visible');
      });

      it('keeps notification area open', function () {
        expect(subject.query(notificationAreaSelector)).to.exist;
      });
    });

    describe('clicking on a notification title', function () {
      const titleSelector = '.notification .content h1';

      beforeEach(function () {
        subject.query(titleSelector).click();
        return waitFor(() => subject.query(notificationAreaSelector));
      });

      it('keeps settings panel closed', function () {
        expect(subject.query(settingsPanelSelector)).to.exist;
        expect(subject.query(settingsPanelSelector).className).to.not.contain('visible');
      });

      it('keeps notification area open', function () {
        expect(subject.query(notificationAreaSelector)).to.exist;
      });
    });

    describe('clicking on a notification decription', function () {
      const descriptionSelector = '.notification .content p';

      beforeEach(function () {
        subject.query(descriptionSelector).click();
        return waitFor(() => subject.query(notificationAreaSelector));
      });

      it('keeps settings panel closed', function () {
        expect(subject.query(settingsPanelSelector)).to.exist;
        expect(subject.query(settingsPanelSelector).className).to.not.contain('visible');
      });

      it('keeps notification area open', function () {
        expect(subject.query(notificationAreaSelector)).to.exist;
      });
    });

    describe('clicking on a close button', function () {
      const closeBtnSelector = '.notification .close';

      beforeEach(function () {
        subject.query(closeBtnSelector).click();
        return waitFor(() => !subject.query(notificationAreaSelector));
      });

      it('keeps settings panel closed', function () {
        expect(subject.query(settingsPanelSelector)).to.exist;
        expect(subject.query(settingsPanelSelector).className).to.not.contain('visible');
      });

      it('closes notification area', function () {
        expect(subject.query(notificationAreaSelector)).to.not.exist;
      });

      it('sends a "dismissMessage" message', function () {
        expect(messages.has('dismissMessage')).to.equal(true);
        expect(messages.get('dismissMessage').length).to.equal(1);
      });

      it('sends a "message > close > click" telemetry signal', function () {
        expect(messages.has('sendTelemetry')).to.equal(true);

        const telemetrySignals = messages.get('sendTelemetry');
        let count = 0;

        expect(telemetrySignals.length).to.be.above(0);

        count = telemetrySignals.filter(function (s) {
          return (
            s.args[0].type === 'home' &&
            s.args[0].view === 'message' &&
            s.args[0].target === 'close' &&
            s.args[0].action === 'click'
          );
        }).length;

        expect(count).to.equal(1);
      });
    });

    describe('clicking on a notification call to action button once', function () {
      const ctaBtnSelector = '.notification .content button.cta-btn';

      beforeEach(function () {
        subject.query(ctaBtnSelector).click();
        return waitFor(() => subject.query(notificationAreaSelector));
      });

      it('opens settings panel', function () {
        expect(subject.query(settingsPanelSelector)).to.exist;
        expect(subject.query(settingsPanelSelector).className).to.contain('visible');
      });

      it('keeps notification area open', function () {
        expect(subject.query(notificationAreaSelector)).to.exist;
      });

      it('sends a "countMessageClick" message', function () {
        expect(messages.has('countMessageClick')).to.equal(true);
        expect(messages.get('countMessageClick').length).to.equal(1);
      });

      it('sends a "message > ok > click" telemetry signal', function () {
        expect(messages.has('sendTelemetry')).to.equal(true);

        const telemetrySignals = messages.get('sendTelemetry');
        let count = 0;

        expect(telemetrySignals.length).to.be.above(0);

        count = telemetrySignals.filter(function (s) {
          return (
            s.args[0].type === 'home' &&
            s.args[0].view === 'message' &&
            s.args[0].target === 'ok' &&
            s.args[0].action === 'click'
          );
        }).length;

        expect(count).to.equal(1);
      });

      it('sends a "settings > click" telemetry signal', function () {
        expect(messages.has('sendTelemetry')).to.equal(true);

        const telemetrySignals = messages.get('sendTelemetry');
        let count = 0;

        expect(telemetrySignals.length).to.be.above(0);

        count = telemetrySignals.filter(function (s) {
          return (
            s.args[0].type === 'home' &&
            s.args[0].target === 'settings' &&
            s.args[0].action === 'click'
          );
        }).length;

        expect(count).to.equal(1);
      });
    });

    describe('clicking on a notification call to action button twice', function () {
      const ctaBtnSelector = '.notification .content button.cta-btn';

      beforeEach(async function () {
        subject.query(ctaBtnSelector).click();
        await waitFor(() => subject.query(notificationAreaSelector));
        subject.query(ctaBtnSelector).click();
        return waitFor(() => subject.query(notificationAreaSelector));
      });

      it('results in settings panel being closed', function () {
        expect(subject.query(settingsPanelSelector)).to.exist;
        expect(subject.query(settingsPanelSelector).className).to.not.contain('visible');
      });

      it('keeps notification area open', function () {
        expect(subject.query(notificationAreaSelector)).to.exist;
      });

      it('sends two "countMessageClick" messages', function () {
        expect(messages.has('countMessageClick')).to.equal(true);
        expect(messages.get('countMessageClick').length).to.equal(2);
      });

      it('sends two "message > ok > click" telemetry signals', function () {
        expect(messages.has('sendTelemetry')).to.equal(true);

        const telemetrySignals = messages.get('sendTelemetry');
        let count = 0;

        expect(telemetrySignals.length).to.be.above(0);

        count = telemetrySignals.filter(function (s) {
          return (
            s.args[0].type === 'home' &&
            s.args[0].view === 'message' &&
            s.args[0].target === 'ok' &&
            s.args[0].action === 'click'
          );
        }).length;

        expect(count).to.equal(2);
      });

      it('sends a "settings > click" telemetry signal', function () {
        expect(messages.has('sendTelemetry')).to.equal(true);

        const telemetrySignals = messages.get('sendTelemetry');
        let count = 0;

        expect(telemetrySignals.length).to.be.above(0);

        count = telemetrySignals.filter(function (s) {
          return (
            s.args[0].type === 'home' &&
            s.args[0].target === 'settings' &&
            s.args[0].action === 'click'
          );
        }).length;

        expect(count).to.equal(1);
      });
    });

    describe('simulating 3rd click on the call to action button', function () {
      beforeEach(function () {
        const iframes = document.getElementsByTagName('iframe');
        const thisWindow = iframes[iframes.length - 1].contentWindow;
        thisWindow.postMessage(JSON.stringify({
          action: 'closeNotification',
          messageId: 'new-cliqz-tab',
        }), '*');
        return waitFor(() => !subject.query(notificationAreaSelector));
      });

      it('hides the notification area', function () {
        expect(subject.query(notificationAreaSelector)).to.not.exist;
      });
    });
  });

  context('when no notification is displayed', function () {
    beforeEach(function () {
      const oneNotificationConfig = clone(defaultConfig);
      oneNotificationConfig.response.messages = {};
      subject.respondsWith(oneNotificationConfig);
      return subject.load();
    });

    afterEach(function () {
      subject.chrome.runtime.onMessage.removeListener(listener);
      subject.unload();
    });

    describe('simulating adding a new notification from message-center', function () {
      beforeEach(function () {
        const iframes = document.getElementsByTagName('iframe');
        const thisWindow = iframes[iframes.length - 1].contentWindow;
        thisWindow.postMessage(JSON.stringify({
          action: 'addMessage',
          message: otherMessage,
        }), '*');
        return waitFor(() => subject.query(notificationAreaSelector));
      });

      it('shows the notification area', function () {
        expect(subject.query(notificationAreaSelector)).to.exist;
      });

      it('shows only one notification', function () {
        expect(subject.queryAll(notificationAreaSelector).length).to.equal(1);
      });
    });
  });
});
