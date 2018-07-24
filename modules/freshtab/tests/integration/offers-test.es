import {
  app,
  clearDB,
  CliqzEvents,
  closeTab,
  expect,
  focusOnTab,
  getAmountOfTabs,
  getResourceUrl,
  newTab,
  queryHTML,
  click,
  testServer,
  waitFor,
  waitForAsync,
  waitForElement
} from '../../../tests/core/test-helpers';
import { isFirefox } from '../../../core/platform';
import prefs from '../../../core/prefs';

function getMainPage() {
  return `http://cliqztest.com:${testServer.port}`;
}

function getPage(url) {
  return `${getMainPage()}/integration_tests/${url}`;
}

const apiCategoriesMock = JSON.stringify({
  categories: [
    {
      name: 'tempcat_Sparbonus.com_RewardBox_200€AmazonGiftCard_TG1',
      timeRangeSecs: 900,
      patterns: [
        'strom vergleich$fuzzy,domain=bing.de|check24.de|google.com|google.de',
        'strompreisvergleich$fuzzy,domain=bing.de|check24.de|google.com|google.de',
      ],
      revHash: 'a8dfffa81f',
      activationData: {
        activationTimeSecs: 86400,
        args: {
          totNumHits: 1
        },
        func: 'simpleCount'
      }
    }
  ],
  revision: 'abc',
});

const apiLoadSubTriggersMock = JSON.stringify([
  {
    trigger_uid: '1212121212121212121212',
    campaign_id: 'test_campaign_v1',
    parent_trigger_ids: [
      'root'
    ],
    trigger_id: 'test_campaign_v1_triggering',
    version: 20,
    validity: [
      1524528023,
      Date.now() - 1
    ],
    paused: false,
    ttl: 3600,
    actions: [
      [
        '$activate_intent',
        [
          {
            durationSecs: 86400,
            name: 'test_campaign_v1_OOW'
          }
        ]
      ]
    ]
  }
]);

function getApiOffersMock() {
  return JSON.stringify([
    {
      offer_id: 'test_offer_v1',
      campaign_id: 'test_campaign_v1',
      display_id: 'test_campaign_v1-d',
      types: [
        'test_campaign_v1'
      ],
      rs_dest: [
        'cliqz-tab'
      ],
      version: '123123123123123',
      monitorData: [
        {
          params: {
            filter_last_secs: 5,
            referrer_cat: true,
            store: false
          },
          patterns: [
            '||cliqztest*/integration_tests/success'
          ],
          signalID: 'success',
          type: 'urlchange'
        },
        {
          params: {
            filter_last_secs: 5,
            referrer_cat: true,
            store: false
          },
          patterns: [
            '||cliqztest*/integration_tests/payment'
          ],
          signalID: 'payment',
          type: 'urlchange'
        },
        {
          params: {
            filter_last_secs: 5,
            referrer_cat: true,
            store: false
          },
          patterns: [
            '||cliqztest*/integration_tests/landing'
          ],
          signalID: 'page_imp',
          type: 'urlchange'
        },
        {
          params: {
            filter_last_secs: 5,
            referrer_cat: true,
            store: false
          },
          patterns: [
            '||cliqztest*/integration_tests/landing'
          ],
          signalID: 'landing',
          type: 'urlchange'
        },
        {
          params: {
            filter_last_secs: 5,
            referrer_cat: true,
            store: false
          },
          patterns: [
            '||cliqztest*/integration_tests/cart'
          ],
          signalID: 'cart',
          type: 'urlchange'
        }
      ],
      ui_info: {
        styles: {
          'call-to-action-bg-color': '#e741',
          'call-to-action-color': '#fff'
        },
        template_data: {
          benefit: '499€',
          call_to_action: {
            target: '',
            text: '(Int-Test) Jetzt anmelden',
            url: getPage('landing')
          },
          code: 'IT-ODI-MO4915',
          desc: '(Int-Test) Jetzt registrieren und zusätzlich 15 Minuten geschenkt bekommen!',
          headline: '(Int-Test) Anmeldegebuhr',
          logo_class: 'normal',
          logo_url: 'https://cdn.cliqz.com/extension/offers/test/resources/drivenow-week/drivenow-week-logo-normal-1524572543.png',
          title: '(Int-Test) 499€ Anmeldegebühr (statt 29€) & 15 Freiminuten geschenkt! ',
          validity: (Date.now() * 1000) + 1
        },
        template_name: 'ticket_template'
      },
      displayPriority: 1,
      rule_info: {
        display_time_secs: 120,
        type: 'exact_match',
        url: []
      },
      filterRules: {
        eval_expression: "generic_comparator('offer_pushed','counter','<=',0)"
      },
      expirationMs: 624789
    }
  ]);
}

