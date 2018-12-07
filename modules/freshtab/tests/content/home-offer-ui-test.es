import {
  clone,
  expect,
} from '../../core/test-helpers';
import {
  defaultConfig,
  mockOfferMessage,
  Subject,
} from '../../core/test-helpers-freshtab';

describe('Freshtab offer notification UI', function () {
  let subject;
  let config;

  before(function () {
    subject = new Subject();
    config = clone(defaultConfig);
    config.response.componentsState.news.visible = true;
    config.response.messages = mockOfferMessage;
    subject.respondsWith(config);
    subject.respondsWithEmptyStats();

    subject.respondsWith({
      module: 'offers-v2',
      action: 'processRealEstateMessages',
      response: {}
    });

    subject.respondsWith({
      module: 'core',
      action: 'sendTelemetry',
      response: ''
    });

    subject.respondsWith({
      module: 'freshtab',
      action: 'getSpeedDials',
      response: {
        history: [],
        custom: []
      }
    });

    subject.respondsWith({
      module: 'freshtab',
      action: 'getNews',
      response: {
        version: 0,
        news: []
      }
    });
  });


  context('when one offer message is available', function () {
    const offerSelector = '.offer-unit';
    const specialFlagsSelector = '.special-flags';
    const benefitSelector = '.benefit';
    const headlineSelector = '.headline';
    const descriptionSelector = '.offer-description';
    const codeSelector = '.code';
    const copyCodeSelector = '.copy-code';
    const ctaSelector = '.footer-cta.small-font';
    const logoSelector = '.logo .normal';
    const optionSelector = '.options';


    before(function () {
      return subject.load();
    });

    after(function () {
      subject.unload();
    });

    it('the offer is visible', function () {
      expect(subject.query(offerSelector)).to.exist;
    });

    it('the offer renders with correct special flags ', function () {
      const bestOfferSelector = '.best_offer';
      const exclusiveOfferSelector = '.exclusive';
      expect(subject.query(`${offerSelector} ${specialFlagsSelector} ${bestOfferSelector}`)).to.exist;
      expect(subject.query(`${offerSelector} ${specialFlagsSelector} ${bestOfferSelector}`))
        .to.have.text('offers_best_offer');
      expect(subject.query(`${offerSelector} ${specialFlagsSelector} ${exclusiveOfferSelector}`)).to.exist;
      expect(subject.query(`${offerSelector} ${specialFlagsSelector} ${exclusiveOfferSelector}`))
        .to.have.text('offers_exclusive');
    });

    it('the offer renders with correct benefit', function () {
      expect(subject.query(`${offerSelector} ${benefitSelector}`)).to.exist;
      expect(subject.query(`${offerSelector} ${benefitSelector}`))
        .to.contain.text(mockOfferMessage[123].offer_info.ui_info.template_data.benefit);
    });

    it('the offer renders with correct headline', function () {
      expect(subject.query(`${offerSelector} ${headlineSelector}`)).to.exist;
      expect(subject.query(`${offerSelector} ${headlineSelector}`))
        .to.contain.text(mockOfferMessage[123].offer_info.ui_info.template_data.headline);
    });

    it('the offer renders with correct description', function () {
      expect(subject.query(`${offerSelector} ${descriptionSelector}`)).to.exist;
      expect(subject.query(`${offerSelector} ${descriptionSelector}`))
        .to.have.text(mockOfferMessage[123].offer_info.ui_info.template_data.desc);
    });

    it('the offer renders with correct code', function () {
      expect(subject.query(`${offerSelector} ${codeSelector}`)).to.exist;
      expect(subject.query(`${offerSelector} ${codeSelector}`))
        .to.contain.text(mockOfferMessage[123].offer_info.ui_info.template_data.code);
    });

    it('the offer renders with copy code button', function () {
      expect(subject.query(`${offerSelector} ${copyCodeSelector}`)).to.exist;
      expect(subject.query(`${offerSelector} ${copyCodeSelector}`))
        .to.have.text('offers_copy_code');
    });

    it('the offer renders with CTA button', function () {
      expect(subject.query(`${offerSelector} ${ctaSelector}`)).to.exist;
      expect(subject.query(`${offerSelector} ${ctaSelector}`))
        .to.have.text(mockOfferMessage[123].offer_info.ui_info.template_data.call_to_action.text);
      expect(subject.query(`${offerSelector} ${ctaSelector}`).href).to.exist;
      expect(subject.query(`${offerSelector} ${ctaSelector}`).href)
        .to.contain(mockOfferMessage[123].offer_info.ui_info.template_data.call_to_action.url);
    });

    it('the offer renders with logo', function () {
      expect(subject.query(`${offerSelector} ${logoSelector} img`)).to.exist;
      expect(subject.query(`${offerSelector} ${logoSelector} img`).getAttribute('src'))
        .to.equal('https://cdn.cliqz.com/extension/offers/test/resources/drivenow-week/drivenow-week-logo-normal-1524572543.png');
    });

    it('the offer renders with options button', function () {
      expect(subject.query(`${offerSelector} ${optionSelector}`)).to.exist;
    });
  });

  context('renders elements with different screen size', function () {
    const offerSelector = '.offer-unit';
    const conditionsIconSelector = '.info-icon';
    const conditionsLabelSelector = '.tooltip.condition-label';
    const expiresLogoSelector = '.expires.day-icon';
    [900, 1600].forEach(function (width) {
      describe(`when offer renders with screen size ${width}`, function () {
        before(function () {
          return subject.load({ iframeWidth: width });
        });

        it('offer renders with condition icon', function () {
          expect(subject.query(`${offerSelector} ${conditionsIconSelector}`)).to.exist;
          expect(subject.query(`${offerSelector} ${conditionsIconSelector}`).getAttribute('src')).to.equal('./images/info-icon-hover.svg');
        });
        if (width === 900) {
          it('offer renders without condition label', function () {
            expect(subject.getComputedStyle(subject.query(`${offerSelector} ${conditionsLabelSelector}`)).display).to.equal('none');
          });
        } else {
          it('offer renders with condition label', function () {
            expect(subject.query(`${offerSelector} ${conditionsLabelSelector}`)).to.exist;
            expect(subject.query(`${offerSelector} ${conditionsLabelSelector}`))
              .to.have.text('freshtab_app_conditions');
          });
        }
        it('offer renders with expires day icon', function () {
          expect(subject.query(`${offerSelector} ${expiresLogoSelector}`)).to.exist;
          expect(getComputedStyle(subject.query(`${offerSelector} ${expiresLogoSelector}`)).backgroundImage)
            .to.contain('expire-icon12.svg');
        });
        if (width === 900) {
          it('offer renders without expires day date', function () {
            expect(subject.getComputedStyle(subject.query(`${offerSelector} ${expiresLogoSelector}`))['text-indent']).to.contain('-9999');
          });
        } else {
          it('offer renders with expires day date', function () {
            expect(subject.getComputedStyle(subject.query(`${offerSelector} ${expiresLogoSelector}`))['text-indent']).to.contain('0');
            expect(subject.query(`${offerSelector} ${expiresLogoSelector}`))
              .to.contain.text(mockOfferMessage[123].validity.text);
          });
        }
      });
    });
  });
});
