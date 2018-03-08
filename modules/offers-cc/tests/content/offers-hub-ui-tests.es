/* eslint func-names: ['error', 'never'] */
/* eslint prefer-arrow-callback: 'off' */
/* eslint no-unused-expressions: 'off' */
import chai from 'chai';
import {
  clearIntervals,
  Subject
} from './helpers';

import { dataGenericTooltip, dataExtraTooltip, dataNewOffer } from './fixtures/offers';

describe('Offers Hub UI tests', function () {
  let data;
  const expect = chai.expect;
  let subject;

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
    context('renders reward box\'s header and footer elements', function () {
      context('header part: ', function () {
        it('renders \'MyOffrz\'', function () {
          const offersHubTitleSelector = 'header [data-i18n="offers-hub-title"]';
          expect(subject.query(offersHubTitleSelector)).to.exist;
          expect(subject.query(offersHubTitleSelector).textContent.trim())
            .to.equal('offers-hub-title');
        });

        it('renders \'About\'', function () {
          const aboutSelector = '#about-link';
          expect(subject.query(aboutSelector)).to.exist;
          expect(subject.query(aboutSelector).textContent.trim())
            .to.equal('offers-hub-about-cliqz-offers');
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
          chai.expect(subject.query(buttonSelector)).to.exist;
          chai.expect(subject.query(buttonSelector)
            .textContent.trim()).to.equal('offers-hub-feedback-title');
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
        chai.expect(subject.query('.cqz-no-vouchers-msg img')).to.exist;
        chai.expect(subject.query('.cqz-no-vouchers-msg img').src)
          .to.contain('/images/offers-cc-icon.svg');
      });


      it('renders title', function () {
        const titleSelector = '.cqz-no-vouchers-msg [data-i18n="offers-hub-welcome-title"]';
        chai.expect(subject.query(titleSelector)).to.exist;
      });

      it('link is correct', function () {
        const moreInfoSelector = 'footer .cqz-power-by';
        chai.expect(subject.query(moreInfoSelector).hasAttribute('data-open-url')).to.be.true;
        chai.expect(subject.query(moreInfoSelector).getAttribute('data-open-url')).to.equal('https://cliqz.com/myoffrz');
      });

      it('renders text', function () {
        const textSelector = '.cqz-no-vouchers-msg [data-i18n="offers-hub-welcome-text"]';
        chai.expect(subject.query(textSelector)).to.exist;
        chai.expect(subject.query(textSelector).textContent.trim())
          .to.equal('offers-hub-welcome-text');
      });
    });
  }

  it('loads', function () {
    expect(true).to.eql(true);
  });

  context('with generic tooltip', function () {
    before(() => {
      data = dataGenericTooltip;
      subject = new Subject();
      return subject.load().then(function () {
        return subject.pushData(data);
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

  context('with extra tooltip', function () {
    before(() => {
      data = dataExtraTooltip;
      subject = new Subject();
      return subject.load().then(function () {
        return subject.pushData(data);
      });
    });

    after(function () {
      subject.unload();
    });

    it('renders tooltip', function () {
      const offerContentSelector = '#cliqz-offers-cc #cqz-offer-cc-content';
      expect(subject.query(offerContentSelector)).to.exist;
      expect(subject.query(offerContentSelector).classList.contains('tooltip')).to.be.true;
      expect(subject.query('#cqz-offer-cc-content .light')).to.exist;
    });

    it('url for button is correct', function () {
      chai.expect(subject.query(`${selector} .cqz-btn`).hasAttribute('data-open-url')).to.be.true;
      chai.expect(subject.query(`${selector} .cqz-btn`).getAttribute('data-open-url')).to.equal(element.template_data.call_to_action.url);
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

    it('renders labels', function () {
      const exclusiveSelector = '#cqz-offer-cc-content .light .labels .exclusive';
      const bestSelector = '#cqz-offer-cc-content .light .labels .best-offer';
      expect(subject.query(exclusiveSelector)).to.exist;
      expect(subject.query(exclusiveSelector).textContent.trim())
        .to.equal('offers-exclusive');
      expect(subject.query(bestSelector)).to.exist;
      expect(subject.query(bestSelector).textContent.trim())
        .to.equal('offers-best_offer');
    });

    it('doesn\'t render header and footer', function () {
      expect(subject.query('header')).to.not.exist;
      expect(subject.query('footer')).to.not.exist;
    });
  });

  context('with \'Welcome!\' message', function () {
    before(() => {
      subject = new Subject();
      return subject.load().then(function () {
        return subject.pushData({
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

  context('with four offers', function () {
    const offerDetailsSelector = '#cqz-vouchers-holder li.voucher-wrapper.active .details';
    before(() => {
      data = dataNewOffer;
      subject = new Subject();
      return subject.load().then(function () {
        return subject.pushData(data);
      });
    });

    after(function () {
      subject.unload();
    });

    offersHubFrameTests();

    context('preferred offer', function () {
      it('rendered', function () {
        expect(subject.query(offerDetailsSelector)).to.exist;
      });

      it('with labels', function () {
        const exclusiveSelector = `${offerDetailsSelector} .left-labels .exclusive`;
        const bestSelector = `${offerDetailsSelector} .left-labels .best-offer`;
        expect(subject.query(exclusiveSelector)).to.exist;
        expect(subject.query(bestSelector)).to.exist;
        expect(subject.query(exclusiveSelector).textContent.trim())
          .to.equal('offers-exclusive');
        expect(subject.query(bestSelector).textContent.trim())
          .to.equal('offers-best_offer');
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
          .to.equal('offers-hub-copy-btn');
      });

      it('with expires time', function () {
        const validitySelector = `${offerDetailsSelector} .validity-wrapper .validity`;
        expect(subject.query(validitySelector)).to.exist;
        expect(subject.query(validitySelector).textContent.trim())
          .to.equal(data.vouchers[0].validity.text);
      });

      it('expires time text has correct color', function () {
        const validitySelector = `${offerDetailsSelector} .validity-wrapper .validity`;
        expect(subject.query(validitySelector).classList.contains('red')).to.be.true;
        expect(hex(subject.getComputedStyle(`${validitySelector}.red`).color)).to.equal('#ff0000');
      });

      it('with \'conditions\'', function () {
        const conditionsSelector = `${offerDetailsSelector} .validity-wrapper .condition`;
        expect(subject.query(conditionsSelector)).to.exist;
        expect(subject.query(conditionsSelector).textContent.trim())
          .to.equal('offers-conditions');
      });

      it('with button for \'conditions\'', function () {
        const buttonSelector = `${offerDetailsSelector} .validity-wrapper .condition button`;
        expect(subject.query(buttonSelector)).to.exist;
      });

      it('conditions\' text exist but not visible', function () {
        const conditionTextSelector = `${offerDetailsSelector} .validity-wrapper .condition-wrapper`;
        expect(subject.query(conditionTextSelector)).to.exist;
        expect(subject.getComputedStyle(conditionTextSelector).display).to.equal('none');
        expect(subject.query(conditionTextSelector).textContent.trim())
          .to.equal(data.vouchers[0].template_data.conditions);
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
