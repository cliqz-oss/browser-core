import {
  Subject,
} from '../../core/test-helpers-freshtab';
import {
  expect,
} from '../../core/test-helpers';
import fixtureData from './fixtures/full-long-logo';
import config from '../../../core/config';

function withDataUrl(fixture) {
  let s = JSON.stringify(fixture);
  s = s.replace('logo_url', 'logo_dataurl');
  s = s.replace('picture_url', 'picture_dataurl');
  return JSON.parse(s);
}
const data = withDataUrl(fixtureData);

describe('Promo bar', function () {
  let subject;
  const target = 'cqz-browser-panel-re';
  const promoContainerSelector = '#cqz-browser-panel-re';
  const promoCodeContainerSelector = '.code-container';
  const promoBodySelector = '.promo-container';
  let $promoContainer;
  let $promoCodeContainer;
  let $promoBody;

  const sizes = {
    450: {
      hasHeadline: false,
      hasFlags: false,
      hasDescription: false,
      hasConditionHeader: false,
      hasPicture: false
    },
    600: {
      hasHeadline: true,
      hasFlags: false,
      hasDescription: false,
      hasConditionHeader: false,
      hasPicture: false
    },
    700: {
      hasHeadline: true,
      hasFlags: true,
      hasDescription: false,
      hasConditionHeader: false,
      hasPicture: false
    },
    900: {
      hasHeadline: true,
      hasFlags: true,
      hasDescription: true,
      hasConditionHeader: false,
      hasPicture: false
    },
    1000: {
      hasHeadline: true,
      hasFlags: true,
      hasDescription: true,
      hasConditionHeader: false,
      hasPicture: true
    },
    1700: {
      hasHeadline: true,
      hasFlags: true,
      hasDescription: true,
      hasConditionHeader: true,
      hasPicture: true
    }
  };

  Object.keys(sizes).forEach(function (frameWidth) {
    context(`rendered in a window ${frameWidth}px wide`, function () {
      before(async function () {
        subject = new Subject();
        const path = `/${config.testsBasePath}/browser-panel/index.html`;
        await subject.load({
          buildUrl: path,
          iframeWidth: frameWidth
        });
        await subject.pushData(target, data, 'render_template');
        $promoContainer = subject.query(promoContainerSelector);
        $promoCodeContainer = $promoContainer.querySelector(promoCodeContainerSelector);
        $promoBody = $promoContainer.querySelector(promoBodySelector);
      });

      after(function () {
        subject.unload();
      });

      describe('renders the main promo bar container', function () {
        it('successfully', function () {
          expect($promoContainer).to.exist;
          expect(subject.getComputedStyle($promoContainer).display).to.not.equal('none');
        });

        it('only once', function () {
          const promoContainerAmount = subject.queryAll(promoContainerSelector).length;
          expect(promoContainerAmount).to.equal(1);
        });

        it('with an existing code container', function () {
          expect($promoCodeContainer).to.exist;
          expect(subject.getComputedStyle($promoCodeContainer).display).to.not.equal('none');
        });

        it('with an existing close button', function () {
          const promoCloseBtnSelector = '.close';
          const $promoCloseBtn = $promoContainer.querySelector(promoCloseBtnSelector);

          expect($promoCloseBtn).to.exist;
          expect(subject.getComputedStyle($promoCloseBtn).display).to.not.equal('none');
        });

        it('with an existing promo bar body', function () {
          expect($promoBody).to.exist;
          expect(subject.getComputedStyle($promoBody).display).to.not.equal('none');
        });
      });

      context('the code container', function () {
        it('has an existing and correct code', function () {
          const promoCodeSelector = '.code';
          const $promoCode = $promoCodeContainer.querySelector(promoCodeSelector);

          expect($promoCode).to.exist;
          expect(subject.getComputedStyle($promoCode).display).to.not.equal('none');
          expect($promoCode).to.have.text(data.template_data.code);
        });

        it('has an existing divider', function () {
          const dividerSelector = '.divider';
          const $divider = $promoCodeContainer.querySelector(dividerSelector);

          expect($divider).to.exist;
          expect(subject.getComputedStyle($divider).display).to.not.equal('none');
        });

        it('has an existing and visible text to copy the code', function () {
          const copyCodeSelector = '.code-copy';
          const $copyCode = $promoCodeContainer.querySelector(copyCodeSelector);

          expect($copyCode).to.exist;
          expect(subject.getComputedStyle($copyCode).display).to.not.equal('none');
        });

        it('has an existing and not visible text confirming the copy', function () {
          const copiedCodeSelector = '.code-copied';
          const $copiedCode = $promoCodeContainer.querySelector(copiedCodeSelector);

          expect($copiedCode).to.exist;
          expect(subject.getComputedStyle($copiedCode).display).to.equal('none');
        });
      });

      context('the promo bar body', function () {
        const flagsAreaSelector = '.special-flags';
        const flagSelector = '.vertical-txt';
        let $flagsArea;
        let $flags;

        before(function () {
          $flagsArea = $promoBody.querySelector(flagsAreaSelector);
          $flags = $flagsArea.querySelectorAll(flagSelector);
        });

        it(sizes[frameWidth].hasFlags
          ? 'has an existing flags area'
          : 'does not have a visible flags area', function () {
          expect($flagsArea).to.exist;
          if (sizes[frameWidth].hasFlags) {
            expect(subject.getComputedStyle($flagsArea).display).to.not.equal('none');
          } else {
            expect(subject.getComputedStyle($flagsArea).display).to.equal('none');
          }
        });

        if (sizes[frameWidth].hasFlags) {
          it('has a flags area with correct amount of flags', function () {
            expect($flags.length).to.equal(data.template_data.labels.length);
          });

          it('has a flags area with correct flags', function () {
            expect($flags.length).to.be.above(0);
            [...$flags].forEach(function (flag, i) {
              expect(flag).to.contain.text(data.template_data.labels[i]);
            });
          });
        }

        it('has an existing and correct logo', function () {
          const logoSelector = '.logo img';
          const $logo = $promoBody.querySelector(logoSelector);

          expect($logo).to.exist;
          expect(subject.getComputedStyle($logo).display).to.not.equal('none');
          expect($logo.src).to.contain(data.template_data.logo_dataurl.slice(1));
          expect($logo.getAttribute('data-openurl')).to.equal(data.template_data.call_to_action.url);
        });

        it(sizes[frameWidth].hasPicture
          ? 'has an existing and correct picture'
          : 'does not have a visible picture', function () {
          const pictureContainerSelector = '.picture';
          const $pictureContainer = $promoBody.querySelector(pictureContainerSelector);
          const pictureSelector = '.picture img';
          const $picture = $promoBody.querySelector(pictureSelector);

          expect($pictureContainer).to.exist;
          if (sizes[frameWidth].hasPicture) {
            expect(subject.getComputedStyle($pictureContainer).display).to.not.equal('none');
            expect($picture.src).to.equal(data.template_data.picture_dataurl);
            expect($picture.getAttribute('data-openurl')).to.equal(data.template_data.call_to_action.url);
          } else {
            expect(subject.getComputedStyle($pictureContainer).display).to.equal('none');
          }
        });

        it('has an existing and correct benefit value', function () {
          const benefitSelector = '.benefit';
          const $benefit = $promoBody.querySelector(benefitSelector);

          expect($benefit).to.exist;
          expect(subject.getComputedStyle($benefit).display).to.not.equal('none');
          expect($benefit).to.contain.text(data.template_data.benefit);
          expect($benefit.getAttribute('data-openurl')).to.equal(data.template_data.call_to_action.url);
        });

        it(sizes[frameWidth].hasHeadline
          ? 'has an existing and correct headline'
          : 'does not have a visible headline', function () {
          const headlineSelector = '.headline-container .headline';
          const $headline = $promoBody.querySelector(headlineSelector);

          expect($headline).to.exist;
          if (sizes[frameWidth].hasHeadline) {
            expect(subject.getComputedStyle($headline).display).to.not.equal('none');
            expect($headline).to.contain.text(data.template_data.headline);
            expect($headline.getAttribute('data-openurl')).to.equal(data.template_data.call_to_action.url);
          } else {
            expect(subject.getComputedStyle($headline).display).to.not.equal('none');
          }
        });

        it(sizes[frameWidth].hasDescription
          ? 'has an existing and correct description'
          : 'does not have a visible description', function () {
          const descriptionContainerSelector = '.description';
          const $descriptionContainer = $promoBody.querySelector(descriptionContainerSelector);
          const descriptionSelector = '.description .desc-content';
          const $description = $promoBody.querySelector(descriptionSelector);

          expect($descriptionContainer).to.exist;
          if (sizes[frameWidth].hasDescription) {
            expect(subject.getComputedStyle($descriptionContainer).display).to.not.equal('none');
            expect($description).to.contain.text(data.template_data.desc);
            expect($description.getAttribute('data-openurl')).to.equal(data.template_data.call_to_action.url);
          } else {
            expect(subject.getComputedStyle($descriptionContainer).display).to.equal('none');
          }
        });

        it('has an existing and correct CTA button', function () {
          const ctaBtnSelector = '.call-to-action a.btn';
          const $ctaBtn = $promoBody.querySelector(ctaBtnSelector);

          expect($ctaBtn).to.exist;
          expect(subject.getComputedStyle($ctaBtn).display).to.not.equal('none');
          expect($ctaBtn).to.contain.text(data.template_data.call_to_action.text);
          expect($ctaBtn.getAttribute('data-openurl')).to.equal(data.template_data.call_to_action.url);
        });

        it('has an existing and correct tooltip icon', function () {
          const tooltipIconSelector = '.call-to-action .info-icon';
          const $tooltipIcon = $promoBody.querySelector(tooltipIconSelector);

          expect($tooltipIcon).to.exist;
          expect(subject.getComputedStyle($tooltipIcon).display).to.not.equal('none');
        });

        it(sizes[frameWidth].hasConditionHeader
          ? 'has an existing and correct conditions header'
          : 'does not have a visible conditions header', function () {
          const conditionsHeaderSelector = '.call-to-action .conditions';
          const $conditionsHeader = $promoBody.querySelector(conditionsHeaderSelector);

          expect($conditionsHeader).to.exist;
          if (sizes[frameWidth].hasConditionHeader) {
            expect(subject.getComputedStyle($conditionsHeader).display).to.not.equal('none');
            expect($conditionsHeader).to.contain.text('offers_conditions');
          } else {
            expect(subject.getComputedStyle($conditionsHeader).display).to.equal('none');
          }
        });

        it('has an existing and correct ad text', function () {
          const adSelector = '.anzeige .vertical-txt';
          const $ad = subject.query(promoContainerSelector).querySelector(adSelector);

          expect($ad).to.exist;
          expect(subject.getComputedStyle($ad).display).to.not.equal('none');
          expect($ad).to.contain.text('offers_ad');
        });

        it('does not have an existing conditions tooltip container', function () {
          const conditionsContainerSelector = '.tooltipster-base';
          const $conditionsContainer = subject.query(conditionsContainerSelector);

          expect($conditionsContainer).to.not.exist;
        });
      });
    });
  });
});
