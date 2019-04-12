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

  context('with four offers', function () {
    before(async function () {
      data = dataNewOffer;
      subject = new Subject();
      await subject.load();
      await subject.pushData(target, data);
      subject.query('.card-header__trash').click();
      await waitFor(() =>
        subject.messages.find(message => message.message.action === 'resize'));
      subject.query('.feedback__myoffrz-secondary').click();
      await waitFor(() =>
        subject.messages.find(message => message.message.action === 'resize'));
    });

    after(function () {
      subject.unload();
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
      subject.queryAll('.badge__container').forEach(function (badge, i) {
        const shift = 2; // skip `deleted` and `active`
        expect(badge.querySelector('.badge__title')).to.exist;
        expect(badge.querySelector('.badge__title'))
          .to.contain.text(data.vouchers[i + shift].template_data.benefit);
      });
    });

    it('for each badge headline is rendered', function () {
      subject.queryAll('.badge__container').forEach(function (badge, i) {
        const shift = 2; // skip `deleted` and `active`
        expect(badge.querySelector('.badge__description')).to.exist;
        expect(badge.querySelector('.badge__description'))
          .to.contain.text(data.vouchers[i + shift].template_data.headline);
      });
    });

    it('for each offer logo is rendered', function () {
      subject.queryAll('.badge__container').forEach(function (badge, i) {
        const shift = 2; // skip `deleted` and `active`
        expect(badge.querySelector('.badge__image')).to.exist;
        expect(badge.querySelector('.badge__image').style.backgroundImage)
          .to.equal(`url("${data.vouchers[i + shift].template_data.logo_dataurl}")`);
      });
    });
  });

  context('with only one offer', function () {
    before(async function () {
      data = dataNewOffer1;
      subject = new Subject();
      await subject.load();
      await subject.pushData(target, data);
      subject.query('.card-header__trash').click();
      await waitFor(() =>
        subject.messages.find(message => message.message.action === 'resize'));
      subject.query('.feedback__myoffrz-secondary').click();
      await waitFor(() =>
        subject.messages.find(message => message.message.action === 'resize'));
    });

    after(function () {
      subject.unload();
    });

    it('render the empty view', async function () {
      expect(subject.query('.empty__container')).to.exist;
    });
  });
});
