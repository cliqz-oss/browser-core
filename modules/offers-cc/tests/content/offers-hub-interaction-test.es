import {
  expect,
  waitFor,
} from '../../core/test-helpers';
import Subject from './local-helpers';
import {
  dataNewOffer,
  dataNewOffer1,
} from './fixtures/offers';

context('Offers Hub Interaction tests', function () {
  let subject;
  let data;
  const target = 'cliqz-offers-cc';

  beforeEach(async function () {
    subject = new Subject();
    await subject.load();
  });

  afterEach(function () {
    subject.unload();
  });

  describe('clicking on the second offer', function () {
    context('with four offers', function () {
      beforeEach(async function () {
        data = dataNewOffer;
        await subject.pushData(target, data);

        const allCollapsedOffers = subject.queryAll('.badge__wrapper');
        expect(allCollapsedOffers).to.have.length(3);
        allCollapsedOffers[0].click();
        await waitFor(() =>
          subject.messages.find(message => message.message.action === 'resize'));
      });

      it('collapses the first offer and keeps 3rd and 4th collapsed', function () {
        const allCollapsedOffersTitles = subject.queryAll('.badge__wrapper .badge__title');
        expect(allCollapsedOffersTitles).to.have.length(3);
        expect(allCollapsedOffersTitles[0]).to.have.text(data.vouchers[0].template_data.benefit);
        expect(allCollapsedOffersTitles[1]).to.have.text(data.vouchers[2].template_data.benefit);
        expect(allCollapsedOffersTitles[2]).to.have.text(data.vouchers[3].template_data.benefit);
      });

      it('extends the second offer', function () {
        const extendedOfferBenefit = subject.query('.card__wrapper .card__benefit');
        expect(extendedOfferBenefit).to.have.text(data.vouchers[1].template_data.benefit);
      });
    });
  });

  describe('removing one offer', function () {
    context('with four offers', function () {
      beforeEach(async function () {
        data = dataNewOffer;
        await subject.pushData(target, data);
        subject.query('.card-header__trash').click();
        await waitFor(() =>
          subject.messages.find(message => message.message.action === 'resize'));
        subject.query('.feedback__myoffrz-secondary').click();
        await waitFor(() =>
          subject.messages.find(message => message.message.action === 'resize'));
      });

      it('three other offers are rendered', function () {
        expect(subject.query('.card__wrapper')).to.exist;
        expect(subject.queryAll('.badge__container')).to.have.length(2);
      });

      it('card benefit is rendered', function () {
        const shift = 1; // skip `deleted`
        expect(subject.query('.card__benefit')).to.exist;
        expect(subject.query('.card__benefit'))
          .to.contain.text(data.vouchers[shift].template_data.benefit);
      });

      it('card headline is rendered', function () {
        const shift = 1; // skip `deleted`
        expect(subject.query('.card__headline')).to.exist;
        expect(subject.query('.card__headline'))
          .to.contain.text(data.vouchers[shift].template_data.headline);
      });

      it('card logo is rendered', function () {
        const shift = 1; // skip `deleted`
        expect(subject.query('.card-header__image')).to.exist;
        expect(subject.query('.card-header__image').style.backgroundImage)
          .to.equal(`url("${data.vouchers[shift].template_data.logo_dataurl}")`);
      });

      it('for each badge benefit is rendered', function () {
        const badges = subject.queryAll('.badge__container');

        expect(badges).to.have.length.above(0);
        [...badges].forEach(function (badge, i) {
          const shift = 2; // skip `deleted` and `active`
          expect(badge.querySelector('.badge__title')).to.exist;
          expect(badge.querySelector('.badge__title'))
            .to.contain.text(data.vouchers[i + shift].template_data.benefit);
        });
      });

      it('for each badge headline is rendered', function () {
        const badges = subject.queryAll('.badge__container');

        expect(badges).to.have.length.above(0);
        [...badges].forEach(function (badge, i) {
          const shift = 2; // skip `deleted` and `active`
          expect(badge.querySelector('.badge__description')).to.exist;
          expect(badge.querySelector('.badge__description'))
            .to.contain.text(data.vouchers[i + shift].template_data.headline);
        });
      });

      it('for each offer logo is rendered', function () {
        const badges = subject.queryAll('.badge__container');

        expect(badges).to.have.length.above(0);
        [...badges].forEach(function (badge, i) {
          const shift = 2; // skip `deleted` and `active`
          expect(badge.querySelector('.badge__image')).to.exist;
          expect(badge.querySelector('.badge__image').style.backgroundImage)
            .to.equal(`url("${data.vouchers[i + shift].template_data.logo_dataurl}")`);
        });
      });
    });

    context('with only one offer', function () {
      beforeEach(async function () {
        data = dataNewOffer1;
        await subject.pushData(target, data);
        subject.query('.card-header__trash').click();
        await waitFor(() =>
          subject.messages.find(message => message.message.action === 'resize'));
        subject.query('.feedback__myoffrz-secondary').click();
        await waitFor(() =>
          subject.messages.find(message => message.message.action === 'resize'));
      });

      it('render the empty view', async function () {
        expect(subject.query('.empty__container')).to.exist;
      });
    });
  });

  describe('clicking on code button', function () {
    let codeSelected = false;
    const eventHandler = () => { codeSelected = true; };

    beforeEach(async function () {
      data = dataNewOffer;
      await subject.pushData(target, dataNewOffer);

      subject.query('.card-promo__input').addEventListener('select', eventHandler);
      subject.query('.card-promo__myoffrz-copy-code').click();

      await waitFor(() =>
        subject.query('.card-promo__myoffrz-copy-code').textContent.trim() !== 'offers_hub_copy_btn');
    });

    afterEach(function () {
      subject.query('.card-promo__input').removeEventListener('select', eventHandler);
    });

    it('selects the code', function () {
      expect(codeSelected).to.be.true;
    });

    it('renders \'code copied\'', function () {
      expect(subject.query('.card-promo__myoffrz-copy-code')).to.have.text('offers_hub_code_copy');
    });
  });

  describe('clicking on "Conditions"', function () {
    beforeEach(async function () {
      data = dataNewOffer;
      await subject.pushData(target, data);
      subject.query('.card-conditions__label').click();
      await waitFor(() =>
        subject.messages.find(message => message.message.action === 'resize'));
    });

    it('renders card benefit', function () {
      expect(subject.query('.card__benefit')).to.exist;
      expect(subject.query('.card__benefit'))
        .to.contain.text(data.vouchers[0].template_data.benefit);
    });

    it('does not render card headline and image', function () {
      expect(subject.getComputedStyle('.card__screen-main').visibility).to.equal('hidden');
    });

    it('renders conditions text', function () {
      expect(subject.query('.card__conditions')).to.exist;
      expect(subject.query('.card__conditions'))
        .to.contain.text(data.vouchers[0].template_data.conditions);
    });

    describe('twice', function () {
      beforeEach(async function () {
        subject.query('.card-conditions__label').click();
        await waitFor(() =>
          subject.messages.find(message => message.message.action === 'resize'));
      });

      it('renders card headline', function () {
        expect(subject.query('.card__headline')).to.exist;
        expect(subject.query('.card__headline'))
          .to.contain.text(data.vouchers[0].template_data.headline);
      });

      it('does not render conditions text', function () {
        expect(subject.getComputedStyle('.card__screen-secondary').display).to.equal('none');
      });
    });
  });
});
