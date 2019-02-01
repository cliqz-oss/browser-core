import { expect } from '../../core/test-helpers';
import { isWebExtension } from '../../../core/platform';

import Subject from './local-helpers';
import {
  dataGenericTooltip,
  dataExtraTooltip,
  dataExtraTooltip1,
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

  function offersHubFrameTests() {
    context('header part: ', function () {
      it('renders \'MyOffrz\'', function () {
        const offersHubTitleSelector = '.offers_label';
        expect(subject.query(offersHubTitleSelector)).to.exist;
        if (isWebExtension) {
          expect(subject.query(offersHubTitleSelector)).to.have.text('offers_hub_title');
        } else {
          expect(subject.query(offersHubTitleSelector)).to.have.text('cliqz_offers');
        }
      });

      it('renders three dots menu icon', function () {
        expect(subject.query('header .setting')).to.exist;
      });
    });

    context('footer part: ', function () {
      if (isWebExtension) {
        it('doesn\'t render ad label', function () {
          expect(subject.query('footer .ad-label')).to.not.exist;
        });

        it('renders Cliqz icon - link', function () {
          expect(subject.query('footer [title="offers_hub_powered_by_offrz"]')).to.exist;
          expect(subject.query('footer a').href)
            .to.equal('https://myoffrz.com/fuer-nutzer');
        });
      } else {
        it('renders ad label', function () {
          expect(subject.query('footer .ad-label')).to.exist;
        });

        it('renders Cliqz icon - link', function () {
          expect(subject.query('footer [title="offers_hub_powered_by"]')).to.exist;
          expect(subject.query('footer a').href)
            .to.equal('https://cliqz.com/myoffrz');
        });
      }
    });
  }

  function noOffersMessageTests() {
    context('renders welcome message', function () {
      const noVoucherSelector = '#cqz-vouchers-wrapper .no-voucher .cqz-no-vouchers-msg';
      it('renders gift icon', function () {
        expect(subject.query(`${noVoucherSelector} img`)).to.exist;
        expect(subject.query(`${noVoucherSelector} img`).src)
          .to.contain('/images/offers-cc-icon.svg');
      });

      it('renders title', function () {
        const titleSelector = `${noVoucherSelector} [data-i18n="offers_hub_welcome_title"]`;
        expect(subject.query(titleSelector)).to.exist;
        expect(subject.query(titleSelector)).to.have.text('offers_hub_welcome_title');
      });

      it('renders text', function () {
        const textSelector = `${noVoucherSelector} [data-i18n="offers_hub_welcome_text"]`;
        expect(subject.query(textSelector)).to.exist;
        expect(subject.query(textSelector)).to.have.text('offers_hub_welcome_text');
      });
    });
  }

  context('generic tooltip', function () {
    const offerContentSelector = '#cqz-offer-cc-content';

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
      expect(subject.query(offerContentSelector)).to.exist;
      expect(subject.query(offerContentSelector).classList.contains('tooltip')).to.be.true;
    });

    it('with the gift icon', function () {
      const imageSelector = `${offerContentSelector}.tooltip img`;
      expect(subject.query(imageSelector)).to.exist;
      expect(subject.query(imageSelector).src).to.contain(data.icon);
    });

    it('with the correct text', function () {
      expect(subject.query(`${offerContentSelector}.tooltip`).textContent.trim())
        .to.equal(data.headline);
    });

    it('doesn\'t render header and footer', function () {
      expect(subject.query('header')).to.not.exist;
      expect(subject.query('footer')).to.not.exist;
    });
  });

  context('extra tooltip with optional data', function () {
    const offerContentSelector = '#cqz-offer-cc-content';

    before(async function () {
      data = dataExtraTooltip;
      subject = new Subject();
      await subject.load();
      await subject.pushData(target, data);
    });

    after(function () {
      subject.unload();
    });

    it('renders tooltip', function () {
      expect(subject.query(offerContentSelector)).to.exist;
      expect(subject.query(offerContentSelector)).to.have.class('tooltip');
      expect(subject.query(`${offerContentSelector} .light`)).to.exist;
    });

    it('left border\'s color is correct', function () {
      expect(hex(subject.getComputedStyle(`${offerContentSelector} .light`)['border-left-color']))
        .to.equal(data.backgroundColor);
    });

    it('renders short logo', function () {
      expect(subject.query(`${offerContentSelector} .light .logo.short`)).to.exist;
    });

    it('renders benefit and headline ', function () {
      expect(subject.query(`${offerContentSelector} .light>p`)
        .textContent.trim()).to.equal(`${data.benefit} ${data.headline}`);
    });

    it('renders labels', function () {
      const exclusiveSelector = `${offerContentSelector} .light .labels .exclusive`;
      const bestSelector = `${offerContentSelector} .light .labels .best_offer`;
      expect(subject.query(exclusiveSelector)).to.exist;
      expect(subject.query(exclusiveSelector)).to.have.text('offers_exclusive');
      expect(subject.query(bestSelector)).to.exist;
      expect(subject.query(bestSelector)).to.have.text('offers_best_offer');
    });

    it('doesn\'t render header and footer', function () {
      expect(subject.query('header')).to.not.exist;
      expect(subject.query('footer')).to.not.exist;
    });
  });

  context('extra tooltip without optional data', function () {
    const offerContentSelector = '#cqz-offer-cc-content';

    before(async function () {
      data = dataExtraTooltip1;
      subject = new Subject();
      await subject.load();
      await subject.pushData(target, data);
    });

    after(function () {
      subject.unload();
    });

    it('renders tooltip', function () {
      expect(subject.query(offerContentSelector)).to.exist;
      expect(subject.query(offerContentSelector)).to.have.class('tooltip');
      expect(subject.query(`${offerContentSelector} .light`)).to.exist;
    });

    it('left border\'s color is correct', function () {
      expect(hex(subject.getComputedStyle(`${offerContentSelector} .light`)['border-left-color']))
        .to.equal(data.backgroundColor);
    });

    it('renders short logo', function () {
      const logoSelector = `${offerContentSelector} .light .logo.short`;
      expect(subject.query(logoSelector)).to.exist;
      expect(subject.getComputedStyle(logoSelector)['background-image'])
        .to.equal(`url("${data.backgroundImage}")`);
    });

    it('renders benefit and headline ', function () {
      expect(subject.query(`${offerContentSelector} .light>p`)
        .textContent.trim()).to.equal(`${data.benefit} ${data.headline}`);
    });

    it('doesn\'t render labels', function () {
      const exclusiveSelector = `${offerContentSelector} .light .labels .exclusive`;
      const bestSelector = `${offerContentSelector} .light .labels .best_offer`;
      expect(subject.query(exclusiveSelector)).to.not.exist;
      expect(subject.query(bestSelector)).to.not.exist;
    });

    it('doesn\'t render header and footer', function () {
      expect(subject.query('header')).to.not.exist;
      expect(subject.query('footer')).to.not.exist;
    });
  });

  context('with \'Welcome!\' message', function () {
    before(async function () {
      subject = new Subject();
      await subject.load();
      await subject.pushData(target, {
        noVoucher: true,
        isWebExtension,
      });
    });

    after(function () {
      subject.unload();
    });

    offersHubFrameTests();
    noOffersMessageTests();
  });

  context('offer with optional data', function () {
    let offerSelector;

    before(async function () {
      data = dataNewOffer;
      offerSelector = '#cqz-vouchers-wrapper #cqz-vouchers-holder '
        + `[data-offer-id="${data.vouchers[0].offer_id}"] .details`;
      subject = new Subject();
      await subject.load();
      await subject.pushData(target, data);
    });

    after(function () {
      subject.unload();
    });

    offersHubFrameTests();

    it('rendered successfully', function () {
      expect(subject.query(offerSelector)).to.exist;
    });

    it('with labels', function () {
      const exclusiveSelector = `${offerSelector} .left-labels .exclusive`;
      const bestSelector = `${offerSelector} .left-labels .best_offer`;
      expect(subject.query(exclusiveSelector)).to.exist;
      expect(subject.query(bestSelector)).to.exist;
      expect(subject.query(exclusiveSelector)).to.have.text('offers_exclusive');
      expect(subject.query(bestSelector)).to.have.text('offers_best_offer');
    });

    it('with picture', function () {
      const pictureSelector = `${offerSelector} .picture`;
      expect(subject.query(pictureSelector)).to.exist;
      expect(subject.getComputedStyle(pictureSelector).backgroundImage)
        .to.contain(data.vouchers[0].template_data.picture_dataurl);
    });

    it('with benefit', function () {
      const benefitSelector = `${offerSelector} .benefit`;
      expect(subject.query(benefitSelector)).to.exist;
      expect(subject.query(benefitSelector).textContent.trim())
        .to.equal(data.vouchers[0].template_data.benefit);
    });

    it('with headline', function () {
      const headlineSelector = `${offerSelector} .headline`;
      expect(subject.query(headlineSelector)).to.exist;
      expect(subject.query(headlineSelector).textContent.trim())
        .to.equal(data.vouchers[0].template_data.headline);
    });

    it('headline has correct color', function () {
      const headlineSelector = `${offerSelector} .headline`;
      expect(hex(subject.query(headlineSelector).style.color))
        .to.equal(data.vouchers[0].backgroundColor);
    });

    it('with description', function () {
      const descriptionSelector = `${offerSelector} .description`;
      expect(subject.query(descriptionSelector)).to.exist;
      expect(subject.query(descriptionSelector)).to.have.text(data.vouchers[0].template_data.desc);
    });

    it('with promocode', function () {
      const promocodeSelector = `${offerSelector} .promocode-wrapper .code`;
      expect(subject.query(promocodeSelector)).to.exist;
      expect(subject.query(promocodeSelector).value)
        .to.equal(data.vouchers[0].template_data.code);
    });

    it('with \'copy code\' button', function () {
      const buttonSelector = `${offerSelector} .promocode-wrapper .copy-code`;
      expect(subject.query(buttonSelector)).to.exist;
      expect(subject.query(buttonSelector).textContent.trim())
        .to.equal('offers_hub_copy_btn');
    });

    it('with expires time', function () {
      const validitySelector = `${offerSelector} .validity-wrapper .validity`;
      expect(subject.query(validitySelector)).to.exist;
      expect(subject.query(validitySelector).textContent.trim())
        .to.equal(data.vouchers[0].validity.text);
    });

    it('expires time text has correct color', function () {
      const validitySelector = `${offerSelector} .validity-wrapper .validity`;
      expect(subject.query(validitySelector)).to.have.class('red');
      expect(hex(subject.getComputedStyle(`${validitySelector}.red`).color)).to.equal('#ff0000');
    });

    it('with \'conditions\'', function () {
      const conditionsSelector = `${offerSelector} .validity-wrapper .condition`;
      expect(subject.query(conditionsSelector)).to.exist;
      expect(subject.query(conditionsSelector).textContent.trim())
        .to.equal('offers_conditions');
    });

    it('with button for \'conditions\'', function () {
      const buttonSelector = `${offerSelector} .validity-wrapper .condition button`;
      expect(subject.query(buttonSelector)).to.exist;
    });

    it('with action button', function () {
      const buttonSelector = `${offerSelector} .cta-btn`;
      expect(subject.query(buttonSelector)).to.exist;
      expect(subject.query(buttonSelector).textContent.trim())
        .to.equal(data.vouchers[0].template_data.call_to_action.text);
    });

    it('url for button is correct', function () {
      expect(subject.query(`${offerSelector} .cta-btn`))
        .to.have.attribute('data-url');
      expect(subject.query(`${offerSelector} .cta-btn`).getAttribute('data-url'))
        .to.equal(data.vouchers[0].template_data.call_to_action.url);
    });

    it('footer: renders arrow to see more offers', function () {
      const buttonSelector = 'footer button#expand-button';
      expect(subject.query(buttonSelector)).to.exist;
    });
  });

  context('offer without optional data', function () {
    let offerSelector;

    before(async function () {
      data = dataNewOffer1;
      offerSelector = '#cqz-vouchers-wrapper #cqz-vouchers-holder '
        + `[data-offer-id="${data.vouchers[0].offer_id}"] .details`;
      subject = new Subject();
      await subject.load();
      await subject.pushData(target, data);
    });

    after(function () {
      subject.unload();
    });

    offersHubFrameTests();

    it('rendered', function () {
      expect(subject.query(offerSelector)).to.exist;
    });

    it('doesn\'t render labels', function () {
      const exclusiveSelector = `${offerSelector} .left-labels .exclusive`;
      const bestSelector = `${offerSelector} .left-labels .best_offer`;
      expect(subject.query(exclusiveSelector)).to.not.exist;
      expect(subject.query(bestSelector)).to.not.exist;
    });

    it('doesn\t render picture', function () {
      const pictureSelector = '.picture';
      expect(subject.query(pictureSelector)).to.not.exist;
    });

    it('with benefit', function () {
      const benefitSelector = `${offerSelector} .benefit`;
      expect(subject.query(benefitSelector)).to.exist;
      expect(subject.query(benefitSelector).textContent.trim())
        .to.equal(data.vouchers[0].template_data.benefit);
    });

    it('with headline', function () {
      const headlineSelector = `${offerSelector} .headline`;
      expect(subject.query(headlineSelector)).to.exist;
      expect(subject.query(headlineSelector).textContent.trim())
        .to.equal(data.vouchers[0].template_data.title);
    });

    it('headline has correct color', function () {
      const headlineSelector = `${offerSelector} .headline`;
      expect(hex(subject.query(headlineSelector).style.color))
        .to.equal(data.vouchers[0].backgroundColor);
    });

    it('with description', function () {
      const descriptionSelector = `${offerSelector} .description`;
      expect(subject.query(descriptionSelector)).to.exist;
      expect(subject.query(descriptionSelector)).to.have.text(data.vouchers[0].template_data.desc);
    });

    it('with promocode', function () {
      const promocodeSelector = `${offerSelector} .promocode-wrapper .code`;
      expect(subject.query(promocodeSelector)).to.exist;
      expect(subject.query(promocodeSelector).value)
        .to.equal(data.vouchers[0].template_data.code);
    });

    it('with \'copy code\' button', function () {
      const buttonSelector = `${offerSelector} .promocode-wrapper .copy-code`;
      expect(subject.query(buttonSelector)).to.exist;
      expect(subject.query(buttonSelector)).to.have.text('offers_hub_copy_btn');
    });

    it('with expires time', function () {
      const validitySelector = `${offerSelector} .validity-wrapper .validity`;
      expect(subject.query(validitySelector)).to.exist;
      expect(subject.query(validitySelector)).to.have.text(data.vouchers[0].validity.text);
    });

    it('expires time text has correct color', function () {
      const validitySelector = `${offerSelector} .validity-wrapper .validity`;
      expect(subject.query(validitySelector)).to.not.have.class('red');
      expect(hex(subject.getComputedStyle(`${validitySelector}`).color)).to.equal('#b2b2b2');
    });

    it('doesn\'t render \'conditions\'', function () {
      const conditionsSelector = `${offerSelector} .validity-wrapper .condition`;
      expect(subject.query(conditionsSelector)).to.not.exist;
    });

    it('with action button', function () {
      const buttonSelector = `${offerSelector} .cta-btn`;
      expect(subject.query(buttonSelector)).to.exist;
      expect(subject.query(buttonSelector).textContent.trim())
        .to.equal(data.vouchers[0].template_data.call_to_action.text);
    });

    it('url for button is correct', function () {
      expect(subject.query(`${offerSelector} .cta-btn`)).to.have.attribute('data-url');
      expect(subject.query(`${offerSelector} .cta-btn`).getAttribute('data-url'))
        .to.equal(data.vouchers[0].template_data.call_to_action.url);
    });

    it('footer: doesn\'t render arrow to see more offers', function () {
      const buttonSelector = 'footer button#expand-button';
      expect(subject.query(buttonSelector)).to.not.exist;
    });
  });
});
