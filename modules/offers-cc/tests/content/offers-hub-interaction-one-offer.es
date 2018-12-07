import {
  expect,
  waitFor,
} from '../../core/test-helpers';
import Subject from './local-helpers';
import { dataNewOffer } from './fixtures/offers';

context('Offers Hub Interaction tests for one offer', function () {
  let subject;
  const data = dataNewOffer;
  const offerSelector = '#cqz-vouchers-wrapper #cqz-vouchers-holder '
        + `[data-offer-id="${data.vouchers[0].offer_id}"] .details`;
  const target = 'cliqz-offers-cc';

  beforeEach(async function () {
    subject = new Subject();
    await subject.load();
    await subject.pushData(target, data);
  });

  afterEach(function () {
    subject.unload();
  });

  context('code button', function () {
    const codeButtonSelector = `${offerSelector} .promocode-wrapper button.copy-code`;

    it('exists', function () {
      expect(subject.query(codeButtonSelector)).to.exist;
    });

    it('with the text \'copy code\'', function () {
      expect(subject.query(codeButtonSelector)).to.have.text('offers_hub_copy_btn');
    });

    context('click on the code button', function () {
      let execCommand;
      let codeSelected = false;
      const eventHandler = () => { codeSelected = true; };

      beforeEach(async function () {
        subject.query(`${offerSelector} .promocode-wrapper input.code`)
          .addEventListener('select', eventHandler);
        execCommand = subject.iframe.contentWindow.document.execCommand;
        subject.iframe.contentWindow.document.execCommand = () => true;
        subject.query(codeButtonSelector).click();

        await waitFor(() =>
          subject.query(codeButtonSelector).textContent.trim() !== 'offers_hub_copy_btn');
      });

      afterEach(function () {
        subject.query(`${offerSelector} .promocode-wrapper input.code`)
          .removeEventListener('select', eventHandler);
        subject.iframe.contentWindow.document.execCommand = execCommand;
      });

      it('the code was selected', function () {
        expect(codeSelected).to.be.true;
      });

      it('renders \'code copied\'', function () {
        expect(subject.query(codeButtonSelector)).to.have.text('offers_hub_code_copy');
      });
    });
  });
});
