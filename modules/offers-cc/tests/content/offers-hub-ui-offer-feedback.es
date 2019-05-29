import {
  expect,
  waitFor,
} from '../../core/test-helpers';
import Subject from './local-helpers';
import { dataNewOffer } from './fixtures/offers';

context('Offers Hub UI tests for feedback for one offer', function () {
  let subject;
  let data;
  const feedbackSelector = '#cqz-vouchers-wrapper .details #voucher-feedback';
  const target = 'cliqz-offers-cc';

  before(function () {
    subject = new Subject();
    return subject.load().then(function () {
      data = dataNewOffer;
      return subject.pushData(target, data);
    }).then(function () {
      subject.query('.logo-wrapper button.close').click();

      return waitFor(function () {
        return subject.query('.details div.feedback').classList.contains('show');
      });
      // .then(function () {
      //   subject.query('.settings [data-menu-type="delete"]').click();
      //   return waitFor(function () {
      //     return subject.query('.voucher-wrapper').classList.contains('deleted');
      //   });
      // });
    });
  });

  after(function () {
    subject.unload();
  });

  it('renders offer feedback window', function () {
    expect(subject.query(feedbackSelector)).to.exist;
  });

  it('renders logo', function () {
    const logoSelector = '.logo-wrapper .logo';
    expect(subject.query(logoSelector)).to.exist;
  });

  it('renders title', function () {
    const titleSelector = `${feedbackSelector} [data-i18n="offers_hub_feedback_title"]`;
    expect(subject.query(titleSelector)).to.exist;
    expect(subject.query(titleSelector).textContent.trim())
      .to.equal('offers_hub_feedback_title');
  });

  it('renders four radio buttons', function () {
    const radioButtonSelector = `${feedbackSelector} input[name="remove_feedback"]`;
    expect(subject.query(radioButtonSelector)).to.exist;
    expect(subject.queryAll(radioButtonSelector)).to.have.length(3);
  });

  it('first three options have correct text', function () {
    const optionSelector = `${feedbackSelector} ul li label`;
    [...subject.queryAll(optionSelector)].forEach(function (option, i) {
      expect(option.textContent.trim()).to.equal(`offers_hub_feedback_option${i + 1}`);
    });
  });

  it('forth option is textArea and has correct text', function () {
    const optionSelector = `${feedbackSelector} .textarea-holder textarea`;
    expect(subject.query(optionSelector)).to.exist;
    expect(subject.query(optionSelector).hasAttribute('placeholder')).to.be.true;
    expect(subject.query(optionSelector).getAttribute('placeholder')).to.equal('offers_hub_feedback_option4');
  });

  it('renders \'close\' button', function () {
    const buttonSelector = `${feedbackSelector}  button.skip`;
    expect(subject.query(buttonSelector)).to.exist;
    expect(subject.query(buttonSelector).textContent.trim())
      .to.equal('feedback_skip');
  });
});
