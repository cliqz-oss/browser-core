import {
  app,
  click,
  CliqzEvents,
  closeTab,
  expect,
  getResourceUrl,
  newTab,
  queryHTML,
  testServer,
  wait,
  waitFor,
  waitForElement,
  waitForPageLoad,
} from '../../../tests/core/integration/helpers';

import {
  clearOffersDB,
  getPage,
  mockOffersBackend,
} from '../../../tests/core/integration/offers-helpers';

export default function () {
  const freshtabUrl = getResourceUrl('freshtab/home.html');
  let allCampaigns;
  let offers;

  describe('Freshtab offers tests', function () {
    let offerShown;
    let freshtabId;

    beforeEach(async function () {
      await mockOffersBackend({ dest: 'cliqz-tab' });
      offers = app.modules['offers-v2'].background;

      // Simulate location change, to trigger offers' expression evaluation.
      CliqzEvents.pub('content:location-change', {
        url: 'https://fake.url.com',
        windowTreeInformation: {
          tabId: 0,
        },
      });

      await testServer.hasHit('/api/v1/categories');
      await testServer.hasHit('/api/v1/loadsubtriggers');

      // Load freshtab in new tab
      freshtabId = await newTab(freshtabUrl, { focus: true });

      // Expect offer to appear in notification box
      offerShown = await waitForElement({
        url: freshtabUrl,
        selector: '.offer-unit',
        isPresent: true
      });

      allCampaigns = offers.signalsHandler.sigMap.campaign;
    });

    afterEach(() => {
      offers.unload();
      return clearOffersDB();
    });

    it('trigger correctly', function () {
      expect(offerShown).to.be.true;
    });

    describe('clicking on the "copy code" button', function () {
      beforeEach(async function () {
        await waitForElement({
          url: freshtabUrl,
          selector: '.copy-code',
          isPresent: true
        });
        await click(freshtabUrl, '.copy-code');
      });

      it('changes text to "Code copied"', async function () {
        await waitForElement({
          url: freshtabUrl,
          selector: '.copy-code',
          isPresent: false
        });
        await waitForElement({
          url: freshtabUrl,
          selector: '.code-copied',
          isPresent: true
        });
      });

      it('increments counter for "code_copied"', async function () {
        await waitFor(() =>
          expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['cliqz-tab'], 'code_copied, browser-side')
            .to.have.property('code_copied').to.equal(1),
        );

        offers.signalsHandler._sendSignalsToBE();
        await waitFor(() => testServer.hasHit('/api/v1/savesignal'));
        const hits = await testServer.getHits();
        expect(hits.get('/api/v1/savesignal')[0].body.action).to.equal('offers-signal');
        expect(hits.get('/api/v1/savesignal')[0].body.payload.data.c_data.offers[0].offer_data[1].origin_data, 'code_copied, server-side')
          .to.have.property('code_copied').to.equal(1);
      });
    });

    describe('clicking on the description', function () {
      beforeEach(async function () {
        await waitForElement({
          url: freshtabUrl,
          selector: '.offer-description a[data-class="light-tooltip"]',
          isPresent: true
        });
        await click(freshtabUrl, '.offer-description a[data-class="light-tooltip"]');

        await waitForElement({
          url: getPage('landing'),
          selector: 'p',
          isPresent: true
        });
      });

      it('loads correct landing page', async function () {
        const landingPageContent = await queryHTML(getPage('landing'), 'p', 'innerText');
        expect(landingPageContent[0]).to.equal('Hello world');
      });

      it('increments counters for: "offer_ca_action", "landing", "page_imp" and "offer_description"', async function () {
        await waitFor(() =>
          expect(allCampaigns)
            .to.have.nested.property('test_campaign_v1.data.offers.test_offer_v1.origins.trigger'));

        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['cliqz-tab'], 'offer_ca_action, browser-side')
          .to.have.property('offer_ca_action').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.trigger, 'landing, browser-side')
          .to.have.property('landing').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.trigger, 'page_imp, browser-side')
          .to.have.property('page_imp').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.trigger, 'ref_none, browser-side')
          .to.have.property('ref_none'); // actual value is not stable to test
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['cliqz-tab'], 'offer_description, browser-side')
          .to.have.property('offer_description').to.equal(1);

        offers.signalsHandler._sendSignalsToBE();
        await waitFor(() => testServer.hasHit('/api/v1/savesignal'));
        const hits = await testServer.getHits();
        expect(hits.get('/api/v1/savesignal')[0].body.action).to.equal('offers-signal');
        expect(hits.get('/api/v1/savesignal')[0].body.payload.data.c_data.offers[0].offer_data[1].origin_data, 'offer_ca_action, server-side')
          .to.have.property('offer_ca_action').to.equal(1);
        expect(hits.get('/api/v1/savesignal')[0].body.payload.data.c_data.offers[0].offer_data[2].origin_data, 'landing, server-side')
          .to.have.property('landing').to.equal(1);
        expect(hits.get('/api/v1/savesignal')[0].body.payload.data.c_data.offers[0].offer_data[2].origin_data, 'page_imp, server-side')
          .to.have.property('page_imp').to.equal(1);
        expect(hits.get('/api/v1/savesignal')[0].body.payload.data.c_data.offers[0].offer_data[2].origin_data, 'ref_none, server-side')
          .to.have.property('ref_none'); // actual value is not stable to test
        expect(hits.get('/api/v1/savesignal')[0].body.payload.data.c_data.offers[0].offer_data[1].origin_data, 'offer_description, server-side')
          .to.have.property('offer_description').to.equal(1);
      });
    });

    describe('clicking on the CTA button', function () {
      beforeEach(async function () {
        await waitForElement({
          url: freshtabUrl,
          selector: 'a.footer-cta',
          isPresent: true
        });
        await click(freshtabUrl, 'a.footer-cta');
        await waitForElement({
          url: getPage('landing'),
          selector: 'p',
          isPresent: true
        });
      });

      it('loads correct landing page', async function () {
        const landingPageContent = await queryHTML(getPage('landing'), 'p', 'innerText');
        expect(landingPageContent[0]).to.equal('Hello world');
      });

      it('increments counters for: "offer_ca_action", "landing" and "page_imp"', async function () {
        await waitFor(() =>
          expect(allCampaigns)
            .to.have.nested.property('test_campaign_v1.data.offers.test_offer_v1.origins.trigger'));

        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['cliqz-tab'], 'offer_ca_action, browser-side')
          .to.have.property('offer_ca_action').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.trigger, 'landing, browser-side')
          .to.have.property('landing').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.trigger, 'page_imp, browser-side')
          .to.have.property('page_imp').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.trigger, 'ref_none, browser-side')
          .to.have.property('ref_none'); // actual value is not stable to test

        offers.signalsHandler._sendSignalsToBE();
        await waitFor(() => testServer.hasHit('/api/v1/savesignal'));
        const hits = await testServer.getHits();
        expect(hits.get('/api/v1/savesignal')[0].body.action).to.equal('offers-signal');
        expect(hits.get('/api/v1/savesignal')[0].body.payload.data.c_data.offers[0].offer_data[1].origin_data, 'offer_ca_action, server-side')
          .to.have.property('offer_ca_action').to.equal(1);
        expect(hits.get('/api/v1/savesignal')[0].body.payload.data.c_data.offers[0].offer_data[2].origin_data, 'landing, server-side')
          .to.have.property('landing').to.equal(1);
        expect(hits.get('/api/v1/savesignal')[0].body.payload.data.c_data.offers[0].offer_data[2].origin_data, 'page_imp, server-side')
          .to.have.property('page_imp').to.equal(1);
        expect(hits.get('/api/v1/savesignal')[0].body.payload.data.c_data.offers[0].offer_data[2].origin_data, 'ref_none, server-side')
          .to.have.property('ref_none'); // actual value is not stable to test
      });
    });

    describe('clicking on the price', function () {
      beforeEach(async function () {
        await waitForElement({
          url: freshtabUrl,
          selector: '.benefit a',
          isPresent: true
        });
        await click(freshtabUrl, '.benefit a');
        await waitForElement({
          url: getPage('landing'),
          selector: 'p',
          isPresent: true
        });
      });

      it('loads correct landing page', async function () {
        const landingPageContent = await queryHTML(getPage('landing'), 'p', 'innerText');
        expect(landingPageContent[0]).to.equal('Hello world');
      });

      it('increments counters for: "offer_benefit", "landing" and "page_imp"', async function () {
        await waitFor(() =>
          expect(allCampaigns)
            .to.have.nested.property('test_campaign_v1.data.offers.test_offer_v1.origins.trigger'));

        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['cliqz-tab'], 'offer_benefit, browser-side')
          .to.have.property('offer_benefit').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['cliqz-tab'], 'offer_ca_action, browser-side')
          .to.have.property('offer_ca_action').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.trigger, 'landing, browser-side')
          .to.have.property('landing').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.trigger, 'page_imp, browser-side')
          .to.have.property('page_imp').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.trigger, 'ref_none, browser-side')
          .to.have.property('ref_none'); // actual value is not stable to test

        offers.signalsHandler._sendSignalsToBE();
        await waitFor(() => testServer.hasHit('/api/v1/savesignal'));
        const hits = await testServer.getHits();
        expect(hits.get('/api/v1/savesignal')[0].body.action).to.equal('offers-signal');
        expect(hits.get('/api/v1/savesignal')[0].body.payload.data.c_data.offers[0].offer_data[1].origin_data, 'offer_benefit, server-side')
          .to.have.property('offer_ca_action').to.equal(1);
        expect(hits.get('/api/v1/savesignal')[0].body.payload.data.c_data.offers[0].offer_data[1].origin_data, 'offer_ca_action, server-side')
          .to.have.property('offer_ca_action').to.equal(1);
        expect(hits.get('/api/v1/savesignal')[0].body.payload.data.c_data.offers[0].offer_data[2].origin_data, 'landing, server-side')
          .to.have.property('landing').to.equal(1);
        expect(hits.get('/api/v1/savesignal')[0].body.payload.data.c_data.offers[0].offer_data[2].origin_data, 'page_imp, server-side')
          .to.have.property('page_imp').to.equal(1);
        expect(hits.get('/api/v1/savesignal')[0].body.payload.data.c_data.offers[0].offer_data[2].origin_data, 'ref_none, server-side')
          .to.have.property('ref_none'); // actual value is not stable to test
      });
    });

    describe('clicking on the headline', function () {
      beforeEach(async function () {
        await waitForElement({
          url: freshtabUrl,
          selector: '.headline .headline-url',
          isPresent: true
        });
        await click(freshtabUrl, '.headline .headline-url');
        await waitForElement({
          url: getPage('landing'),
          selector: 'p',
          isPresent: true
        });
      });

      it('loads correct landing page', async function () {
        const landingPageContent = await queryHTML(getPage('landing'), 'p', 'innerText');
        expect(landingPageContent[0]).to.equal('Hello world');
      });

      it('increments counters for: "offer_ca_action", "landing", "page_imp" and "offer_headline"', async function () {
        await waitFor(() =>
          expect(allCampaigns)
            .to.have.nested.property('test_campaign_v1.data.offers.test_offer_v1.origins.trigger'));

        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['cliqz-tab'], 'offer_ca_action, browser-side')
          .to.have.property('offer_ca_action').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.trigger, 'landing, browser-side')
          .to.have.property('landing').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.trigger, 'page_imp, browser-side')
          .to.have.property('page_imp').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.trigger, 'ref_none, browser-side')
          .to.have.property('ref_none'); // actual value is not stable to test
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['cliqz-tab'], 'offer_headline, browser-side')
          .to.have.property('offer_headline').to.equal(1);

        offers.signalsHandler._sendSignalsToBE();
        await waitFor(() => testServer.hasHit('/api/v1/savesignal'));
        const hits = await testServer.getHits();
        expect(hits.get('/api/v1/savesignal')[0].body.action).to.equal('offers-signal');
        expect(hits.get('/api/v1/savesignal')[0].body.payload.data.c_data.offers[0].offer_data[1].origin_data, 'offer_ca_action, server-side')
          .to.have.property('offer_ca_action').to.equal(1);
        expect(hits.get('/api/v1/savesignal')[0].body.payload.data.c_data.offers[0].offer_data[2].origin_data, 'landing, server-side')
          .to.have.property('landing').to.equal(1);
        expect(hits.get('/api/v1/savesignal')[0].body.payload.data.c_data.offers[0].offer_data[2].origin_data, 'page_imp, server-side')
          .to.have.property('page_imp').to.equal(1);
        expect(hits.get('/api/v1/savesignal')[0].body.payload.data.c_data.offers[0].offer_data[2].origin_data, 'ref_none, server-side')
          .to.have.property('ref_none'); // actual value is not stable to test
        expect(hits.get('/api/v1/savesignal')[0].body.payload.data.c_data.offers[0].offer_data[1].origin_data, 'offer_headline, server-side')
          .to.have.property('offer_headline');
      });
    });

    describe('clicking on the logo', function () {
      beforeEach(async function () {
        await waitForElement({
          url: freshtabUrl,
          selector: '.logo .logo-url',
          isPresent: true
        });
        await click(freshtabUrl, '.logo .logo-url');
        await waitForElement({
          url: getPage('landing'),
          selector: 'p',
          isPresent: true
        });
      });

      it('loads correct landing page', async function () {
        const landingPageContent = await queryHTML(getPage('landing'), 'p', 'innerText');
        expect(landingPageContent[0]).to.equal('Hello world');
      });

      it('increments counters for: "offer_ca_action", "landing", "page_imp" and "offer_logo"', async function () {
        await waitFor(() =>
          expect(allCampaigns)
            .to.have.nested.property('test_campaign_v1.data.offers.test_offer_v1.origins.trigger'));

        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['cliqz-tab'], 'offer_ca_action, browser-side')
          .to.have.property('offer_ca_action').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.trigger, 'landing, browser-side')
          .to.have.property('landing').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.trigger, 'page_imp, browser-side')
          .to.have.property('page_imp').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.trigger, 'ref_none, browser-side')
          .to.have.property('ref_none'); // actual value is not stable to test
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['cliqz-tab'], 'offer_logo, browser-side')
          .to.have.property('offer_logo').to.equal(1);

        offers.signalsHandler._sendSignalsToBE();
        await waitFor(() => testServer.hasHit('/api/v1/savesignal'));
        const hits = await testServer.getHits();
        expect(hits.get('/api/v1/savesignal')[0].body.action).to.equal('offers-signal');
        expect(hits.get('/api/v1/savesignal')[0].body.payload.data.c_data.offers[0].offer_data[1].origin_data, 'offer_ca_action, server-side')
          .to.have.property('offer_ca_action').to.equal(1);
        expect(hits.get('/api/v1/savesignal')[0].body.payload.data.c_data.offers[0].offer_data[2].origin_data, 'landing, server-side')
          .to.have.property('landing').to.equal(1);
        expect(hits.get('/api/v1/savesignal')[0].body.payload.data.c_data.offers[0].offer_data[2].origin_data, 'page_imp, server-side')
          .to.have.property('page_imp').to.equal(1);
        expect(hits.get('/api/v1/savesignal')[0].body.payload.data.c_data.offers[0].offer_data[2].origin_data, 'ref_none, server-side')
          .to.have.property('ref_none'); // actual value is not stable to test
        expect(hits.get('/api/v1/savesignal')[0].body.payload.data.c_data.offers[0].offer_data[1].origin_data, 'offer_logo, server-side')
          .to.have.property('offer_logo');
      });
    });

    // TODO: rewrite these tests without needing to close extra freshtab
    describe('opening second instance of Freshtab', function () {
      beforeEach(async function () {
        const newFreshTab = await newTab(freshtabUrl, { focus: true });

        // close first instance of freshtab, so we can use queryHTML
        await closeTab(freshtabId);
        freshtabId = newFreshTab;

        await waitForElement({ url: freshtabUrl, selector: '.headline .headline-url' });
      });

      it('sends a signal containing NOT incremented "offer_triggered" and "offer_pushed", and incremented values of "offer_dsp_session" and "offer_shown"', async function () {
        await waitFor(() =>
          allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['cliqz-tab'].offer_shown > 1
        );

        expect(
          allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.processor, 'offer_triggered, browser-side')
          .to.have.property('offer_triggered').to.equal(1);
        expect(
          allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.processor, 'offer_pushed, browser-side')
          .to.have.property('offer_pushed').to.equal(1);
        expect(
          allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['cliqz-tab'], 'offer_dsp_session, browser-side')
          .to.have.property('offer_dsp_session').to.equal(2);
        expect(
          allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['cliqz-tab'], 'offer_shown, browser-side')
          .to.have.property('offer_shown').to.equal(2);

        offers.signalsHandler._sendSignalsToBE();
        await waitFor(() => testServer.hasHit('/api/v1/savesignal'));
        const hits = await testServer.getHits();
        expect(hits.get('/api/v1/savesignal')[0].body.action).to.equal('offers-signal');
        expect(hits.get('/api/v1/savesignal')[0].body.payload.data.c_data.offers[0].offer_data[0].origin_data, 'offer_triggered, server-side')
          .to.have.property('offer_triggered').to.equal(1);
        expect(hits.get('/api/v1/savesignal')[0].body.payload.data.c_data.offers[0].offer_data[0].origin_data, 'offer_pushed, server-side')
          .to.have.property('offer_pushed').to.equal(1);
        expect(hits.get('/api/v1/savesignal')[0].body.payload.data.c_data.offers[0].offer_data[1].origin_data, 'offer_dsp_session, server-side')
          .to.have.property('offer_dsp_session').to.equal(2);
        expect(hits.get('/api/v1/savesignal')[0].body.payload.data.c_data.offers[0].offer_data[1].origin_data, 'offer_shown, .to.equal(2)server-side')
          .to.have.property('offer_shown').to.equal(2);
      });

      it('displays the same offer again', async function () {
        const offerHeadlines = await queryHTML(freshtabUrl, '.headline .headline-url', 'innerText');
        expect(offerHeadlines[0]).to.equal('(Int-Test) Anmeldegebuhr');
      });
    });

    describe('opening another page and then moving focus back to the Freshtab instance', function () {
      beforeEach(async function () {
        const landingUrl = getPage('landing');

        const isPageLoaded = waitForPageLoad(landingUrl);
        const landingPageId = await newTab(landingUrl, { focus: true });
        await isPageLoaded;

        // "offer_shown" is increased on "visibilitychange" event
        // if we close the tab too fast, it won't get increased
        await wait(1000);
        await closeTab(landingPageId);
      });

      it('increments the counter counter for "offer_shown" and does NOT increment the counter for "offer_dsp_session"', async function () {
        await waitFor(() =>
          allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['cliqz-tab'].offer_shown > 1);

        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['cliqz-tab'], 'offer_shown, browser-side')
          .to.have.property('offer_shown').to.equal(2);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['cliqz-tab'], 'offer_dsp_session. browser-side')
          .to.have.property('offer_dsp_session').to.equal(1);

        offers.signalsHandler._sendSignalsToBE();
        await waitFor(() => testServer.hasHit('/api/v1/savesignal'));
        const hits = await testServer.getHits();
        expect(hits.get('/api/v1/savesignal')[0].body.action).to.equal('offers-signal');
        expect(hits.get('/api/v1/savesignal')[0].body.payload.data.c_data.offers[0].offer_data[1].origin_data, 'offer_dsp_session, server-side')
          .to.have.property('offer_dsp_session').to.equal(1);
        expect(hits.get('/api/v1/savesignal')[0].body.payload.data.c_data.offers[0].offer_data[1].origin_data, 'offer_shown, server-side')
          .to.have.property('offer_shown').to.equal(2);
      });
    });

    describe('visiting the trigger URL:', function () {
      beforeEach(async function () {
        await waitForElement({
          url: freshtabUrl,
          selector: '.copy-code',
          isPresent: true
        });
        await click(freshtabUrl, '.copy-code');
        await waitForElement({
          url: freshtabUrl,
          selector: '.copy-code',
          isPresent: false
        });
      });

      ['cart', 'payment', 'success'].forEach((signal) => {
        context(signal, function () {
          beforeEach(async function () {
            const page = getPage(signal);
            await newTab(page, { focus: true });

            await waitFor(async () => (await queryHTML(page, 'p', 'innerText'))[0] === signal);
          });

          it(`increments counter for "${signal}"`, async function () {
            await waitFor(() =>
              expect(allCampaigns).to.have.nested.property(
                'test_campaign_v1.data.offers.test_offer_v1.origins.trigger'
              )
            );
            expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.trigger, `${signal}, browser-side`)
              .to.have.property(`${signal}`).to.equal(1);

            offers.signalsHandler._sendSignalsToBE();
            await waitFor(() => testServer.hasHit('/api/v1/savesignal'));
            const hits = await testServer.getHits();
            expect(hits.get('/api/v1/savesignal')[0].body.payload.data.c_data.offers[0].offer_data[2].origin_data, `${signal}, server-side`)
              .to.have.property(signal).to.equal(1);
          });
        });
      });
    });

    describe('clicking on the offer close button', function () {
      beforeEach(async function () {
        await waitForElement({
          url: freshtabUrl,
          selector: 'button.options',
          isPresent: true
        });
        await click(freshtabUrl, 'button.options');
        await waitForElement({
          url: freshtabUrl,
          selector: '.offer-menu.white-box.show-it button',
          isPresent: true
        });
        await click(freshtabUrl, '.offer-menu.white-box.show-it button');
        await waitForElement({
          url: freshtabUrl,
          selector: '.feedback-header',
          isPresent: true
        });
      });

      it('increments counters for: "offer_removed" and "offer_db_removed"', async function () {
        await waitFor(
          () =>
            expect(allCampaigns).to.have.nested.property(
              'test_campaign_v1.data.offers.test_offer_v1.origins.cliqz-tab.offer_removed'
            ),
        );

        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['cliqz-tab'], 'offer_removed, browser-side')
          .to.have.property('offer_removed').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.processor, 'offer_db_removed, browser-side')
          .to.have.property('offer_db_removed').to.equal(1);

        offers.signalsHandler._sendSignalsToBE();
        await waitFor(() => testServer.hasHit('/api/v1/savesignal'));
        const hits = await testServer.getHits();
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['cliqz-tab'], 'offer_removed, server-side')
          .to.have.property('offer_removed').to.equal(1);
        expect(hits.get('/api/v1/savesignal')[0].body.payload.data.c_data.offers[0].offer_data[0].origin_data, 'offer_db_removed, server-side')
          .to.have.property('offer_db_removed').to.equal(1);
      });
    });
  });
}
