import {
  expect,
  waitFor,
} from '../../core/test-helpers';
import Subject from './local-helpers';
import { dataNewOffer } from './fixtures/offers';

context('Offers Hub Interaction tests for feedback for one offer', function () {
  let subject;
  let data;
  const target = 'cliqz-offers-cc';

  before(async function () {
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

  it('renders unchecked radio buttons', function () {
    const options = subject.queryAll('.feedback__list-item');
    options.forEach(function (option) {
      expect(option.querySelector('[name="remove_feedback"]')).to.have.attribute('type');
      expect(option.querySelector('[name="remove_feedback"]').type).to.equal('radio');
      expect(option.querySelector('[name="remove_feedback"]').checked).to.be.false;
    });
  });
});
