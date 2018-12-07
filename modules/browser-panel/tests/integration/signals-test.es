import { isWebExtension } from '../../../core/platform';
import {
  app,
  CliqzEvents,
  expect,
  focusOnTab,
  newTab,
  queryHTML,
  testServer,
  wait,
  waitFor,
  waitForElement,
  win,
} from '../../../tests/core/integration/helpers';

import {
  getPage,
  getPanelDocument,
  mockOffersBackend,
  promoCode,
  triggerKeyword,
} from '../../../tests/core/integration/offers-helpers';

const offers = app.modules['offers-v2'].background;

export default function () {
  if (isWebExtension) { return; }
  let tabId;

  describe('browser-panel', function () {
    let allCampaigns;
    // Specify a timeout (in seconds) after which the offer disappears
    // We need to edit it later for timeout tests
    let timeout = 7;

    beforeEach(async function () {
      await mockOffersBackend({
        dest: 'browser-panel',
        timeout
      });

      // Simulate location change, to trigger offers' expression evaluation.
      CliqzEvents.pub('content:location-change', {
        url: 'https://fake.url.com',
        windowTreeInformation: {
          tabId: 0,
        },
      });

      await waitFor(() => testServer.hasHit('/api/v1/categories'));
      await waitFor(() => testServer.hasHit('/api/v1/loadsubtriggers'));

      const pageUrl = getPage(`landing?q=${triggerKeyword}`);
      tabId = await newTab(pageUrl, { focus: true });
      await waitFor(async () =>
        Boolean((await queryHTML(pageUrl, 'p', 'innerText')).length) === true);

      await waitFor(() => testServer.hasHit('/api/v1/offers'), 15000);

      allCampaigns = app.modules['offers-v2'].background.signalsHandler.sigMap.campaign;
    });

    async function getSentSignalData() {
      await waitFor(() => testServer.hasHit('/api/v1/savesignal'), 15000);
      const hits = (await testServer.getHits()).get('/api/v1/savesignal');
      const campaignHits = hits.filter(hit =>
        ((hit.body.action === 'offers-signal')
          && hit.body.signal_id === 'test_campaign_v1'));
      expect(campaignHits.length).to.be.eq(1, 'One and only one compound campaign signal is expected');
      return campaignHits[0].body.payload.data;
    }

    describe('opening a categories trigger URL', function () {
      it('increments counters for: "offer_triggered", "offer_pushed", "offer_dsp_session" and "offer_shown"', async function () {
        await waitFor(() =>
          expect(allCampaigns)
            .to.have.nested.property('test_campaign_v1.data.offers.test_offer_v1.origins.processor'), 1000);

        await waitFor(() =>
          expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['browser-panel'], 'offer_dsp_session, browser-side')
            .to.have.property('offer_dsp_session').to.equal(1), 5000);

        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.processor, 'offer_triggered, browser-side')
          .to.have.property('offer_triggered').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.processor, 'offer_pushed, browser-side')
          .to.have.property('offer_pushed').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['browser-panel'], 'offer_shown, browser-side')
          .to.have.property('offer_shown').to.equal(1);

        offers.signalsHandler._sendSignalsToBE();

        const signal = await getSentSignalData();
        expect(signal.c_data.offers[0].offer_data[0].origin_data, 'offer_triggered, server-side')
          .to.have.property('offer_triggered').to.equal(1);
        expect(signal.c_data.offers[0].offer_data[0].origin_data, 'offer_pushed, server-side')
          .to.have.property('offer_pushed').to.equal(1);
        expect(signal.c_data.offers[0].offer_data[1].origin_data, 'offer_dsp_session, server-side')
          .to.have.property('offer_dsp_session').to.equal(1);
        expect(signal.c_data.offers[0].offer_data[1].origin_data, 'offer_shown, server-side')
          .to.have.property('offer_shown').to.equal(1);
      });

      it('triggers the offer correctly', async function () {
        await waitFor(
          () => expect(getPanelDocument().querySelector('.code')).to.have.property('innerText').that.equals(promoCode)
        );
      });
    });

    describe('opening a new tab and switching back to the first one', function () {
      before(() => {
        timeout = 20;
      });

      beforeEach(async function () {
        const cartUrl = getPage('cart');
        await newTab(getPage('cart'), { focus: true });
        await waitForElement({ url: cartUrl, selector: 'p' });
        await wait(100);
        await focusOnTab(tabId);
        await wait(100);
      });

      after(() => {
        timeout = 7;
      });

      it('increments the counter for "offer_shown", does NOT increment the counter for "offer_dsp_session"', async function () {
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['browser-panel'], 'offer_dsp_session, browser-side')
          .to.have.property('offer_dsp_session').to.equal(1);

        await waitFor(() =>
          allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['browser-panel'].offer_shown > 1, 10000);

        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['browser-panel'], 'offer_shown, browser-side')
          .to.have.property('offer_shown').to.equal(2);

        offers.signalsHandler._sendSignalsToBE();

        const signal = await getSentSignalData();
        expect(signal.c_data.offers[0].offer_data[1].origin_data, 'offer_dsp_session, server-side')
          .to.have.property('offer_dsp_session').to.equal(1);
        expect(signal.c_data.offers[0].offer_data[1].origin_data, 'offer_shown, server-side')
          .to.have.property('offer_shown').to.equal(2);
      });
    });

    describe('waiting for the offer timeout', function () {
      // change the offer timeout for these two tests only
      before(function () {
        timeout = 2;
      });

      beforeEach(function () {
        // Wait for timeout to expire
        return wait((timeout * 1000) + 100);
      });

      it('makes the offer disappear', async function () {
        await waitFor(() => expect(win.document.querySelector('#cqz-b-p-iframe').style.height).to.equal('0px'));
      });

      it('increments the counter for "offer_timeout"', async function () {
        await waitFor(() =>
          expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['browser-panel'], 'offer_timeout, browser-side')
            .to.have.property('offer_timeout').to.equal(1), 2000);

        offers.signalsHandler._sendSignalsToBE();

        const signal = await getSentSignalData();
        expect(signal.c_data.offers[0].offer_data[1].origin_data, 'offer_timeout, server-side')
          .to.have.property('offer_timeout').to.equal(1);
      });
    });

    describe('clicking on the promo code', function () {
      let elToCopy;
      let elCopied;

      // restore longer timeout
      before(function () {
        timeout = 7;
      });

      beforeEach(async function () {
        await waitFor(() =>
          getPanelDocument().querySelector('.code').innerText === promoCode, 1000);

        elToCopy = getPanelDocument().querySelector('.code-copy');
        elCopied = getPanelDocument().querySelector('.code-copied');
        elToCopy.click();
      });

      it('changes text to "Code copied"', async function () {
        await waitFor(() =>
          expect(getComputedStyle(elToCopy).display).to.equal('none'), 1000);
        await waitFor(() =>
          expect(getComputedStyle(elCopied).display).to.equal('inline-block'), 1000);
      });

      it('increments the counter for "code_copied"', async function () {
        await waitFor(() =>
          getComputedStyle(elToCopy).display === 'none', 1000);
        await waitFor(() =>
          getComputedStyle(elCopied).display === 'inline-block', 1000);

        await waitFor(() =>
          expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['browser-panel'], 'code_copied, browser-side')
            .to.have.property('code_copied').to.equal(1), 2000);

        offers.signalsHandler._sendSignalsToBE();

        const signal = await getSentSignalData();
        expect(signal.c_data.offers[0].offer_data[1].origin_data, 'code_copied, server-side')
          .to.have.property('code_copied').to.equal(1);
      });
    });

    describe('clicking on the offer logo', function () {
      beforeEach(async function () {
        await waitFor(() =>
          getPanelDocument().querySelector('.code').innerText === promoCode, 1000);
        const el = getPanelDocument().querySelector('.logo [data-cqz-of-btn-id="offer_logo"]');
        el.click();

        await waitForElement({
          url: getPage('landing'),
          selector: 'p',
          isPresent: true
        });
      });

      it('opens correct page', async function () {
        const landingPageContent = await queryHTML(getPage('landing'), 'p', 'innerText');
        expect(landingPageContent[0]).to.equal('Hello world');
      });

      it('increments counters for: "offer_logo", "offer_ca_action", "landing" and "page_imp"', async function () {
        await waitFor(() =>
          expect(allCampaigns)
            .to.have.nested.property('test_campaign_v1.data.offers.test_offer_v1.origins.trigger'), 1000);

        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['browser-panel'], 'offer_logo, browser-side')
          .to.have.property('offer_logo').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['browser-panel'], 'offer_ca_action, browser-side')
          .to.have.property('offer_ca_action').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.trigger, 'landing, browser-side')
          .to.have.property('landing').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.trigger, 'page_imp, browser-side')
          .to.have.property('page_imp').to.equal(1);

        offers.signalsHandler._sendSignalsToBE();

        const signal = await getSentSignalData();
        expect(signal.c_data.offers[0].offer_data[1].origin_data, 'offer_logo, server-side')
          .to.have.property('offer_logo').to.equal(1);
        expect(signal.c_data.offers[0].offer_data[1].origin_data, 'offer_ca_action, server-side')
          .to.have.property('offer_ca_action').to.equal(1);
        expect(signal.c_data.offers[0].offer_data[2].origin_data, 'landing, server-side')
          .to.have.property('landing').to.equal(1);
        expect(signal.c_data.offers[0].offer_data[2].origin_data, 'page_imp, server-side')
          .to.have.property('page_imp').to.equal(1);
      });
    });

    describe('clicking on the offer picture', function () {
      beforeEach(async function () {
        await waitFor(() =>
          getPanelDocument().querySelector('.code').innerText === promoCode, 1000);
        const el = getPanelDocument().querySelector('.picture [data-cqz-of-btn-id="offer_picture"]');
        el.click();

        await waitForElement({
          url: getPage('landing'),
          selector: 'p',
          isPresent: true
        });
      });

      it('opens correct page', async function () {
        const landingPageContent = await queryHTML(getPage('landing'), 'p', 'innerText');
        expect(landingPageContent[0]).to.equal('Hello world');
      });

      it('increments counters for: "offer_picture", "offer_ca_action", "landing" and "page_imp"', async function () {
        await waitFor(() =>
          expect(allCampaigns)
            .to.have.nested.property('test_campaign_v1.data.offers.test_offer_v1.origins.trigger'), 1000);

        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['browser-panel'], 'offer_picture, browser-side')
          .to.have.property('offer_picture').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['browser-panel'], 'offer_ca_action, browser-side')
          .to.have.property('offer_ca_action').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.trigger, 'landing, browser-side')
          .to.have.property('landing').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.trigger, 'page_imp, browser-side')
          .to.have.property('page_imp').to.equal(1);

        offers.signalsHandler._sendSignalsToBE();

        const signal = await getSentSignalData();
        expect(signal.c_data.offers[0].offer_data[1].origin_data, 'offer_picture, server-side')
          .to.have.property('offer_picture').to.equal(1);
        expect(signal.c_data.offers[0].offer_data[1].origin_data, 'offer_ca_action, server-side')
          .to.have.property('offer_ca_action').to.equal(1);
        expect(signal.c_data.offers[0].offer_data[2].origin_data, 'landing, server-side')
          .to.have.property('landing').to.equal(1);
        expect(signal.c_data.offers[0].offer_data[2].origin_data, 'page_imp, server-side')
          .to.have.property('page_imp').to.equal(1);
      });
    });

    describe('clicking on the offer benefit text', function () {
      beforeEach(async function () {
        await waitFor(() =>
          getPanelDocument().querySelector('.code').innerText === promoCode, 1000);
        const el = getPanelDocument().querySelector('.benefit');
        el.click();

        await waitForElement({
          url: getPage('landing'),
          selector: 'p',
          isPresent: true
        });
      });

      it('opens correct page', async function () {
        const landingPageContent = await queryHTML(getPage('landing'), 'p', 'innerText');
        expect(landingPageContent[0]).to.equal('Hello world');
      });

      it('increments counters for: "offer_benefit", "offer_ca_action", "landing" and "page_imp"', async function () {
        await waitFor(() =>
          expect(allCampaigns)
            .to.have.nested.property('test_campaign_v1.data.offers.test_offer_v1.origins.trigger'), 1000);

        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['browser-panel'], 'offer_benefit, browser-side')
          .to.have.property('offer_benefit').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['browser-panel'], 'offer_ca_action, browser-side')
          .to.have.property('offer_ca_action').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.trigger, 'landing, browser-side')
          .to.have.property('landing').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.trigger, 'page_imp, browser-side')
          .to.have.property('page_imp').to.equal(1);

        offers.signalsHandler._sendSignalsToBE();

        const signal = await getSentSignalData();
        expect(signal.c_data.offers[0].offer_data[1].origin_data, 'offer_benefit, server-side')
          .to.have.property('offer_benefit').to.equal(1);
        expect(signal.c_data.offers[0].offer_data[1].origin_data, 'offer_ca_action, server-side')
          .to.have.property('offer_ca_action').to.equal(1);
        expect(signal.c_data.offers[0].offer_data[2].origin_data, 'landing, server-side')
          .to.have.property('landing').to.equal(1);
        expect(signal.c_data.offers[0].offer_data[2].origin_data, 'page_imp, server-side')
          .to.have.property('page_imp').to.equal(1);
      });
    });

    describe('clicking on the offer headline', function () {
      beforeEach(async function () {
        await waitFor(() =>
          getPanelDocument().querySelector('.code').innerText === promoCode, 1000);
        const el = getPanelDocument().querySelector('.headline');
        el.click();

        await waitForElement({
          url: getPage('landing'),
          selector: 'p',
          isPresent: true
        });
      });

      it('opens correct page', async function () {
        const landingPageContent = await queryHTML(getPage('landing'), 'p', 'innerText');
        expect(landingPageContent[0]).to.equal('Hello world');
      });

      it('increments counters for: "offer_headline", "offer_ca_action", "landing" and "page_imp"', async function () {
        await waitFor(() =>
          expect(allCampaigns)
            .to.have.nested.property('test_campaign_v1.data.offers.test_offer_v1.origins.trigger'), 1000);

        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['browser-panel'], 'offer_headline, browser-side')
          .to.have.property('offer_headline').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['browser-panel'], 'offer_ca_action, browser-side')
          .to.have.property('offer_ca_action').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.trigger, 'landing, browser-side')
          .to.have.property('landing').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.trigger, 'page_imp, browser-side')
          .to.have.property('page_imp').to.equal(1);

        offers.signalsHandler._sendSignalsToBE();

        const signal = await getSentSignalData();
        expect(signal.c_data.offers[0].offer_data[1].origin_data, 'offer_headline, server-side')
          .to.have.property('offer_headline').to.equal(1);
        expect(signal.c_data.offers[0].offer_data[1].origin_data, 'offer_ca_action, server-side')
          .to.have.property('offer_ca_action').to.equal(1);
        expect(signal.c_data.offers[0].offer_data[2].origin_data, 'landing, server-side')
          .to.have.property('landing').to.equal(1);
        expect(signal.c_data.offers[0].offer_data[2].origin_data, 'page_imp, server-side')
          .to.have.property('page_imp').to.equal(1);
      });
    });

    describe('clicking on the offer description', function () {
      beforeEach(async function () {
        await waitFor(() =>
          getPanelDocument().querySelector('.code').innerText === promoCode, 1000);
        const el = getPanelDocument().querySelector('.description .desc-content');
        el.click();

        await waitForElement({
          url: getPage('landing'),
          selector: 'p',
          isPresent: true
        });
      });

      it('opens correct page', async function () {
        const landingPageContent = await queryHTML(getPage('landing'), 'p', 'innerText');
        expect(landingPageContent[0]).to.equal('Hello world');
      });

      it('increments counters for: "offer_description", "offer_ca_action", "landing" and "page_imp"', async function () {
        await waitFor(() =>
          expect(allCampaigns)
            .to.have.nested.property('test_campaign_v1.data.offers.test_offer_v1.origins.trigger'), 1000);

        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['browser-panel'], 'offer_description, browser-side')
          .to.have.property('offer_description').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['browser-panel'], 'offer_ca_action, browser-side')
          .to.have.property('offer_ca_action').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.trigger, 'landing, browser-side')
          .to.have.property('landing').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.trigger, 'page_imp, browser-side')
          .to.have.property('page_imp').to.equal(1);

        offers.signalsHandler._sendSignalsToBE();

        const signal = await getSentSignalData();
        expect(signal.c_data.offers[0].offer_data[1].origin_data, 'offer_description, server-side')
          .to.have.property('offer_description').to.equal(1);
        expect(signal.c_data.offers[0].offer_data[1].origin_data, 'offer_ca_action, server-side')
          .to.have.property('offer_ca_action').to.equal(1);
        expect(signal.c_data.offers[0].offer_data[2].origin_data, 'landing, server-side')
          .to.have.property('landing').to.equal(1);
        expect(signal.c_data.offers[0].offer_data[2].origin_data, 'page_imp, server-side')
          .to.have.property('page_imp').to.equal(1);
      });
    });

    describe('clicking on the offer CTA button', function () {
      beforeEach(async function () {
        await waitFor(() =>
          getPanelDocument().querySelector('.code').innerText === promoCode, 1000);
        const el = getPanelDocument().querySelector('.call-to-action .btn');
        el.click();

        await waitForElement({
          url: getPage('landing'),
          selector: 'p',
          isPresent: true
        });
      });

      it('opens correct page', async function () {
        const landingPageContent = await queryHTML(getPage('landing'), 'p', 'innerText');
        expect(landingPageContent[0]).to.equal('Hello world');
      });

      it('increments counters for: "offer_ca_action", "landing" and "page_imp"', async function () {
        await waitFor(() =>
          expect(allCampaigns)
            .to.have.nested.property('test_campaign_v1.data.offers.test_offer_v1.origins.trigger'), 1000);

        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['browser-panel'], 'offer_ca_action, browser-side')
          .to.have.property('offer_ca_action').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.trigger, 'landing, browser-side')
          .to.have.property('landing').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.trigger, 'page_imp, browser-side')
          .to.have.property('page_imp').to.equal(1);

        offers.signalsHandler._sendSignalsToBE();

        const signal = await getSentSignalData();
        expect(signal.c_data.offers[0].offer_data[1].origin_data, 'offer_ca_action, server-side')
          .to.have.property('offer_ca_action').to.equal(1);
        expect(signal.c_data.offers[0].offer_data[2].origin_data, 'landing, server-side')
          .to.have.property('landing').to.equal(1);
        expect(signal.c_data.offers[0].offer_data[2].origin_data, 'page_imp, server-side')
          .to.have.property('page_imp').to.equal(1);
      });
    });

    describe('visiting the trigger URL:', function () {
      beforeEach(async function () {
        await waitFor(() =>
          getPanelDocument().querySelector('.code').innerText === promoCode, 1000);
        const el = getPanelDocument().querySelector('.code-copy');
        el.click();

        await waitFor(() => getComputedStyle(el).display === 'none', 1000);
      });

      ['cart', 'payment', 'success']
        .forEach((signal) => {
          context(`${signal}`, function () {
            beforeEach(async function () {
              const page = getPage(`${signal}`);
              await newTab(page, { focus: true });
              await waitFor(async () =>
                await queryHTML(page, 'p', 'innerText')[0] !== `${signal}`);
            });

            it(`increments counter for "${signal}"`, async function () {
              await waitFor(async () =>
                expect(allCampaigns).to.have.nested.property(
                  'test_campaign_v1.data.offers.test_offer_v1.origins.trigger'
                ));
              expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.trigger, `${signal}, browser-side`)
                .to.have.property(`${signal}`).to.equal(1);

              offers.signalsHandler._sendSignalsToBE();

              const signalData = await getSentSignalData();
              expect(signalData.c_data.offers[0].offer_data[2].origin_data, `${signal}, server-side`)
                .to.have.property(`${signal}`).to.equal(1);
            });
          });
        });
    });

    describe('clicking on the offer close button', function () {
      beforeEach(async function () {
        await waitFor(() =>
          getPanelDocument().querySelector('.code').innerText === promoCode, 1000);
        const el = getPanelDocument().querySelector('.close [data-cqz-of-btn-id="offer_closed"]');
        el.click();
      });

      it('removes the offer', async function () {
        await waitFor(() => expect(win.document.querySelector('#cqz-b-p-iframe').style.height).to.equal('0px'));
      });

      it('increments the counter for "offer_closed"', async function () {
        await waitFor(() => expect(win.document.querySelector('#cqz-b-p-iframe').style.height).to.equal('0px'));

        await waitFor(() =>
          expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['browser-panel'], 'offer_closed, browser-side')
            .to.have.property('offer_closed').to.equal(1), 1000);

        offers.signalsHandler._sendSignalsToBE();

        const signal = await getSentSignalData();
        expect(signal.c_data.offers[0].offer_data[1].origin_data, 'offer_closed, server-side')
          .to.have.property('offer_closed').to.equal(1);
      });
    });
  });
}
