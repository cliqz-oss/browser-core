/* global document */

import {
  clearIntervals,
  clone,
  defaultConfig,
  expect,
  Subject,
  waitFor
} from './helpers';

describe('Fresh tab interactions with notifications', function () {
  const notificationAreaSelector = 'div.notification';
  const settingsPanelSelector = '#settings-panel';
  const someMessage = {
    singleNotification: {
      id: 'singleNotification',
      active: true,
      type: 'notification',
      title: 'Title 1',
      description: 'Description 1',
      icon: 'settings-icon_blue.svg',
      cta_text: 'TRY IT NOW 1',
      cta_url: 'home-action:settings',
      handler: 'MESSAGE_HANDLER_FRESHTAB_MIDDLE',
      position: 'middle'
    },
  };
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
    subject.respondsWith({
      module: 'core',
      action: 'sendTelemetry',
      response: ''
    });

    newsConfig = clone(defaultConfig);
    newsConfig.response.componentsState.news.visible = true;
    newsConfig.response.messages = someMessage;
    subject.respondsWith(newsConfig);

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

    subject.respondsWith({
      module: 'freshtab',
      action: 'getOffers',
      response: []
    });
  });

  afterEach(function () {
    clearIntervals();
  });

  context('when one notification message is available', function () {
    beforeEach(function () {
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
    });

    describe('clicking on a notification icon', function () {
      const notificationIconSelector = 'div.notification div.icon';

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
      const notificationTitleSelector = 'div.notification div.content h1';

      beforeEach(function () {
        subject.query(notificationTitleSelector).click();
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
      const notificationDescriptionSelector = 'div.notification div.content p';

      beforeEach(function () {
        subject.query(notificationDescriptionSelector).click();
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
      const notificationCloseSelector = 'div.notification div.close';

      beforeEach(function () {
        subject.query(notificationCloseSelector).click();
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
        let signalExist = false;
        let count = 0;

        expect(telemetrySignals.length).to.be.above(0);
        telemetrySignals.forEach(function (item) {
          if ((item.args[0].type === 'home') &&
              (item.args[0].view === 'message') &&
              (item.args[0].target === 'close') &&
              (item.args[0].action === 'click')) {
                signalExist = true;
                count += 1;
          }
        });

        expect(signalExist).to.be.true;
        expect(count).to.equal(1);
      });
    });

    describe('clicking on a notification call to action button once', function () {
      const notificationCtaSelector = 'div.notification div.content button.cta-btn';

      beforeEach(function () {
        subject.query(notificationCtaSelector).click();
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
        let signalExist = false;
        let count = 0;

        expect(telemetrySignals.length).to.be.above(0);
        telemetrySignals.forEach(function (item) {
          if ((item.args[0].type === 'home') &&
              (item.args[0].view === 'message') &&
              (item.args[0].target === 'ok') &&
              (item.args[0].action === 'click')) {
                signalExist = true;
                count += 1;
          }
        });

        expect(signalExist).to.be.true;
        expect(count).to.equal(1);
      });

      it('sends a "settings > click" telemetry signal', function () {
        expect(messages.has('sendTelemetry')).to.equal(true);

        const telemetrySignals = messages.get('sendTelemetry');
        let signalExist = false;
        let count = 0;

        expect(telemetrySignals.length).to.be.above(0);
        telemetrySignals.forEach(function (item) {
          if ((item.args[0].type === 'home') &&
              (item.args[0].target === 'settings') &&
              (item.args[0].action === 'click')) {
                signalExist = true;
                count += 1;
          }
        });

        expect(signalExist).to.be.true;
        expect(count).to.equal(1);
      });
    });

    describe('clicking on a notification call to action button twice', function () {
      const notificationCtaSelector = 'div.notification div.content button.cta-btn';

      beforeEach(function () {
        subject.query(notificationCtaSelector).click();
        return waitFor(() => subject.query(notificationAreaSelector)).then(() => {
          subject.query(notificationCtaSelector).click();
          return waitFor(() => subject.query(notificationAreaSelector));
        });
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
        let signalExist = false;
        let count = 0;

        expect(telemetrySignals.length).to.be.above(0);
        telemetrySignals.forEach(function (item) {
          if ((item.args[0].type === 'home') &&
              (item.args[0].view === 'message') &&
              (item.args[0].target === 'ok') &&
              (item.args[0].action === 'click')) {
                signalExist = true;
                count += 1;
          }
        });

        expect(signalExist).to.be.true;
        expect(count).to.equal(2);
      });

      it('sends a "settings > click" telemetry signal', function () {
        expect(messages.has('sendTelemetry')).to.equal(true);

        const telemetrySignals = messages.get('sendTelemetry');
        let signalExist = false;
        let count = 0;

        expect(telemetrySignals.length).to.be.above(0);
        telemetrySignals.forEach(function (item) {
          if ((item.args[0].type === 'home') &&
              (item.args[0].target === 'settings') &&
              (item.args[0].action === 'click')) {
                signalExist = true;
                count += 1;
          }
        });

        expect(signalExist).to.be.true;
        expect(count).to.equal(1);
      });
    });

    describe('simulating 3rd click on the call to action button', function () {
      beforeEach(function () {
        const iframes = document.getElementsByTagName('iframe');
        const thisWindow = iframes[iframes.length - 1].contentWindow;
        thisWindow.postMessage(JSON.stringify({
          action: 'closeNotification',
          messageId: 'singleNotification',
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
