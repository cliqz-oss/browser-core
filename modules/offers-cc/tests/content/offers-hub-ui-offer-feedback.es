import {
  clearIntervals,
  expect,
  Subject,
  waitFor
} from '../../core/test-helpers';

import { dataNewOffer } from './fixtures/offers';

context('Offers Hub UI tests for feedback for one offer', function () {
  let subject;
  let data;
  const feedbackSelector = '#cqz-vouchers-wrapper .details #voucher-feedback';
  const buildUrl = '/build/cliqz@cliqz.com/chrome/content/offers-cc/index.html';
  const target = 'cliqz-offers-cc';

  before(function () {
    subject = new Subject();
    return subject.load(buildUrl).then(function () {
      data = dataNewOffer;
      return subject.pushData(target, data);
    }).then(function () {
      subject.query('.logo-wrapper button.setting').click();

      return waitFor(function () {
        return subject.query('.logo-wrapper').classList.contains('menu-opened');
      }).then(function () {
        subject.query('.settings [data-menu-type="delete"]').click();
        return waitFor(function () {
          return subject.query('.voucher-wrapper').classList.contains('deleted');
        });
      });
    });
  });

  after(function () {
    subject.unload();
    clearIntervals();
  });

  it('renders offer feedback window', function () {
    expect(subject.query(feedbackSelector)).to.exist;
  });

  it('renders logo', function () {
    const logoSelector = '.logo-wrapper .logo';
    expect(subject.query(logoSelector)).to.exist;
  });

  it('renders title', function () {
    const titleSelector = `${feedbackSelector} [data-i18n="offers-hub-feedback-title"]`;
    expect(subject.query(titleSelector)).to.exist;
    expect(subject.query(titleSelector).textContent.trim())
      .to.equal('offers-hub-feedback-title');
  });

  it('renders four radio buttons', function () {
    const radioButtonSelector = `${feedbackSelector} input[name="remove_feedback"]`;
    expect(subject.query(radioButtonSelector)).to.exist;
    expect(subject.queryAll(radioButtonSelector)).to.have.length(4);
  });

  it('first three options have correct text', function () {
    const optionSelector = `${feedbackSelector} ul li label`;
    [...subject.queryAll(optionSelector)].forEach(function (option, i) {
      expect(option.textContent.trim()).to.equal(`offers-hub-feedback-option${i + 1}`);
    });
  });

  it('forth option is textArea and has correct text', function () {
    const optionSelector = `${feedbackSelector} #feedback_option4 + textarea`;
    expect(subject.query(optionSelector)).to.exist;
    expect(subject.query(optionSelector).hasAttribute('placeholder')).to.be.true;
    expect(subject.query(optionSelector).getAttribute('placeholder')).to.equal('offers-hub-feedback-option4');
  });

  it('renders \'close\' button', function () {
    const buttonSelector = `${feedbackSelector} #close-feedback`;
    expect(subject.query(buttonSelector)).to.exist;
    expect(subject.query(buttonSelector).textContent.trim())
      .to.equal('offers-hub-feedback-close');
  });
});
