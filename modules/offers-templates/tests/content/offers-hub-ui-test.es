import { expect } from '../../core/test-helpers';

import Subject from './local-helpers';
import {
  dataGenericTooltip,
  dataNewOffer,
  dataNewOffer1,
} from './fixtures/offers';

describe('Offers Hub UI tests', function () {
  let data;
  let subject;
  const target = 'cliqz-offers-templates';

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
      expect(subject.getComputedStyle(iconSelector).background).to.contain('myoffrz-icon-logo.svg');
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
      expect(subject.query('.footer__feedback')).to.have.text('myoffrz_feedback_title');
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
      expect(subject.query('.tooltip__myoffrz-image')).to.exist;
    });

    it('with the correct text', function () {
      expect(subject.query('.tooltip__text').textContent.trim())
        .to.equal('myoffrz_tooltip_new_offer');
    });

    it("doesn't render header and footer", function () {
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
      it('renders title', function () {
        expect(subject.query('.empty__title')).to.exist;
        expect(subject.query('.empty__title')).to.contain.text('myoffrz_welcome_title');
      });

      it('renders text', function () {
        expect(subject.query('.empty__text')).to.exist;
        expect(subject.query('.empty__text')).to.have.text('myoffrz_welcome_text');
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

    // now without pictures, but lets keep it
    xit('with picture', function () {
      expect(subject.query('.card__image')).to.exist;
      expect(subject.query('.card__image').src)
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

    it('with description', function () {
      expect(subject.query('.card__description')).to.exist;
      const conditions = data.vouchers[0].template_data.conditions.substr(0, 80);
      const result = subject.query('.card__description').textContent.trim().substr(0, 80);
      expect(result).to.equal(conditions);
    });

    it('with promocode', function () {
      expect(subject.query('.card-promo__input')).to.exist;
      expect(subject.query('.card-promo__input').value)
        .to.equal(data.vouchers[0].template_data.code);
    });

    it('with "copy code" button', function () {
      expect(subject.query('.card-promo__copy-code')).to.exist;
      expect(subject.query('.card-promo__copy-code').textContent.trim())
        .to.equal('myoffrz_copy_and_go');
    });

    it('with expires time', function () {
      const { diff, diffUnit } = data.vouchers[0].validity;
      const text = `myoffrz_expires_in_${diffUnit}${diff === 1 ? '' : 's'}`;
      expect(subject.query('.group-header__till')).to.exist;
      expect(subject.query('.group-header__till').textContent.trim())
        .to.equal(text);
    });

    it('expires time text has correct color', function () {
      expect(subject.query('.group-header__till'))
        .to.have.class('group-header__till-soon');
      expect(hex(subject.getComputedStyle('.group-header__till').color))
        .to.equal('#ff3b30');
    });

    it('with action button', function () {
      expect(subject.query('.card-promo__copy-code')).to.exist;
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

    it('with description', function () {
      expect(subject.query('.card__description')).to.exist;
      expect(subject.query('.card__description').textContent.trim())
        .to.equal(data.vouchers[0].template_data.conditions || '');
    });

    it('with promocode', function () {
      expect(subject.query('.card-promo__input')).to.exist;
      expect(subject.query('.card-promo__input').value)
        .to.equal(data.vouchers[0].template_data.code);
    });

    it('with "copy code" button', function () {
      expect(subject.query('.card-promo__copy-code')).to.exist;
      expect(subject.query('.card-promo__copy-code').textContent.trim())
        .to.equal('myoffrz_copy_and_go');
    });

    it('with expires time', function () {
      const { diff, diffUnit } = data.vouchers[0].validity;
      const text = `myoffrz_expires_in_${diffUnit}${diff === 1 ? '' : 's'}`;
      expect(subject.query('.group-header__till')).to.exist;
      expect(subject.query('.group-header__till').textContent.trim())
        .to.equal(text);
    });

    it('expires time text has not correct color', function () {
      expect(subject.query('.group-header__till'))
        .to.not.have.class('.group-header__till-soon');
    });

    it('with action button', function () {
      expect(subject.query('.card-promo__copy-code')).to.exist;
    });
  });
});
