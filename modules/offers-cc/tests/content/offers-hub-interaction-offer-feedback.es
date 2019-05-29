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
        expect(subject.query(`#feedback_option${((index) % 3) + 1}`).checked).to.be.false;
        expect(subject.query(`#feedback_option${((index + 1) % 3) + 1}`).checked).to.be.false;
      });
    });
  }

  beforeEach(function () {
    subject = new Subject();
    return subject.load().then(function () {
      data = dataNewOffer;
      return subject.pushData(target, data);
    })
      .then(function () {
        subject.query('.logo-wrapper .close').click();
        return waitFor(function () {
          return subject.query('.feedback.show') && subject.query('.voucher-wrapper').classList.contains('deleted');
        });
      });
  });

  afterEach(function () {
    subject.unload();
  });

  it('renders unchecked radio buttons', function () {
    const options = subject.queryAll('#voucher-feedback ul li');
    options.forEach(function (option, ind) {
      if (ind < 3) {
        expect(option.querySelector('[name="remove_feedback"]')).to.have.attribute('type');
        expect(option.querySelector('[name="remove_feedback"]').type).to.equal('radio');
        expect(option.querySelector('[name="remove_feedback"]').checked).to.be.false;
      }
    });
  });

  for (let i = 1; i < 4; i += 1) {
    checkRadioButtons(i);
  }
});
