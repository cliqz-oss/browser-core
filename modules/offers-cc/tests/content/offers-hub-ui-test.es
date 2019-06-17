import { expect } from '../../core/test-helpers';

import Subject from './local-helpers';
import {
  dataGenericTooltip,
  dataExtraTooltip,
  dataNewOffer,
  dataNewOffer1,
} from './fixtures/offers';

describe('Offers Hub UI tests', function () {
  let data;
  let subject;
  const target = 'cliqz-offers-cc';

  function hex(input) {
    const rgb = input.match(/\d+/g);
    const [r, g, b] = rgb.map(function (el) {
      const c = parseInt(el, 10).toString(16);
      return c.length === 1 ? `0${c}` : c;
    });
    return `#${r}${g}${b}`;
  }

  function headerTests() {
    it('renders gift icon', function () {
      const iconSelector = '.header__myoffrz-logo';
      expect(subject.query(iconSelector)).to.exist;
      expect(subject.getComputedStyle(iconSelector).background).to.contain('offers-cc-icon.svg');
    });

    it('renders three dot menu', function () {
      expect(subject.query('.header__menu')).to.exist;
    });

    it('renders label', function () {
      expect(subject.query('.header__label')).to.exist;
    });

    it('renders close button', function () {
      expect(subject.query('.header__close')).to.exist;
    });
  }

  function footerTests() {
    it('renders feedback icon and label', function () {
      expect(subject.query('.footer__face')).to.exist;
      expect(subject.query('.footer__feedback')).to.exist;
      expect(subject.query('.footer__feedback')).to.have.text('offers_hub_feedback_title');
    });

    it('renders logo', function () {
      const logoSelector = '.footer__myoffrz-logo';
      expect(subject.query(logoSelector)).to.exist;
      expect(subject.getComputedStyle(logoSelector).background).to.contain('myoffrz-logo.svg');
    });
  }

  context('with "Welcome!" message', function () {
    before(async function () {
      data = { noVoucher: true };
      subject = new Subject();
      await subject.load();
      await subject.pushData(target, data);
    });

    after(function () {
      subject.unload();
    });

    context('header:', function () { headerTests(); });
    context('footer:', function () { footerTests(); });
  });

  context('offer with optional data', function () {
    before(async function () {
      data = dataNewOffer;
      subject = new Subject();
      await subject.load();
      await subject.pushData(target, data);
    });

    after(function () {
      subject.unload();
    });

    context('header:', function () { headerTests(); });
    context('footer:', function () { footerTests(); });
  });

  context('offer without optional data', function () {
    before(async function () {
      data = dataNewOffer1;
      subject = new Subject();
      await subject.load();
      await subject.pushData(target, data);
    });

    after(function () {
      subject.unload();
    });

    context('header:', function () { headerTests(); });
    context('footer:', function () { footerTests(); });
  });

  context('generic tooltip', function () {
    before(async function () {
      data = dataGenericTooltip;
      subject = new Subject();
      await subject.load();
      await subject.pushData(target, data);
    });

    after(function () {
      subject.unload();
    });

    it('renders tooltip', function () {
      expect(subject.query('.tooltip__container')).to.exist;
    });

    it('with the gift icon', function () {
      expect(subject.query('.tooltip__image')).to.exist;
    });

    it('with the correct text', function () {
      expect(subject.query('.tooltip__text').textContent.trim())
        .to.equal('offers_hub_tooltip_new_offer');
    });

    it("doesn't render header and footer", function () {
      expect(subject.query('.header__container')).to.not.exist;
      expect(subject.query('.footer__container')).to.not.exist;
    });
  });

  context('extra tooltip with optional data', function () {
    before(async function () {
      data = dataExtraTooltip;
      subject = new Subject();
      await subject.load();
      await subject.pushData(target, data);
    });

    after(function () {
      subject.unload();
    });

    it('renders tooltip extra', function () {
      expect(subject.query('.tooltip-extra__wrapper')).to.exist;
    });

    it("left border's color is correct", function () {
      expect(hex(subject.getComputedStyle('.tooltip-extra__wrapper')['border-left-color']))
        .to.equal(data.backgroundColor);
    });

    it('renders short logo', function () {
      expect(subject.query('.tooltip-extra__image')).to.exist;
    });

    it('renders benefit and headline ', function () {
      expect(subject.query('.tooltip-extra__text')).to.exist;
      expect(subject.query('.tooltip-extra__text').textContent.trim())
        .to.equal(`${data.benefit} ${data.headline}`);
    });

    it('does not render header and footer', function () {
      expect(subject.query('.header__container')).to.not.exist;
      expect(subject.query('.footer__container')).to.not.exist;
    });
  });

  context('with "Welcome!" message', function () {
    before(async function () {
      data = { noVoucher: true };
      subject = new Subject();
      await subject.load();
      await subject.pushData(target, data);
    });

    after(function () {
      subject.unload();
    });

    context('renders welcome message', function () {
      it('renders gift icon', function () {
        expect(subject.query('.empty__image')).to.exist;
        expect(subject.query('.empty__image').src).to.contain('/images/offers-cc-icon.svg');
      });

      it('renders title', function () {
        expect(subject.query('.empty__title')).to.exist;
        expect(subject.query('.empty__title')).to.have.text('offers_hub_welcome_title');
      });

      it('renders text', function () {
        expect(subject.query('.empty__text')).to.exist;
        expect(subject.query('.empty__text')).to.have.text('offers_hub_welcome_text');
      });
    });
  });

  context('offer with optional data', function () {
    before(async function () {
      data = dataNewOffer;
      subject = new Subject();
      await subject.load();
      await subject.pushData(target, data);
    });

    after(function () {
      subject.unload();
    });

    it('rendered card successfully', function () {
      expect(subject.query('.card__wrapper')).to.exist;
    });

    it('with labels', function () {
      const exclusiveSelector = '.card-header__exclusive';
      const bestSelector = '.card-header__best_offer';

      expect(subject.query(exclusiveSelector)).to.exist;
      expect(subject.query(exclusiveSelector)).to.have.text('offers_exclusive');
      expect(subject.getComputedStyle(exclusiveSelector).backgroundImage)
        .to.contain('exclusive.svg');

      expect(subject.query(bestSelector)).to.exist;
      expect(subject.query(bestSelector)).to.have.text('offers_best_offer');
      expect(subject.getComputedStyle(bestSelector).backgroundImage)
        .to.contain('best-offer.svg');
    });

    it('with picture', function () {
      expect(subject.query('.card__image')).to.exist;
      expect(subject.getComputedStyle('.card__image').backgroundImage)
        .to.contain(data.vouchers[0].template_data.picture_dataurl);
    });

    it('with benefit', function () {
      expect(subject.query('.card__benefit')).to.exist;
      expect(subject.query('.card__benefit').textContent.trim())
        .to.equal(data.vouchers[0].template_data.benefit);
    });

    it('with headline', function () {
      expect(subject.query('.card__headline')).to.exist;
      expect(subject.query('.card__headline').textContent.trim())
        .to.equal(data.vouchers[0].template_data.headline);
    });

    it('headline has correct color', function () {
      expect(hex(subject.query('.card__headline').style.color))
        .to.equal(data.vouchers[0].backgroundColor);
    });

    it('with description', function () {
      expect(subject.query('.card__description')).to.exist;
      expect(subject.query('.card__description'))
        .to.have.text(data.vouchers[0].template_data.desc);
    });

    it('with promocode', function () {
      expect(subject.query('.card-promo__input')).to.exist;
      expect(subject.query('.card-promo__input').value)
        .to.equal(data.vouchers[0].template_data.code);
    });

    it('with "copy code" button', function () {
      expect(subject.query('.card-promo__myoffrz-copy-code')).to.exist;
      expect(subject.query('.card-promo__myoffrz-copy-code').textContent.trim())
        .to.equal('offers_hub_copy_btn');
    });

    it('with expires time', function () {
      expect(subject.query('.card-conditions__till')).to.exist;
      expect(subject.query('.card-conditions__till').textContent.trim())
        .to.equal(data.vouchers[0].validity.text);
    });

    it('expires time text has correct color', function () {
      expect(subject.query('.card-conditions__till'))
        .to.have.class('card-conditions__myoffrz-red-label');
      expect(hex(subject.getComputedStyle('.card-conditions__till').color))
        .to.equal('#ff0000');
    });

    it('with "conditions"', function () {
      expect(subject.query('.card-conditions__label')).to.exist;
      expect(subject.query('.card-conditions__label').textContent.trim())
        .to.equal('offers_conditions');
    });

    it('with button for "conditions"', function () {
      expect(subject.query('.card-conditions__icon')).to.exist;
    });

    it('with action button', function () {
      expect(subject.query('.card__button')).to.exist;
      expect(subject.query('.card__button').textContent.trim())
        .to.equal(data.vouchers[0].template_data.call_to_action.text);
    });
  });

  context('offer without optional data', function () {
    before(async function () {
      data = dataNewOffer1;
      subject = new Subject();
      await subject.load();
      await subject.pushData(target, data);
    });

    after(function () {
      subject.unload();
    });

    it('does not render labels', function () {
      expect(subject.query('.tooltip-extra__exclusive')).to.not.exist;
      expect(subject.query('.tooltip-extra__best_offer')).to.not.exist;
    });

    it('does not render picture', function () {
      expect(subject.query('.card__image')).to.not.exist;
    });

    it('doesn not render "conditions"', function () {
      expect(subject.query('.card-conditions__label')).to.not.exist;
    });

    it('rendered card successfully', function () {
      expect(subject.query('.card__wrapper')).to.exist;
    });

    it('with benefit', function () {
      expect(subject.query('.card__benefit')).to.exist;
      expect(subject.query('.card__benefit').textContent.trim())
        .to.equal(data.vouchers[0].template_data.benefit);
    });

    it('with headline', function () {
      expect(subject.query('.card__headline')).to.exist;
      expect(subject.query('.card__headline').textContent.trim())
        .to.equal(data.vouchers[0].template_data.headline || '');
    });

    it('headline has correct color', function () {
      expect(hex(subject.query('.card__headline').style.color))
        .to.equal(data.vouchers[0].backgroundColor);
    });

    it('with description', function () {
      expect(subject.query('.card__description')).to.exist;
      expect(subject.query('.card__description'))
        .to.have.text(data.vouchers[0].template_data.desc);
    });

    it('with promocode', function () {
      expect(subject.query('.card-promo__input')).to.exist;
      expect(subject.query('.card-promo__input').value)
        .to.equal(data.vouchers[0].template_data.code);
    });

    it('with "copy code" button', function () {
      expect(subject.query('.card-promo__myoffrz-copy-code')).to.exist;
      expect(subject.query('.card-promo__myoffrz-copy-code').textContent.trim())
        .to.equal('offers_hub_copy_btn');
    });

    it('with expires time', function () {
      expect(subject.query('.card-conditions__till')).to.exist;
      expect(subject.query('.card-conditions__till').textContent.trim())
        .to.equal(data.vouchers[0].validity.text);
    });

    it('expires time text has not correct color', function () {
      expect(subject.query('.card-conditions__till'))
        .to.not.have.class('.card-conditions__myoffrz-red-label');
    });

    it('with action button', function () {
      expect(subject.query('.card__button')).to.exist;
      expect(subject.query('.card__button').textContent.trim())
        .to.equal(data.vouchers[0].template_data.call_to_action.text);
    });
  });
});
