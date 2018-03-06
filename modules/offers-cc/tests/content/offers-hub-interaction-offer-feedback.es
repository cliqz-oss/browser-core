import {
  clearIntervals,
  expect,
  Subject,
  waitFor
} from '../../core/test-helpers';

import { dataNewOffer } from './fixtures/offers';

context('Offers Hub Interaction tests for feedback for one offer', function () {
  let subject;
  let data;
  const buildUrl = '/build/cliqz@cliqz.com/chrome/content/offers-cc/index.html';
  const target = 'cliqz-offers-cc';

  function checkRadioButtons(index) {
    context(`click on the option ${index}`, function () {
      const radioButtonSelector = `#feedback_option${index}`;
      beforeEach(function () {
        subject.query(radioButtonSelector).click();
        return waitFor(function () {
          return subject.messages.find(message => message.message.action === 'resize');
        });
      });

      it(`option ${index} is checked`, function () {
        expect(subject.query(`#feedback_option${index}`).checked).to.be.true;
        expect(subject.query(`#feedback_option${((index) % 4) + 1}`).checked).to.be.false;
        expect(subject.query(`#feedback_option${((index + 1) % 4) + 1}`).checked).to.be.false;
        expect(subject.query(`#feedback_option${((index + 2) % 4) + 1}`).checked).to.be.false;
      });

      it('button changes text to "send and close"', function () {
        const buttonSelector = '#close-feedback';
        expect(subject.query(buttonSelector)).to.exist;
        expect(subject.query(buttonSelector)).to.have.text('offers-hub-feedback-send-and-close');
      });
    });
  }

  beforeEach(function () {
    subject = new Subject();
    return subject.load(buildUrl).then(function () {
      data = dataNewOffer;
      return subject.pushData(target, data);
    })
      .then(function () {
        subject.query('.logo-wrapper button.setting').click();
        return waitFor(function () {
          return subject.query('.logo-wrapper').classList.contains('menu-opened');
        })
          .then(function () {
            subject.query('.settings [data-menu-type="delete"]').click();
            return waitFor(function () {
              return subject.query('.voucher-wrapper').classList.contains('deleted');
            });
          });
      });
  });

  afterEach(function () {
    subject.unload();
    clearIntervals();
  });

  it('renders unchecked radio buttons', function () {
    const options = subject.queryAll('#voucher-feedback ul li');
    options.forEach(function (option) {
      expect(option.querySelector('[name="remove_feedback"]')).to.have.attribute('type');
      expect(option.querySelector('[name="remove_feedback"]').type).to.equal('radio');
      expect(option.querySelector('[name="remove_feedback"]').checked).to.be.false;
    });
  });

  for (let i = 1; i < 5; i += 1) {
    checkRadioButtons(i);
  }
});
