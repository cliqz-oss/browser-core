import {
  expect,
  waitFor,
} from '../../core/test-helpers';
import Subject from './local-helpers';
import { dataNewOffer } from './fixtures/offers';

context('Offers Hub Interaction tests for feedback', function () {
  let subject;
  let data;
  const target = 'cliqz-offers-templates';

  beforeEach(async function () {
    subject = new Subject();
    await subject.load();
    data = dataNewOffer;
    await subject.pushData(target, data);
    subject.query('.card__trash').click();

    await waitFor(() =>
      subject.messages.find(message => message.message.action === 'resize'));
  });

  afterEach(function () {
    subject.unload();
  });

  describe('clicking on the trash icon', function () {
    it('removes the offer', function () {
      expect(subject.query('.feedback__wrapper')).to.exist;
    });

    it('renders inactive "send" button', function () {
      const sendButton = subject.query('.feedback__button.feedback__disabled');
      expect(sendButton).to.exist;
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
      expect(subject.queryAll('.card__wrapper')).to.have.length(3);
    });
  });
});
