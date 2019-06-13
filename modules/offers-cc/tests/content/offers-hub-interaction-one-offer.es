import {
  expect,
  waitFor,
} from '../../core/test-helpers';
import Subject from './local-helpers';
import { dataNewOffer } from './fixtures/offers';

context('Offers Hub Interaction tests for one offer', function () {
  let subject;
  const data = dataNewOffer;
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
    it('exists', function () {
      expect(subject.query('.card-promo__myoffrz-copy-code')).to.exist;
    });

    it('with the text \'copy code\'', function () {
      expect(subject.query('.card-promo__myoffrz-copy-code')).to.have.text('offers_hub_copy_btn');
    });

    context('click on the code button', function () {
      let codeSelected = false;
      const eventHandler = () => { codeSelected = true; };

      beforeEach(async function () {
        subject.query('.card-promo__input').addEventListener('select', eventHandler);
        subject.query('.card-promo__myoffrz-copy-code').click();

        await waitFor(() =>
          subject.query('.card-promo__myoffrz-copy-code').textContent.trim() !== 'offers_hub_copy_btn');
      });

      afterEach(function () {
        subject.query('.card-promo__input').removeEventListener('select', eventHandler);
      });

      it('the code was selected', function () {
        expect(codeSelected).to.be.true;
      });

      it('renders \'code copied\'', function () {
        expect(subject.query('.card-promo__myoffrz-copy-code')).to.have.text('offers_hub_code_copy');
      });
    });
  });
});
