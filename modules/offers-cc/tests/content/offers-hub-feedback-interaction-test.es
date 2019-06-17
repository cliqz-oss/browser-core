import {
  expect,
  waitFor,
} from '../../core/test-helpers';
import Subject from './local-helpers';
import { dataNewOffer } from './fixtures/offers';

context('Offers Hub Interaction tests for feedback', function () {
  let subject;
  let data;
  const target = 'cliqz-offers-cc';

  beforeEach(async function () {
    subject = new Subject();
    await subject.load();
    data = dataNewOffer;
    await subject.pushData(target, data);
    subject.query('.card-header__trash').click();

    await waitFor(() =>
      subject.messages.find(message => message.message.action === 'resize'));
  });

  afterEach(function () {
    subject.unload();
  });

  describe('clicking on the trash icon', function () {
    it('removes the offer', function () {
      expect(subject.query('.card__wrapper')).to.not.exist;
    });

    it('renders confirmation text', function () {
      const feedbackNotification = subject.query('.feedback__notification');
      expect(feedbackNotification).to.exist;
      expect(feedbackNotification).to.have.text('offers_offer_removed');
    });

    it('renders inactive "send" button', function () {
      const sendButton = subject.query('.feedback__button');
      expect(sendButton).to.exist;
      expect(sendButton.disabled).to.be.true;
    });

    it('renders three unchecked radio buttons', function () {
      const options = subject.queryAll('.feedback__list-item');
      expect(options).to.have.length(3);

      options.forEach(function (option) {
        expect(option.querySelector('[name="remove_feedback"]')).to.have.attribute('type');
        expect(option.querySelector('[name="remove_feedback"]').type).to.equal('radio');
        expect(option.querySelector('[name="remove_feedback"]').checked).to.be.false;
      });
    });

    it('does not delete other existing offers', function () {
      expect(subject.queryAll('.badge__wrapper')).to.have.length(3);
    });
  });
});
