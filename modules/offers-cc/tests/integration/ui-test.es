import { isWebExtension } from '../../../core/platform';
import {
  app,
  CliqzEvents,
  expect,
  getLocalisedString,
  newTab,
  press,
  testServer,
  waitFor,
  win,
} from '../../../tests/core/integration/helpers';
import {
  mockOffersBackend,
  getApiOffersMock,
  triggerKeyword,
  getPage,
} from '../../../tests/core/integration/offers-helpers';

const offers = app.modules['offers-v2'];

const apiOffersMock = JSON.parse(getApiOffersMock({ dest: 'offers-cc' }))[0];

const getBlueNotificationPopup = () => win.document.querySelector('#offers-cc-browser-action-iframe').contentWindow.document;

export default function () {
  if (isWebExtension) { return; }
  xdescribe('offers-cc offers UI', function () {
    beforeEach(async function () {
      await mockOffersBackend({ dest: 'offers-cc' });

      // Simulate location change, to trigger offers' expression evaluation.
      CliqzEvents.pub('content:location-change', {
        url: 'https://fake.url.com',
        windowTreeInformation: {
          tabId: 0,
        },
      });

      await waitFor(() => testServer.hasHit('/api/v1/categories'));
      await waitFor(() => testServer.hasHit('/api/v1/loadsubtriggers'));
    });

    afterEach(function () {
      offers.background.unload();
    });

    context('triggering an offer', function () {
      const tooltipSelector = '#cliqz-offers-cc #cqz-offer-cc-content';

      beforeEach(async function () {
        await newTab(getPage(`landing?q=${triggerKeyword}`));
        await waitFor(() => testServer.hasHit('/api/v1/offers'));

        await waitFor(() =>
          expect(getBlueNotificationPopup().querySelector(tooltipSelector).classList.contains('tooltip')).to.be.true);
      });

      it('shows a blue notification popup with correct text', function () {
        expect(getBlueNotificationPopup().querySelector(tooltipSelector))
          .to.contain.text(getLocalisedString('offers_hub_tooltip_new_offer'));
      });

      context('clicking on the blue notification', function () {
        beforeEach(function () {
          getBlueNotificationPopup().querySelector(tooltipSelector).click();
        });

        afterEach(async function () {
          press({
            key: 'Escape'
          });
          await waitFor(() =>
            expect(win.document.querySelector('#offers-cc-browser-action-iframe')).to.not.exist);
        });

        it('closes the blue notification', async function () {
          await waitFor(
            () =>
              expect(getBlueNotificationPopup().querySelector(tooltipSelector).classList.contains('tooltip'))
                .to.be.false
          );
        });

        it('shows the offer with correct UI elements', async function () {
          const labelSelector = '.left-labels';
          const exclusiveLabelSelector = '.exclusive';
          const bestLabelSelector = '.best_offer';
          const settingsButtonSelector = '.setting';
          const benefitSelector = '.benefit.cta-element';
          const headlineSelector = '.headline.cta-element';
          const descriptionSelector = '.description.cta-element';
          const codeValueSelector = '.code.ellipsis';
          const copyCodeSelector = '.copy-code';
          const validitySelector = '.validity';
          const conditionSelector = '.condition';
          const ctaButtonSelector = '.cta-btn';
          const feedbackButtonSelector = 'li.feedback';
          const giftIconSelector = '.gift_icon';

          const $offer = win.document
            .querySelector('#offers-cc-browser-action-iframe').contentWindow.document
            .querySelector('#cliqz-offers-cc');

          await waitFor(() => expect($offer).to.exist);
          await waitFor(() => expect($offer.querySelector(`${labelSelector} ${exclusiveLabelSelector}`), 'Exclusive label', 1000).to.exist);
          expect($offer.querySelector(`${labelSelector} ${exclusiveLabelSelector}`))
            .to.have.text(getLocalisedString('offers_exclusive'));

          const $bestLabel = $offer.querySelector(`${labelSelector} ${bestLabelSelector}`);
          const $settingsButton = $offer.querySelector(settingsButtonSelector);
          const $benefit = $offer.querySelector(benefitSelector);
          const $headline = $offer.querySelector(headlineSelector);
          const $description = $offer.querySelector(descriptionSelector);
          const $codeValue = $offer.querySelector(codeValueSelector);
          const $copyCode = $offer.querySelector(copyCodeSelector);
          const $validity = $offer.querySelector(validitySelector);
          const $condition = $offer.querySelector(conditionSelector);
          const $ctaButton = $offer.querySelector(ctaButtonSelector);
          const $feedbackButton = $offer.querySelector(feedbackButtonSelector);
          const $giftIcon = $offer.querySelector(giftIconSelector);


          expect($bestLabel, 'Best offer label').to.exist;
          expect($bestLabel).to.have.text(getLocalisedString('offers_best_offer'));

          expect($settingsButton, 'Settings button').to.exist;

          expect($benefit, 'Benefit').to.exist;
          expect($benefit)
            .to.have.attribute('data-url', apiOffersMock.ui_info.template_data.call_to_action.url);
          expect($benefit.querySelector('.benefit-txt')).to.contain.text(apiOffersMock.ui_info.template_data.benefit);

          expect($headline, 'Headline').to.exist;
          expect($headline)
            .to.have.attribute('data-url', apiOffersMock.ui_info.template_data.call_to_action.url);
          expect($headline).to.contain.text(apiOffersMock.ui_info.template_data.headline);

          expect($description, 'Description').to.exist;
          expect($description)
            .to.have.attribute('data-url', apiOffersMock.ui_info.template_data.call_to_action.url);
          expect($description).to.contain.text(apiOffersMock.ui_info.template_data.desc);

          expect($codeValue, 'Code value').to.exist;
          expect($codeValue).to.have.attribute('value', apiOffersMock.ui_info.template_data.code);

          expect($copyCode, 'Copy code').to.exist;
          expect($copyCode).to.contain.text(getLocalisedString('offers_hub_copy_btn'));

          expect($validity, 'Validity').to.exist;
          expect($validity).to.contain.text(getLocalisedString('offers_expires_in'));
          expect($validity).to.contain.text(getLocalisedString('offers_expires_minutes'));

          expect($condition, 'Condition').to.exist;
          expect($condition).to.contain.text(getLocalisedString('offers_conditions'));

          expect($ctaButton, 'CTA button').to.exist;
          expect($ctaButton)
            .to.have.attribute('data-url', apiOffersMock.ui_info.template_data.call_to_action.url);
          expect($ctaButton).to.contain.text('Zum Angebot'); // HARDCODED?

          expect($feedbackButton).to.exist;
          expect($feedbackButton).to.contain.text(getLocalisedString('offers_hub_feedback_title'));

          expect($giftIcon).to.exist;
        });
      });
    });
  });
}
