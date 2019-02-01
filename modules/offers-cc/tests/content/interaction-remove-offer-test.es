import {
  expect,
  waitFor,
} from '../../core/test-helpers';
import Subject from './local-helpers';
import {
  dataNewOffer,
  dataNewOffer1,
} from './fixtures/offers';

context('Offers Hub Interaction tests for removing offer', function () {
  let subject;
  let data;
  const target = 'cliqz-offers-cc';
  const offersSelector = '#cqz-vouchers-wrapper .voucher-wrapper';

  context('with four offers', function () {
    let firstOfferSelector;

    before(async function () {
      data = dataNewOffer;
      firstOfferSelector = `#cqz-vouchers-wrapper [data-offer-id="${data.vouchers[0].offer_id}"]`;
      subject = new Subject();
      await subject.load();
      await subject.pushData(target, data);
      subject.query(`${firstOfferSelector} .logo-wrapper button.close`).click();
      await waitFor(() =>
        subject.query(`${firstOfferSelector} .feedback`).classList.contains('show'));
      subject.query(`${firstOfferSelector} .skip`).click();
      await waitFor(() =>
        subject.messages.find(message => message.message.action === 'resize'));
    });

    after(function () {
      subject.unload();
    });

    it('the offer was deleted', function () {
      expect(subject.query(firstOfferSelector)).to.not.exist;
    });

    it('three other offers are rendered', function () {
      data.vouchers.forEach((offer, ind) => {
        if (ind !== 0) {
          const offerSelector = `#cqz-vouchers-wrapper [data-offer-id="${offer.offer_id}"]`;
          expect(subject.query(offerSelector)).to.exist;
        }
      });
    });

    it('for each offer benefit is rendered', function () {
      subject.queryAll(offersSelector).forEach(function (offer, i) {
        expect(offer.querySelector('.overview .benefit')).to.exist;
        expect(offer.querySelector('.overview .benefit'))
          .to.contain.text(data.vouchers[i + 1].template_data.benefit);
      });
    });

    it('for each offer headline is rendered', function () {
      subject.queryAll(offersSelector).forEach(function (offer, i) {
        expect(offer.querySelector('.overview .headline')).to.exist;
        expect(offer.querySelector('.overview .headline'))
          .to.contain.text(data.vouchers[i + 1].template_data.headline);
      });
    });

    it('for each offer logo is rendered', function () {
      subject.queryAll(offersSelector).forEach(function (offer, i) {
        expect(offer.querySelector('.logo-wrapper .logo')).to.exist;
        expect(offer.querySelector('.logo-wrapper .logo').style.backgroundImage)
          .to.equal(`url("${data.vouchers[i + 1].template_data.logo_dataurl}")`);
      });
    });

    it('for each offer nothing else is rendered', function () {
      subject.queryAll(offersSelector).forEach(function (offer) {
        expect(subject.getComputedStyleOfElement(offer.querySelector('.details')).overflow)
          .to.equal('hidden');
        expect(subject.getComputedStyleOfElement(offer.querySelector('.settings')).display)
          .to.equal('none');
      });
    });
  });

  context('with only one offer', function () {
    before(async function () {
      data = dataNewOffer1;
      subject = new Subject();
      await subject.load();
      await subject.pushData(target, data);
    });

    after(function () {
      subject.unload();
    });

    it('sends message after deleting the offer', async function () {
      subject.query('.logo-wrapper button.close').click();
      await waitFor(() => subject.query('.details div.feedback').classList.contains('show'));
      subject.query('.feedback .skip').click();
      const getEmptyFrameMessage = await waitFor(() =>
        subject.messages.find(message => message.message.action === 'getEmptyFrameAndData'));
      expect(getEmptyFrameMessage).to.have.nested.property('message.data').that.is.empty;
    });
  });
});
