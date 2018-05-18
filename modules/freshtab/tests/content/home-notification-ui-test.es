import {
  clearIntervals,
  clone,
  expect
} from '../../core/test-helpers';
import {
  defaultConfig,
  mockMessage,
  Subject
} from '../../core/test-helpers-freshtab';

describe('Fresh tab notification UI', function () {
  let subject;
  let newsConfig;

  before(function () {
    subject = new Subject();
    subject.respondsWithEmptyTelemetry();
    subject.respondsWithEmptySpeedDials();
    subject.respondsWithEmptyNews();
    subject.respondsWithEmptyOffers();

    newsConfig = clone(defaultConfig);
    newsConfig.response.componentsState.news.visible = true;
    newsConfig.response.messages = mockMessage;
    subject.respondsWith(newsConfig);
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
      const notificationAreaSelector = '.notification';
      expect(subject.query(notificationAreaSelector)).to.exist;
    });

    describe('renders a notification', function () {
      it('with an existing and correct icon', function () {
        const iconSelector = '.notification .icon';
        expect(subject.query(iconSelector)).to.exist;
        expect(subject.getComputedStyle(subject.query(iconSelector)).backgroundImage)
          .to.contain('settings-icon_blue.svg');
      });

      it('with an existing and correct title', function () {
        const titleSelector = '.notification .content h1';
        const $title = subject.query(titleSelector);
        expect($title).to.exist;
        expect($title).to.have.text(mockMessage['new-cliqz-tab'].title);
      });

      it('with an existing and correct text', function () {
        const textSelector = '.notification .content p';
        const $text = subject.query(textSelector);
        expect($text).to.exist;
        expect($text).to.have.text(mockMessage['new-cliqz-tab'].description);
      });

      it('with an existing call to action button', function () {
        const ctaBtnSelector = '.notification .content button.cta-btn';
        const $ctaBtn = subject.query(ctaBtnSelector);
        expect($ctaBtn).to.exist;
        expect($ctaBtn).to.have.text(mockMessage['new-cliqz-tab'].cta_text);
      });

      it('with an existing close button', function () {
        const closeBtnSelector = '.notification .close';
        const $closeBtn = subject.query(closeBtnSelector);
        expect($closeBtn).to.exist;
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
      const notificationAreaSelector = '.notification';
      expect(subject.query(notificationAreaSelector)).to.not.exist;
    });
  });
});
