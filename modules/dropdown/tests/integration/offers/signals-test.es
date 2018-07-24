import {
  app,
  blurUrlBar,
  clearDB,
  clickWithMetaKey,
  $cliqzResults,
  expect,
  fillIn,
  getAmountOfTabs,
  mockSearch,
  testsEnabled,
  waitFor,
  waitForPopup,
  waitForPopupClosed,
  withHistory } from '../helpers';

import attachedOffers from '../fixtures/offers/attached/attachedOffers';
import regularOffers from '../fixtures/offers/non-organic/noOffersInResultsExtraOffers';
import prefs from '../../../../core/prefs';

function checkSignalsAfterBlur({ fixture, query = '', position, amountOfElements }) {
  describe('blurring the urlbar', function () {
    beforeEach(async function () {
      await mockSearch(fixture);
      withHistory([]);
      fillIn(query);
      await waitForPopup(amountOfElements);

      blurUrlBar();
      await waitForPopupClosed();

      await waitFor(
        () =>
          expect(app.modules['offers-v2'].background)
            .to.have.nested.property(
              'signalsHandler.sigMap.campaign.HCar.data.offers.HCar_TG9_O2_V1.origins.dropdown.offer_dsp_session'
            ),
        1000
      );
    });

    it(`increments counters for: "offer_dsp_session", "offer_dsp_session_${position}", "offer_shown" and "offer_shown_${position}"`, async function () {
      await waitFor(
        () =>
          expect(app.modules['offers-v2'].background.signalsHandler.sigMap.campaign, 'offer_shown')
            .to.have.nested.property(
              'HCar.data.offers.HCar_TG9_O2_V1.origins.dropdown.offer_shown')
            .that.equals(1),
        1000
      );
      await waitFor(
        () =>
          expect(app.modules['offers-v2'].background.signalsHandler.sigMap.campaign, `offer_shown_${position}`)
            .to.have.nested.property(
              `HCar.data.offers.HCar_TG9_O2_V1.origins.dropdown.offer_shown_${position}`)
            .that.equals(1),
        1000
      );
      await waitFor(
        () =>
          expect(app.modules['offers-v2'].background.signalsHandler.sigMap.campaign, 'offer_dsp_session')
            .to.have.nested.property(
              'HCar.data.offers.HCar_TG9_O2_V1.origins.dropdown.offer_dsp_session')
            .that.equals(1),
        1000
      );
      await waitFor(
        () =>
          expect(app.modules['offers-v2'].background.signalsHandler.sigMap.campaign, `offer_dsp_session_${position}`)
            .to.have.nested.property(
              `HCar.data.offers.HCar_TG9_O2_V1.origins.dropdown.offer_dsp_session_${position}`)
            .that.equals(1),
        1000
      );
    });
  });
}

