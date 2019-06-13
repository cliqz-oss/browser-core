import {
  expect,
  waitFor,
} from '../../core/test-helpers';
import Subject from './local-helpers';
import { dataNewOffer } from './fixtures/offers';

context('Offers Hub UI tests for feedback for one offer', function () {
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

  after(function () {
    subject.unload();
  });

  it('renders offer feedback window', function () {
    expect(subject.query('.feedback__container')).to.exist;
  });

  it('renders title', function () {
    expect(subject.query('.feedback__title')).to.exist;
    expect(subject.query('.feedback__title').firstChild.textContent.trim())
      .to.equal('offers_hub_feedback_title');
  });

  it('renders four radio buttons', function () {
    expect(subject.query('.feedback__list-item')).to.exist;
    expect(subject.queryAll('.feedback__list-item')).to.have.length(3);
  });

  it('first three options have correct text', function () {
    [...subject.queryAll('.feedback__label')].forEach(function (option, i) {
      expect(option.textContent.trim()).to.equal(`offers_hub_feedback_option${i + 1}`);
    });
  });

  it('forth option is textArea and has correct text', function () {
    expect(subject.query('.feedback__field')).to.exist;
    expect(subject.query('.feedback__field').hasAttribute('placeholder')).to.be.true;
    expect(subject.query('.feedback__field').getAttribute('placeholder'))
      .to.equal('offers_hub_feedback_option4');
  });

  it('renders \'close\' button', function () {
    expect(subject.query('.feedback__myoffrz-secondary')).to.exist;
    expect(subject.query('.feedback__myoffrz-secondary').textContent.trim()).to.equal('feedback_skip');
  });
});
