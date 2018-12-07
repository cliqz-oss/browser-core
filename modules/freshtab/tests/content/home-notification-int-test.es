import {
  clone,
  expect,
  waitFor,
} from '../../core/test-helpers';
import {
  checkMessages,
  checkNotification,
  checkTelemetry,
  defaultConfig,
  mockMessage,
  Subject,
} from '../../core/test-helpers-freshtab';

describe('Freshtab interactions with notifications', function () {
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
    subject.respondsWithEmptyStats();
  });

  context('when one notification message is available', function () {
    beforeEach(async function () {
      await subject.load();
    });

    afterEach(function () {
      subject.unload();
    });

    describe('clicking on a notification icon', function () {
      beforeEach(function () {
        subject.query('.notification .icon').click();
        return waitFor(() => subject.query(notificationAreaSelector));
      });

      checkNotification({
        subject: () => subject,
      });
    });

    describe('clicking on a notification title', function () {
      beforeEach(function () {
        subject.query('.notification .content h1').click();
        return waitFor(() => subject.query(notificationAreaSelector));
      });

      checkNotification({
        subject: () => subject,
      });
    });

    describe('clicking on a notification decription', function () {
      beforeEach(function () {
        subject.query('.notification .content p').click();
        return waitFor(() => subject.query(notificationAreaSelector));
      });

      checkNotification({
        subject: () => subject,
      });
    });

    describe('clicking on a close button', function () {
      beforeEach(function () {
        subject.startListening();
        subject.query('.notification .close').click();
        return waitFor(() => !subject.query(notificationAreaSelector));
      });

      it('keeps settings panel closed', function () {
        expect(subject.query(settingsPanelSelector)).to.exist;
        expect(subject.query(settingsPanelSelector).className).to.not.contain('visible');
      });

      it('closes notification area', function () {
        expect(subject.query(notificationAreaSelector)).to.not.exist;
      });

      checkMessages({
        messageName: 'dismissMessage',
        subject: () => subject,
      });

      it('sends a "message > close > click" telemetry signal', function () {
        checkTelemetry({
          action: 'click',
          subject: () => subject,
          target: 'close',
          type: 'home',
          view: 'message',
        });
      });
    });

    describe('clicking on a notification call to action button once', function () {
      const ctaBtnSelector = '.notification .content button.cta-btn';

      beforeEach(function () {
        subject.startListening();
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

      checkMessages({
        messageName: 'countMessageClick',
        subject: () => subject,
      });

      it('sends a "message > ok > click" telemetry signal', function () {
        checkTelemetry({
          action: 'click',
          subject: () => subject,
          target: 'ok',
          type: 'home',
          view: 'message',
        });
      });

      it('sends a "settings > click" telemetry signal', function () {
        checkTelemetry({
          action: 'click',
          subject: () => subject,
          target: 'settings',
          type: 'home',
        });
      });
    });

    describe('clicking on a notification call to action button twice', function () {
      const ctaBtnSelector = '.notification .content button.cta-btn';

      beforeEach(async function () {
        subject.startListening();
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

      checkMessages({
        expectedCount: 2,
        messageName: 'countMessageClick',
        subject: () => subject,
      });

      it('sends two "message > ok > click" telemetry signals', function () {
        checkTelemetry({
          action: 'click',
          expectedCount: 2,
          subject: () => subject,
          target: 'ok',
          type: 'home',
          view: 'message',
        });
      });

      it('sends a "settings > click" telemetry signal', function () {
        checkTelemetry({
          action: 'click',
          subject: () => subject,
          target: 'settings',
          type: 'home',
        });
      });
    });

    describe('simulating 3rd click on the call to action button', function () {
      beforeEach(function () {
        subject.sendMessage({
          action: 'closeNotification',
          messageId: 'new-cliqz-tab',
        });
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
      subject.unload();
    });

    describe('simulating adding a new notification from message-center', function () {
      beforeEach(function () {
        subject.sendMessage({
          action: 'addMessage',
          message: otherMessage,
        });
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