function checkSignalsAfterClick({ fixture, query = '', position, amountOfElements }) {
  let $offerElement;

  describe('clicking on the url', function () {
    beforeEach(async function () {
      await mockSearch(fixture);
      withHistory([]);
      fillIn(query);
      await waitForPopup(amountOfElements);

      if (typeof position === 'number') {
        await waitFor(() => $cliqzResults.querySelectorAll('a.result:not(.search)'));
        $offerElement = $cliqzResults.querySelectorAll('a.result:not(.search)');
        // if regular offer, click on offer (position starts at 1, not 0)
        clickWithMetaKey($offerElement[position - 1], { metaKey: true });
      } else if (typeof position === 'string') {
        // wait for the attached offer
        await waitFor(() => $cliqzResults.querySelectorAll('a.result:not(.search)').length > 1);
        $offerElement = $cliqzResults.querySelectorAll('a.result:not(.search)');
        // if "attached", click on second element (attached offer)
        clickWithMetaKey($offerElement[1], { metaKey: true });
      }

      await waitFor(() => getAmountOfTabs() === 2);

      await waitFor(
        () =>
          expect(app.modules['offers-v2'].background)
            .to.have.nested.property(
              'signalsHandler.sigMap.campaign.HCar.data.offers.HCar_TG9_O2_V1.origins.dropdown.offer_shown'
            ),
        1000
      );
    });

    afterEach(function () {
      blurUrlBar();
    });

    it(`increments counters for: "offer_dsp_session", "offer_dsp_session_${position}", "offer_shown", "offer_shown_${position}", "offer_ca_action" and "offer_ca_action_${position}"`, async function () {
      await waitFor(
        () =>
          expect(app.modules['offers-v2'].background.signalsHandler.sigMap.campaign, 'offer_shown')
            .to.have.nested.property(
              'HCar.data.offers.HCar_TG9_O2_V1.origins.dropdown.offer_shown')
            .that.equals(1),
        1000
      );
      await waitFor(
        () =>
          expect(app.modules['offers-v2'].background.signalsHandler.sigMap.campaign, `offer_shown_${position}`)
            .to.have.nested.property(
              `HCar.data.offers.HCar_TG9_O2_V1.origins.dropdown.offer_shown_${position}`)
            .that.equals(1),
        1000
      );
      await waitFor(
        () =>
          expect(app.modules['offers-v2'].background.signalsHandler.sigMap.campaign, 'offer_dsp_session')
            .to.have.nested.property(
              'HCar.data.offers.HCar_TG9_O2_V1.origins.dropdown.offer_dsp_session')
            .that.equals(1),
        1000
      );
      await waitFor(
        () =>
          expect(app.modules['offers-v2'].background.signalsHandler.sigMap.campaign, `offer_dsp_session_${position}`)
            .to.have.nested.property(
              `HCar.data.offers.HCar_TG9_O2_V1.origins.dropdown.offer_dsp_session_${position}`)
            .that.equals(1),
        1000
      );
      await waitFor(
        () =>
          expect(app.modules['offers-v2'].background.signalsHandler.sigMap.campaign, 'offer_ca_action')
            .to.have.nested.property(
              'HCar.data.offers.HCar_TG9_O2_V1.origins.dropdown.offer_ca_action')
            .that.equals(1),
        1000
      );
      await waitFor(
        () =>
          expect(app.modules['offers-v2'].background.signalsHandler.sigMap.campaign, `offer_ca_action_${position}`)
            .to.have.nested.property(
              `HCar.data.offers.HCar_TG9_O2_V1.origins.dropdown.offer_ca_action_${position}`)
            .that.equals(1),
        1000
      );
    });
  });
}

export default function () {
  if (!testsEnabled()) { return; }

  const offers = app.modules['offers-v2'].background;
  const offersDB = [
    'offers-signals-url',
    'offers-last-cmp-signals',
    'cliqz-categories-data',
    'cliqz-categories-patterns',
    'cliqz-offers-intent-db',
    'cliqz-intent-offers-db',
    'offers-db-index',
    'offers-db-display-index',
    '_pouch_cliqz-offers'
  ];

  context('Dropdown offers signals', function () {
    before(function () {
      window.preventRestarts = true;
      prefs.set('offersDropdownSwitch', true);
    });

    beforeEach(async function () {
      offers.unload();
      await clearDB(offersDB);
      await offers.init();
    });

    after(function () {
      window.preventRestarts = false;
    });

    context('for regular offers', function () {
      context('in first position', function () {
        checkSignalsAfterBlur({
          fixture: regularOffers,
          query: 'mietwagen',
          position: 1,
          amountOfElements: 3
        });
        checkSignalsAfterClick({
          fixture: regularOffers,
          query: 'mietwagen',
          position: 1,
          amountOfElements: 3
        });
      });

      context('in second position', function () {
        checkSignalsAfterBlur({
          fixture: regularOffers,
          query: 'billiger',
          position: 2,
          amountOfElements: 2
        });
        checkSignalsAfterClick({
          fixture: regularOffers,
          query: 'billiger',
          position: 2,
          amountOfElements: 2
        });
      });
    });

    context('for attached offers', function () {
      checkSignalsAfterBlur({
        fixture: attachedOffers,
        query: 'audibl',
        position: 'attached',
        amountOfElements: 1
      });
      checkSignalsAfterClick({
        fixture: attachedOffers,
        query: 'audibl',
        position: 'attached',
        amountOfElements: 1
      });
    });
  });
}