export default function () {
  // Currently queryHTML from core/background will only work in firefox.
  if (!isFirefox) {
    return;
  }

  let allCampaigns;
  const freshtabUrl = getResourceUrl('freshtab', 'home.html');
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

  const mockOffersBackend = async () => {
    // Register mocked paths for offers
    await Promise.all([
      testServer.registerPathHandler('/api/v1/categories', apiCategoriesMock),
      testServer.registerPathHandler('/api/v1/loadsubtriggers', apiLoadSubTriggersMock),
      testServer.registerPathHandler('/api/v1/offers', getApiOffersMock()),
      testServer.registerPathHandler('/integration_tests/landing', '<html><body><p>Hello world</p></body></html>'),
      testServer.registerPathHandler('/integration_tests/cart', '<html><body><p>cart</p></body></html>'),
      testServer.registerPathHandler('/integration_tests/payment', '<html><body><p>payment</p></body></html>'),
      testServer.registerPathHandler('/integration_tests/success', '<html><body><p>success</p></body></html>'),
    ]);

    // Configure offers to use our local http server
    prefs.set('triggersBE', testServer.getBaseUrl());

    // Reload offer to take the new config into account
    offers.unload();
    await clearDB(offersDB);
    await offers.init();

    // Force call to /api/v1/categories
    await offers.categoryFetcher._performFetch();
  };

  describe('Freshtab offers', function () {
    let offerShown;
    let freshtabId;

    beforeEach(async function () {
      await mockOffersBackend();

      // Simulate location change, to trigger offers' expression evaluation.
      CliqzEvents.pub('content:location-change', {
        url: 'https://fake.url.com',
        windowTreeInformation: {
          tabId: 0,
        },
      });

      // Wait for Offers to hit the http server
      await waitForAsync(async () =>
        await testServer.hasHit('/api/v1/categories') &&
        await testServer.hasHit('/api/v1/loadsubtriggers') &&
        testServer.hasHit('/api/v1/offers')
      );
      // Load freshtab in new tab
      freshtabId = await newTab(freshtabUrl, true);

      // Expect offer to appear in notification box
      // offerShown = await waitForAsync(async () =>
      //   Boolean((await queryHTML(freshtabUrl, '.offer', 'innerText')).length) === true
      // );
      offerShown = await waitForElement({
        url: freshtabUrl,
        selector: '.offer',
        isPresent: true
      });

      allCampaigns = offers.signalsHandler.sigMap.campaign;
    });

    afterEach(async () => {
      // prefs.clear('triggersBE');
      offers.unload();
      await clearDB(offersDB);
      await testServer.reset();
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

      it('increments counter for "code_copied"', function () {
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['cliqz-tab'], 'code_copied')
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

      it('increments counters for: "offer_ca_action", "landing", "page_imp", "ref_none" and "offer_description"', async function () {
        await waitFor(() =>
          expect(allCampaigns)
            .to.have.nested.property('test_campaign_v1.data.offers.test_offer_v1.origins.trigger'), 1000);

        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['cliqz-tab'], 'offer_ca_action')
          .to.have.property('offer_ca_action').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.trigger, 'landing')
          .to.have.property('landing').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.trigger, 'page_imp')
          .to.have.property('page_imp').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.trigger, 'ref_none')
          .to.have.property('ref_none').to.equal(2);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['cliqz-tab'], 'offer_description')
          .to.have.property('offer_description').to.equal(1);
      });
    });

    describe('clicking on the CTA button', function () {
      beforeEach(async function () {
        await waitForElement({
          url: freshtabUrl,
          selector: 'a.cta-btn .cta-txt',
          isPresent: true
        });
        await click(freshtabUrl, 'a.cta-btn .cta-txt');
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

      it('increments counters for: "offer_ca_action", "landing", "page_imp" and "ref_none"', async function () {
        await waitFor(() =>
          expect(allCampaigns)
            .to.have.nested.property('test_campaign_v1.data.offers.test_offer_v1.origins.trigger'), 1000);

        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['cliqz-tab'], 'offer_ca_action')
          .to.have.property('offer_ca_action').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.trigger, 'landing')
          .to.have.property('landing').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.trigger, 'page_imp')
          .to.have.property('page_imp').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.trigger, 'ref_none')
          .to.have.property('ref_none').to.equal(2);
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

      it('increments counters for: "offer_benefit", "landing", "page_imp" and "ref_none"', async function () {
        await waitFor(() =>
          expect(allCampaigns)
            .to.have.nested.property('test_campaign_v1.data.offers.test_offer_v1.origins.trigger'), 1000);

        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['cliqz-tab'], 'offer_benefit')
          .to.have.property('offer_benefit').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.trigger, 'landing')
          .to.have.property('landing').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.trigger, 'page_imp')
          .to.have.property('page_imp').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.trigger, 'ref_none')
          .to.have.property('ref_none').to.equal(2);
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

      it('increments counters for: "offer_ca_action", "landing", "page_imp", "ref_none" and "offer_headline"', async function () {
        await waitFor(() =>
          expect(allCampaigns)
            .to.have.nested.property('test_campaign_v1.data.offers.test_offer_v1.origins.trigger'), 1000);

        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['cliqz-tab'], 'offer_ca_action')
          .to.have.property('offer_ca_action').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.trigger, 'landing')
          .to.have.property('landing').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.trigger, 'page_imp')
          .to.have.property('page_imp').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.trigger, 'ref_none')
          .to.have.property('ref_none').to.equal(2);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['cliqz-tab'], 'offer_headline')
          .to.have.property('offer_headline').to.equal(1);
      });
    });

    describe('clicking on the logo', function () {
      beforeEach(async function () {
        await waitForElement({
          url: freshtabUrl,
          selector: '.logo-container .logo-url',
          isPresent: true
        });
        await click(freshtabUrl, '.logo-container .logo-url');
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

      it('increments counters for: "offer_ca_action", "landing", "page_imp", "ref_none" and "offer_logo"', async function () {
        await waitFor(() =>
          expect(allCampaigns)
            .to.have.nested.property('test_campaign_v1.data.offers.test_offer_v1.origins.trigger'), 1000);

        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['cliqz-tab'], 'offer_ca_action')
          .to.have.property('offer_ca_action').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.trigger, 'landing')
          .to.have.property('landing').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.trigger, 'page_imp')
          .to.have.property('page_imp').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.trigger, 'ref_none')
          .to.have.property('ref_none').to.equal(2);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['cliqz-tab'], 'offer_logo')
          .to.have.property('offer_logo').to.equal(1);
      });
    });

    // TODO: rewrite these tests without needing to close extra freshtab
    describe('opening second instance of Freshtab', function () {
      beforeEach(async function () {
        await newTab(freshtabUrl, true);
        await waitFor(() => getAmountOfTabs() === 3);
      });

      it('displays the same offer again', async function () {
        // close first instance of freshtab, so we can use queryHTML
        closeTab(freshtabId);
        await waitFor(() => getAmountOfTabs() === 2);
        await waitForAsync(async () => (await queryHTML(freshtabUrl, '.headline .headline-url', 'innerText')).length === 1);

        const offerHeadlines = await queryHTML(freshtabUrl, '.headline .headline-url', 'innerText');
        expect(offerHeadlines[0]).to.equal('(Int-Test) Anmeldegebuhr');
      });

      it('sends a signal containing NOT incremented "offer_triggered" and "offer_pushed", and incremented values of "offer_dsp_session" and "offer_shown"', async function () {
        // close first instance of freshtab, so we can use queryHTML
        closeTab(freshtabId);
        await waitFor(() => getAmountOfTabs() === 2);
        await waitForAsync(async () => (await queryHTML(freshtabUrl, '.headline .headline-url', 'innerText')).length === 1);

        expect(
          allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.processor, 'offer_triggered')
          .to.have.property('offer_triggered').to.equal(1);
        expect(
          allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.processor, 'offer_pushed')
          .to.have.property('offer_pushed').to.equal(1);
        expect(
          allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['cliqz-tab'], 'offer_dsp_session')
          .to.have.property('offer_dsp_session').to.equal(2);
        expect(
          allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['cliqz-tab'], 'offer_shown')
          .to.have.property('offer_shown').to.equal(2);
      });
    });

    describe('opening another page and then moving focus back to the Freshtab instance', function () {
      beforeEach(async function () {
        await focusOnTab(freshtabId);

        const landingPageId = await newTab(getPage('landing'), true);
        await waitForAsync(async () =>
          Boolean((await queryHTML(getPage('landing'), 'p', 'innerText')).length) === true
        );
        await focusOnTab(landingPageId);

        await new Promise(r => setTimeout(r, 500));

        await focusOnTab(freshtabId);
      });

      it('increments counters for: "offer_shown"', async function () {
        await waitFor(() =>
          allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['cliqz-tab'].offer_shown > 1);

        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['cliqz-tab'], 'offer_shown')
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

      ['cart', 'payment', 'success']
        .forEach((signal) => {
          context(`${signal}`, function () {
            beforeEach(async function () {
              const page = getPage(`${signal}`);
              focusOnTab(await newTab(page, true));
              await waitForAsync(async () =>
                await queryHTML(page, 'p', 'innerText')[0] !== `${signal}`);
            });

            it(`increments counter for "${signal}"`, async function () {
              await waitForAsync(async () =>
                expect(allCampaigns).to.have.nested.property(
                  'test_campaign_v1.data.offers.test_offer_v1.origins.trigger'
                )
              );
              expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.trigger, `${signal}`)
                .to.have.property(`${signal}`).to.equal(1);
            });
          });
        });
    });

    describe('clicking on the offer close button', function () {
      beforeEach(async function () {
        await waitForElement({
          url: freshtabUrl,
          selector: '.notification .close',
          isPresent: true
        });
        await click(freshtabUrl, '.notification .close');
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
              'test_campaign_v1.data.offers.test_offer_v1.origins'
            ),
          1000
        );

        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins['cliqz-tab'], 'offer_removed')
          .to.have.property('offer_removed').to.equal(1);
        expect(allCampaigns.test_campaign_v1.data.offers.test_offer_v1.origins.processor, 'offer_db_removed')
          .to.have.property('offer_db_removed').to.equal(1);
      });
    });
  });
}
