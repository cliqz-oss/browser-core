import {
  clearIntervals,
  clone,
  defaultConfig,
  expect,
  Subject
} from './helpers';

describe('Fresh tab notification UI', function () {
  const mockMessage = {
    'new-cliqz-tab': {
      id: 'new-cliqz-tab',
      active: true,
      type: 'notification',
      title: 'It’s not only the inner values that count!',
      description: 'Now you can change the style on Cliqz Tab.',
      icon: 'settings-icon_blue.svg',
      cta_text: 'TRY IT NOW',
      cta_url: 'home-action:settings',
      handler: 'MESSAGE_HANDLER_FRESHTAB_MIDDLE',
      position: 'middle'
    }
  };
  let subject;
  let newsConfig;

  before(function () {
    subject = new Subject();
    subject.respondsWith({
      module: 'core',
      action: 'sendTelemetry',
      response: ''
    });

    newsConfig = clone(defaultConfig);
    newsConfig.response.componentsState.news.visible = true;
    newsConfig.response.messages = mockMessage;
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

  after(function () {
    clearIntervals();
  });

  context('when one notification message is available', function () {
    before(function () {
      return subject.load();
    });

    after(function () {
      subject.unload();
    });

    it('the area with notification is visible', function () {
      const notificationAreaSelector = 'div.notification';
      expect(subject.query(notificationAreaSelector)).to.exist;
    });

    describe('renders a notification', function () {
      it('with an existing and correct icon', function () {
        const notificationIconSelector = 'div.notification div.icon';
        expect(subject.query(notificationIconSelector)).to.exist;
        expect(subject.getComputedStyle(subject.query(notificationIconSelector)).backgroundImage)
          .to.contain('settings-icon_blue.svg');
      });

      it('with an existing and correct title', function () {
        const notificationTitleSelector = 'div.notification div.content h1';
        const notificationTitleItem = subject.query(notificationTitleSelector);
        expect(notificationTitleItem).to.exist;
        expect(notificationTitleItem).to.have.text(mockMessage['new-cliqz-tab'].title);
      });

      it('with an existing and correct text', function () {
        const notificationTextSelector = 'div.notification div.content p';
        const notificationTextItem = subject.query(notificationTextSelector);
        expect(notificationTextItem).to.exist;
        expect(notificationTextItem).to.have.text(mockMessage['new-cliqz-tab'].description);
      });

      it('with an existing call to action button', function () {
        const notificationCtaSelector = 'div.notification div.content button.cta-btn';
        const notificationCtaItem = subject.query(notificationCtaSelector);
        expect(notificationCtaItem).to.exist;
        expect(notificationCtaItem).to.have.text(mockMessage['new-cliqz-tab'].cta_text);
      });

      it('with an existing close button', function () {
        const notificationCloseSelector = 'div.notification div.close';
        const notificationCloseItem = subject.query(notificationCloseSelector);
        expect(notificationCloseItem).to.exist;
      });
    });
  });

  context('when no messages are available', function () {
    before(function () {
      subject.respondsWith(defaultConfig);
      return subject.load();
    });

    after(function () {
      subject.unload();
    });

    it('the area with notification is not visible', function () {
      const notificationAreaSelector = 'div.notification';
      expect(subject.query(notificationAreaSelector)).to.not.exist;
    });
  });
});
