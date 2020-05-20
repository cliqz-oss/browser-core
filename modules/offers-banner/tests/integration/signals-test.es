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

function isSomeOfferShown(offersModule) {
  try {
    const allCampaigns = offersModule.signalsHandler.sigMap.campaign;
    for (const campaign of Object.values(allCampaigns)) {
      const sigOffers = campaign.data.offers;
      for (const offer of Object.values(sigOffers)) {
        const origins = offer.origins;
        for (const signals of Object.values(origins)) {
          for (const sigName of Object.keys(signals)) {
            if (sigName === 'offer_shown') {
              return true;
            }
          }
        }
      }
    }
  } catch (err) { } // eslint-disable-line no-empty
  return false;
}

function findOriginData(req, dest) {
  const offersData = req.body.payload.data.c_data.offers[0].offer_data;
  const offerData = offersData.find(o => o.origin === dest) || {};
  return offerData.origin_data || {};
}

function signalsTests(dest) {
  let tabId;

  describe(`offers-banner-${dest}`, function () {
    let allCampaigns;

    beforeEach(async function () {
      tabId = await triggerOffer(dest);
      await waitFor(() => isSomeOfferShown(offers)); // wait for banner's appearance
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
            await offers.signalsHandler.flush();
            await waitFor(() => testServer.hasHit('/api/v1/savesignal'), 15000);
            hits = await testServer.getHits();
          });
          it('should check server-side', function () {
            expect(hits.get('/api/v1/savesignal')[0].body.action).to.equal('offers-signal');
            const req = hits.get('/api/v1/savesignal').find(r => Boolean(r.body.payload.data.c_data));

            expect(findOriginData(req, 'processor'), 'offer_triggered, server-side')
              .to.have.property('offer_triggered').to.equal(1);
            expect(findOriginData(req, 'processor'), 'offer_pushed, server-side')
              .to.have.property('offer_pushed').to.equal(1);
            expect(findOriginData(req, dest), 'offer_dsp_session, server-side')
              .to.have.property('offer_dsp_session').to.equal(1);
            expect(findOriginData(req, dest), 'offer_shown, server-side')
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
            await offers.signalsHandler.flush();
            await waitFor(() => testServer.hasHit('/api/v1/savesignal'), 10000);
            hits = await testServer.getHits();
          });
          it('should check server-side', async function () {
            expect(hits.get('/api/v1/savesignal')[0].body.action).to.equal('offers-signal');
            const originData = hits.get('/api/v1/savesignal')[0]
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
  signalsTests('browser-panel');
  signalsTests('offers-cc');
}
