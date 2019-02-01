import {
  app,
  expect,
  focusOnTab,
  newTab,
  testServer,
  wait,
  waitFor,
  waitForElement,
} from '../../../tests/core/integration/helpers';

import { getPage } from '../../../tests/core/integration/offers-helpers';
import triggerOffer from './preparation';

const offers = app.modules['offers-v2'].background;

function signalsTests(dest, config) {
  let tabId;

  describe(`offers-banner-${dest}`, function () {
    let allCampaigns;

    beforeEach(async function () {
      tabId = await triggerOffer(dest);
      await wait(4000); // timeout before banner's appearance
      allCampaigns = app.modules['offers-v2'].background.signalsHandler.sigMap.campaign;
    });

    describe('opening a categories trigger URL', function () {
      describe('increments counters for: "offer_triggered", "offer_pushed", "offer_dsp_session" and "offer_shown"', function () {
        it('should check browser-side', async function () {
          await waitFor(() =>
            expect(allCampaigns)
              .to.have.nested.property('test_campaign_v1.data.offers.test_offer_v1.origins.processor'), 1000);
          const origins = allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins;
          const { processor } = origins;

          await waitFor(() =>
            expect(origins[dest], 'offer_dsp_session, browser-side')
              .to.have.property('offer_dsp_session').to.equal(1), 5000);

          expect(processor, 'offer_triggered, browser-side').to.have.property('offer_triggered').to.equal(1);
          expect(processor, 'offer_pushed, browser-side').to.have.property('offer_pushed').to.equal(1);
          expect(origins[dest], 'offer_shown, browser-side').to.have.property('offer_shown').to.equal(1);
        });

        describe('server-side', function () {
          let hits;
          beforeEach(async function () {
            offers.signalsHandler._sendSignalsToBE();
            await waitFor(() => testServer.hasHit('/api/v1/savesignal'), 15000);
            hits = await testServer.getHits();
          });
          it('should check server-side', function () {
            expect(hits.get('/api/v1/savesignal')[0].body.action).to.equal('offers-signal');
            const req = hits.get('/api/v1/savesignal').find(r => Boolean(r.body.payload.data.c_data));
            const originData = idx =>
              req.body.payload.data.c_data.offers[0].offer_data[idx].origin_data;

            expect(originData(0), 'offer_triggered, server-side').to.have.property('offer_triggered').to.equal(1);
            expect(originData(0), 'offer_pushed, server-side').to.have.property('offer_pushed').to.equal(1);
            expect(originData(config.serverSideIndex), 'offer_dsp_session, server-side')
              .to.have.property('offer_dsp_session').to.equal(1);
            expect(originData(config.serverSideIndex), 'offer_shown, server-side')
              .to.have.property('offer_shown').to.equal(1);
          });
        });
      });
    });

    if (dest === 'browser-panel') {
      describe('opening a new tab and switching back to the first one', function () {
        beforeEach(async function () {
          const cartUrl = getPage('cart');
          await newTab(getPage('cart'), { focus: true });
          await waitForElement({ url: cartUrl, selector: 'p' });
          await wait(1000);
          await focusOnTab(tabId);
          await wait(1000);
        });

        it('increments the counter for "offer_shown", does NOT increment the counter for "offer_dsp_session"', async function () {
          const origins = allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins;
          expect(origins[dest], 'offer_dsp_session, browser-side')
            .to.have.property('offer_dsp_session').to.equal(1);
          await waitFor(() => origins[dest].offer_shown > 1, 10000);

          expect(origins[dest], 'offer_shown, browser-side').to.have.property('offer_shown').to.equal(2);
        });

        describe('server-side', function () {
          let hits;
          beforeEach(async function () {
            offers.signalsHandler._sendSignalsToBE();
            await waitFor(() => testServer.hasHit('/api/v1/savesignal'), 10000);
            hits = await testServer.getHits();
          });
          it('should check server-side', async function () {
            expect(hits.get('/api/v1/savesignal')[0].body.action).to.equal('offers-signal');
            const originData = hits.get('/api/v1/savesignal')[1]
              .body.payload.data.c_data.offers[0].offer_data[1].origin_data;
            expect(originData, 'offer_dsp_session, server-side').to.have.property('offer_dsp_session').to.equal(1);
            expect(originData, 'offer_shown, server-side').to.have.property('offer_shown').to.equal(2);
          });
        });
      });
    }
  });
}

export default function () {
  signalsTests('browser-panel', { serverSideIndex: 1 });
  signalsTests('offers-cc', { serverSideIndex: 2 });
}
