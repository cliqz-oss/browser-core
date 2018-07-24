import { clearIntervals, expect } from '../../core/test-helpers';

import Subject from './local-helpers';
import {
  dataGenericTooltip,
  dataExtraTooltip,
  dataExtraTooltip1,
  dataNewOffer,
  dataNewOffer1
} from './fixtures/offers';

describe('Offers Hub UI tests', function () {
  let data;
  let subject;
  const target = 'cliqz-offers-cc';

  afterEach(function () {
    clearIntervals();
  });

  function hex(input) {
    const rgb = input.match(/\d+/g);
    const [r, g, b] = rgb.map(function (el) {
      const c = parseInt(el, 10).toString(16);
      return c.length === 1 ? `0${c}` : c;
    });
    return `#${r}${g}${b}`;
  }

  function offersHubFrameTests() {
    context('renders header and footer', function () {
      context('header part: ', function () {
        it('renders \'MyOffrz\'', function () {
          const offersHubTitleSelector = 'header [data-i18n="offers_hub_title"]';
          expect(subject.query(offersHubTitleSelector)).to.exist;
          expect(subject.query(offersHubTitleSelector).textContent.trim())
            .to.equal('offers_hub_title');
        });

        it('renders \'About\'', function () {
          const aboutSelector = '#about-link';
          expect(subject.query(aboutSelector)).to.exist;
          expect(subject.query(aboutSelector).textContent.trim())
            .to.equal('offers_hub_about_cliqz_offers');
        });

        it('link for \'About\' is correct', function () {
          const aboutSelector = '#about-link';
          expect(subject.query(aboutSelector).hasAttribute('data-url')).to.be.true;
          expect(subject.query(aboutSelector).getAttribute('data-url'))
            .to.equal('https://cliqz.com/myoffrz');
        });
      });

      context('footer part: ', function () {
        it('renders feedback button', function () {
          const buttonSelector = 'footer #feedback-button';
          expect(subject.query(buttonSelector)).to.exist;
          expect(subject.query(buttonSelector)
            .textContent.trim()).to.equal('offers_hub_feedback_title');
        });

        it('renders Cliqz icon', function () {
        });

        it('feedback popup exists but not visible', function () {
          const feedbackContentSelector = 'footer #feedback-content';
          expect(subject.query(feedbackContentSelector)).to.exist;
          expect(subject.getComputedStyle(feedbackContentSelector).display)
            .to.equal('none');
        });
      });
    });
  }

  function noOffersMessageTests() {
    context('renders welcome message', function () {
      it('renders gift icon', function () {
        expect(subject.query('.cqz-no-vouchers-msg img')).to.exist;
        expect(subject.query('.cqz-no-vouchers-msg img').src)
          .to.contain('/images/offers-cc-icon.svg');
      });

      it('renders title', function () {
        const titleSelector = '.cqz-no-vouchers-msg [data-i18n="offers_hub_welcome_title"]';
        expect(subject.query(titleSelector)).to.exist;
      });

      it('renders text', function () {
        const textSelector = '.cqz-no-vouchers-msg [data-i18n="offers_hub_welcome_text"]';
        expect(subject.query(textSelector)).to.exist;
        expect(subject.query(textSelector).textContent.trim())
          .to.equal('offers_hub_welcome_text');
      });
    });
  }

  context('generic tooltip', function () {
    before(function () {
      data = dataGenericTooltip;
      subject = new Subject();
      return subject.load()
        .then(function () {
          return subject.pushData(target, data);
        });
    });

    after(function () {
      subject.unload();
    });

    it('renders tooltip', function () {
      const offerContentSelector = '#cliqz-offers-cc #cqz-offer-cc-content';
      expect(subject.query(offerContentSelector)).to.exist;
      expect(subject.query(offerContentSelector).classList.contains('tooltip')).to.be.true;
    });

    it('with the gift icon', function () {
      const imageSelector = '#cliqz-offers-cc #cqz-offer-cc-content.tooltip img';
      expect(subject.query(imageSelector)).to.exist;
      expect(subject.query(imageSelector).src).to.contain(data.icon);
    });

    it('with the correct text', function () {
      const offerContentSelector = '#cliqz-offers-cc #cqz-offer-cc-content.tooltip';
      expect(subject.query(offerContentSelector).textContent.trim())
        .to.equal(data.headline);
    });

    it('doesn\'t render header and footer', function () {
      expect(subject.query('header')).to.not.exist;
      expect(subject.query('footer')).to.not.exist;
    });
  });

  context('extra tooltip with optional data', function () {
    before(function () {
      data = dataExtraTooltip;
      subject = new Subject();
      return subject.load()
        .then(function () {
          return subject.pushData(target, data);
        });
    });

    after(function () {
      subject.unload();
    });

    it('renders tooltip', function () {
      const offerContentSelector = '#cliqz-offers-cc #cqz-offer-cc-content';
      expect(subject.query(offerContentSelector)).to.exist;
      expect(subject.query(offerContentSelector)).to.have.class('tooltip');
      expect(subject.query('#cqz-offer-cc-content .light')).to.exist;
    });

    it('left border\'s color is correct', function () {
      expect(hex(subject.getComputedStyle('#cqz-offer-cc-content .light')['border-left-color']))
        .to.equal(data.backgroundColor);
    });

    it('renders short logo', function () {
      const logoSelector = '#cqz-offer-cc-content .light .logo.short';
      expect(subject.query(logoSelector)).to.exist;
    });

    it('renders benefit and headline ', function () {
      expect(subject.query('#cqz-offer-cc-content .light>p')
        .textContent.trim()).to.equal(`${data.benefit} ${data.headline}`);
    });

    it('renders labels', function () {
      const exclusiveSelector = '#cqz-offer-cc-content .light .labels .exclusive';
      const bestSelector = '#cqz-offer-cc-content .light .labels .best_offer';
      expect(subject.query(exclusiveSelector)).to.exist;
      expect(subject.query(exclusiveSelector).textContent.trim())
        .to.equal('offers_exclusive');
      expect(subject.query(bestSelector)).to.exist;
      expect(subject.query(bestSelector).textContent.trim())
        .to.equal('offers_best_offer');
    });

    it('doesn\'t render header and footer', function () {
      expect(subject.query('header')).to.not.exist;
      expect(subject.query('footer')).to.not.exist;
    });
  });

  context('extra tooltip without optional data', function () {
    before(function () {
      data = dataExtraTooltip1;
      subject = new Subject();
      return subject.load()
        .then(function () {
          return subject.pushData(target, data);
        });
    });

    after(function () {
      subject.unload();
    });

    it('renders tooltip', function () {
      const offerContentSelector = '#cliqz-offers-cc #cqz-offer-cc-content';
      expect(subject.query(offerContentSelector)).to.exist;
      expect(subject.query(offerContentSelector)).to.have.class('tooltip');
      expect(subject.query('#cqz-offer-cc-content .light')).to.exist;
    });

    it('left border\'s color is correct', function () {
      expect(hex(subject.getComputedStyle('#cqz-offer-cc-content .light')['border-left-color']))
        .to.equal(data.backgroundColor);
    });

    it('renders short logo', function () {
      const logoSelector = '#cqz-offer-cc-content .light .logo.short';
      expect(subject.query(logoSelector)).to.exist;
      expect(subject.getComputedStyle(logoSelector)['background-image'])
        .to.equal(`url("${data.backgroundImage}")`);
    });

    it('renders benefit and headline ', function () {
      expect(subject.query('#cqz-offer-cc-content .light>p')
        .textContent.trim()).to.equal(`${data.benefit} ${data.headline}`);
    });

    it('doesn\'t render labels', function () {
      const exclusiveSelector = '#cqz-offer-cc-content .light .labels .exclusive';
      const bestSelector = '#cqz-offer-cc-content .light .labels .best_offer';
      expect(subject.query(exclusiveSelector)).to.not.exist;
      expect(subject.query(bestSelector)).to.not.exist;
    });

    it('doesn\'t render header and footer', function () {
      expect(subject.query('header')).to.not.exist;
      expect(subject.query('footer')).to.not.exist;
    });
  });

  context('with \'Welcome!\' message', function () {
    before(function () {
      subject = new Subject();
      return subject.load()
        .then(function () {
          return subject.pushData(target, {
            noVoucher: true,
          });
        });
    });

    after(function () {
      subject.unload();
    });

    offersHubFrameTests();
    noOffersMessageTests();
  });

  context('offer with optional data', function () {
    const offerDetailsSelector = '#cqz-vouchers-holder li.voucher-wrapper.active .details';
    before(function () {
      data = dataNewOffer;
      subject = new Subject();
      return subject.load()
        .then(function () {
          return subject.pushData(target, data);
        });
    });

    after(function () {
      subject.unload();
    });

    offersHubFrameTests();

    it('header: renders ad_label', function () {
      const adLabelSelector = 'header p span';
      expect(subject.queryAll(adLabelSelector)[1]).to.exist;
      expect(subject.queryAll(adLabelSelector)[1].textContent.trim()).to.equal('ad_label');
    });

    it('footer: renders arrow to see more offers', function () {
      const buttonSelector = 'footer button#expand-button';
      expect(subject.query(buttonSelector)).to.exist;
    });

    context('preferred offer', function () {
      it('rendered', function () {
        expect(subject.query(offerDetailsSelector)).to.exist;
      });

      it('with labels', function () {
        const exclusiveSelector = `${offerDetailsSelector} .left-labels .exclusive`;
        const bestSelector = `${offerDetailsSelector} .left-labels .best_offer`;
        expect(subject.query(exclusiveSelector)).to.exist;
        expect(subject.query(bestSelector)).to.exist;
        expect(subject.query(exclusiveSelector).textContent.trim())
          .to.equal('offers_exclusive');
        expect(subject.query(bestSelector).textContent.trim())
          .to.equal('offers_best_offer');
      });

      it('with picture', function () {
        const pictureSelector = `${offerDetailsSelector} .picture`;
        expect(subject.query(pictureSelector)).to.exist;
        expect(subject.getComputedStyle(pictureSelector).backgroundImage)
          .to.contain(data.vouchers[0].template_data.picture_url);
      });

      it('with benefit', function () {
        const benefitSelector = `${offerDetailsSelector} .benefit`;
        expect(subject.query(benefitSelector)).to.exist;
        expect(subject.query(benefitSelector).textContent.trim())
          .to.equal(data.vouchers[0].template_data.benefit);
      });

      it('with headline', function () {
        const headlineSelector = `${offerDetailsSelector} .headline`;
        expect(subject.query(headlineSelector)).to.exist;
        expect(subject.query(headlineSelector).textContent.trim())
          .to.equal(data.vouchers[0].template_data.headline);
      });

      it('headline has correct color', function () {
        const headlineSelector = `${offerDetailsSelector} .headline`;
        expect(hex(subject.query(headlineSelector).style.color))
          .to.equal(data.vouchers[0].backgroundColor);
      });

      it('with description', function () {
        const descriptionSelector = `${offerDetailsSelector} .description`;
        expect(subject.query(descriptionSelector)).to.exist;
        expect(subject.query(descriptionSelector).textContent.trim())
          .to.equal(data.vouchers[0].template_data.desc);
      });

      it('with promocode', function () {
        const promocodeSelector = `${offerDetailsSelector} .promocode-wrapper .code`;
        expect(subject.query(promocodeSelector)).to.exist;
        expect(subject.query(promocodeSelector).value)
          .to.equal(data.vouchers[0].template_data.code);
      });

      it('with \'copy code\' button', function () {
        const buttonSelector = `${offerDetailsSelector} .promocode-wrapper .copy-code`;
        expect(subject.query(buttonSelector)).to.exist;
        expect(subject.query(buttonSelector).textContent.trim())
          .to.equal('offers_hub_copy_btn');
      });

      it('with expires time', function () {
        const validitySelector = `${offerDetailsSelector} .validity-wrapper .validity`;
        expect(subject.query(validitySelector)).to.exist;
        expect(subject.query(validitySelector).textContent.trim())
          .to.equal(data.vouchers[0].validity.text);
      });

      it('expires time text has correct color', function () {
        const validitySelector = `${offerDetailsSelector} .validity-wrapper .validity`;
        expect(subject.query(validitySelector)).to.have.class('red');
        expect(hex(subject.getComputedStyle(`${validitySelector}.red`).color)).to.equal('#ff0000');
      });

      it('with \'conditions\'', function () {
        const conditionsSelector = `${offerDetailsSelector} .validity-wrapper .condition`;
        expect(subject.query(conditionsSelector)).to.exist;
        expect(subject.query(conditionsSelector).textContent.trim())
          .to.equal('offers_conditions');
      });

      it('with button for \'conditions\'', function () {
        const buttonSelector = `${offerDetailsSelector} .validity-wrapper .condition button`;
        expect(subject.query(buttonSelector)).to.exist;
      });

      it('with action button', function () {
        const buttonSelector = `${offerDetailsSelector} .cta-btn`;
        expect(subject.query(buttonSelector)).to.exist;
        expect(subject.query(buttonSelector).textContent.trim())
          .to.equal(data.vouchers[0].template_data.call_to_action.text);
      });

      it('url for button is correct', function () {
        expect(subject.query(`${offerDetailsSelector} .cta-btn`).hasAttribute('data-url'))
          .to.be.true;
        expect(subject.query(`${offerDetailsSelector} .cta-btn`).getAttribute('data-url'))
          .to.equal(data.vouchers[0].template_data.call_to_action.url);
      });
    });
  });

  context('offer without optional data', function () {
    const offerDetailsSelector = '#cqz-vouchers-holder li.voucher-wrapper.active .details';
    before(function () {
      data = dataNewOffer1;
      subject = new Subject();
      return subject.load()
        .then(function () {
          return subject.pushData(target, data);
        });
    });

    after(function () {
      subject.unload();
    });

    offersHubFrameTests();

    it('header: renders ad_label', function () {
      const adLabelSelector = 'header p span';
      expect(subject.queryAll(adLabelSelector)[1]).to.exist;
      expect(subject.queryAll(adLabelSelector)[1].textContent.trim()).to.equal('ad_label');
    });

    it('footer: doesn\'t render arrow to see more offers', function () {
      const buttonSelector = 'footer button#expand-button';
      expect(subject.query(buttonSelector)).to.not.exist;
    });

    context('preferred offer', function () {
      it('rendered', function () {
        expect(subject.query(offerDetailsSelector)).to.exist;
      });

      it('doesn\'t render labels', function () {
        const exclusiveSelector = `${offerDetailsSelector} .left-labels .exclusive`;
        const bestSelector = `${offerDetailsSelector} .left-labels .best_offer`;
        expect(subject.query(exclusiveSelector)).to.not.exist;
        expect(subject.query(bestSelector)).to.not.exist;
      });

      it('doesn\t render picture', function () {
        const pictureSelector = '.picture';
        expect(subject.query(pictureSelector)).to.not.exist;
      });

      it('with benefit', function () {
        const benefitSelector = `${offerDetailsSelector} .benefit`;
        expect(subject.query(benefitSelector)).to.exist;
        expect(subject.query(benefitSelector).textContent.trim())
          .to.equal(data.vouchers[0].template_data.benefit);
      });

      it('with headline', function () {
        const headlineSelector = `${offerDetailsSelector} .headline`;
        expect(subject.query(headlineSelector)).to.exist;
        expect(subject.query(headlineSelector).textContent.trim())
          .to.equal(data.vouchers[0].template_data.title);
      });

      it('headline has correct color', function () {
        const headlineSelector = `${offerDetailsSelector} .headline`;
        expect(hex(subject.query(headlineSelector).style.color))
          .to.equal(data.vouchers[0].backgroundColor);
      });

      it('with description', function () {
        const descriptionSelector = `${offerDetailsSelector} .description`;
        expect(subject.query(descriptionSelector)).to.exist;
        expect(subject.query(descriptionSelector).textContent.trim())
          .to.equal(data.vouchers[0].template_data.desc);
      });

      it('with promocode', function () {
        const promocodeSelector = `${offerDetailsSelector} .promocode-wrapper .code`;
        expect(subject.query(promocodeSelector)).to.exist;
        expect(subject.query(promocodeSelector).value)
          .to.equal(data.vouchers[0].template_data.code);
      });

      it('with \'copy code\' button', function () {
        const buttonSelector = `${offerDetailsSelector} .promocode-wrapper .copy-code`;
        expect(subject.query(buttonSelector)).to.exist;
        expect(subject.query(buttonSelector).textContent.trim())
          .to.equal('offers_hub_copy_btn');
      });

      it('with expires time', function () {
        const validitySelector = `${offerDetailsSelector} .validity-wrapper .validity`;
        expect(subject.query(validitySelector)).to.exist;
        expect(subject.query(validitySelector).textContent.trim())
          .to.equal(data.vouchers[0].validity.text);
      });

      it('expires time text has correct color', function () {
        const validitySelector = `${offerDetailsSelector} .validity-wrapper .validity`;
        expect(subject.query(validitySelector)).to.not.have.class('red');
        expect(hex(subject.getComputedStyle(`${validitySelector}`).color)).to.equal('#b2b2b2');
      });

      it('doesn\'t render \'conditions\'', function () {
        const conditionsSelector = `${offerDetailsSelector} .validity-wrapper .condition`;
        expect(subject.query(conditionsSelector)).to.not.exist;
      });

      it('with action button', function () {
        const buttonSelector = `${offerDetailsSelector} .cta-btn`;
        expect(subject.query(buttonSelector)).to.exist;
        expect(subject.query(buttonSelector).textContent.trim())
          .to.equal(data.vouchers[0].template_data.call_to_action.text);
      });

      it('url for button is correct', function () {
        expect(subject.query(`${offerDetailsSelector} .cta-btn`).hasAttribute('data-url'))
          .to.be.true;
        expect(subject.query(`${offerDetailsSelector} .cta-btn`).getAttribute('data-url'))
          .to.equal(data.vouchers[0].template_data.call_to_action.url);
      });
    });
  });
});
