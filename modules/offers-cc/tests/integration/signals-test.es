import {
  app,
  clearDB,
  CliqzEvents,
  expect,
  newTab,
  press,
  testServer,
  waitFor,
  waitForAsync,
  win
} from '../../../tests/core/test-helpers';
import { getLocalisedString } from '../../../tests/core/integration/helpers';

const offers = app.modules['offers-v2'];

function getMainPage() {
  return `http://cliqztest.com:${testServer.port}`;
}

function getPage(url) {
  return `${getMainPage()}/integration_tests/${url}`;
}

const triggerKeyword = 'abcdefg';

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

const apiCategoriesMock = JSON.stringify({
  categories: [
    {
      name: 'tempcat_Sparbonus.com_RewardBox_200€AmazonGiftCard_TG1',
      timeRangeSecs: 900,
      patterns: [
        `${triggerKeyword}$fuzzy,domain=cliqztest.com:${testServer.port}`,
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
    condition: [
      '$is_category_active',
      [
        {
          catName: 'tempcat_Sparbonus.com_RewardBox_200€AmazonGiftCard_TG1',
        }
      ]
    ],
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

const apiOffersMock = {
  offer_id: 'test_offer_v1',
  campaign_id: 'test_campaign_v1',
  display_id: 'test_campaign_v1-d',
  types: [
    'test_campaign_v1'
  ],
  rs_dest: [
    'offers-cc'
  ],
  version: '123123123123123',
  monitorData: [],
  ui_info: {
    created: 1514984136299,
    state: 'new',
    template_name: "Doesn't matter",
    template_data: {
      benefit: '2x',
      call_to_action: {
        target: '',
        text: 'Zum Angebot',
        url: 'https://www.silkes-weinkeller.de/?utm_source=Referrer&utm_medium=Cliqz&utm_campaign=11Prozent&utm_term=OffrzTab&utm_content=11Prozent&gutscheinid=cLsWk17&bannerid=Overlay'
      },
      code: 'cLsWk17',
      conditions: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Tenetur, architecto, explicabo perferendis nostrum, maxime impedit atque odit sunt pariatur illo obcaecati soluta molestias iure facere dolorum adipisci eum? Saepe, itaque.',
      desc: 'Genießen Sie die besten Weine aus Spanien, Italien und aus aller Welt. Jetzt Angebot sichern!',
      headline: 'Kostenlose Horbucher',
      logo_url: '/build/cliqz@cliqz.com/chrome/content/offers-cc/debug/images/audible.png',
      voucher_classes: '',
      labels: [
        'exclusive',
        'best_offer',
      ],
    },
    offer_id: 'SilkesWK_TG1_O1_V1',
    logoClass: 'normal',
    backgroundColor: '#d7011d',
    validity: {
      text: 'Expires in 3 days',
      isExpiredSoon: false,
    },
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
};

function getApiOffersMock() {
  return JSON.stringify([apiOffersMock]);
}

const mockOffersBackend = async () => {
  // Register mocked paths for offers
  await Promise.all([
    testServer.registerPathHandler('/api/v1/categories', apiCategoriesMock),
    testServer.registerPathHandler('/api/v1/loadsubtriggers', apiLoadSubTriggersMock),
    testServer.registerPathHandler('/api/v1/offers', getApiOffersMock()),
    testServer.registerPathHandler('/integration_tests/landing', '<html><body><p>Hello world</p></body></html>'),
  ]);

  // Configure offers to use our local http server
  app.config.settings.OFFERS_BE_BASE_URL = testServer.getBaseUrl();

  // Reload offer to take the new config into account
  offers.background.unload();
  await clearDB(offersDB);
  await offers.background.init();

  // Force call to /api/v1/categories
  await offers.background.categoryFetcher._performFetch();
};

const getBlueNotificationPopup = () => win.document.querySelector('#offers-cc-browser-action-iframe').contentWindow.document;

export default function () {
  describe('offers-cc offers UI', function () {
    beforeEach(async function () {
      await mockOffersBackend();

      // Simulate location change, to trigger offers' expression evaluation.
      CliqzEvents.pub('content:location-change', {
        url: 'https://fake.url.com',
        windowTreeInformation: {
          tabId: 0,
        },
      });

      await waitForAsync(() => testServer.hasHit('/api/v1/categories'));
      await waitForAsync(() => testServer.hasHit('/api/v1/loadsubtriggers'));
    });

    afterEach(function () {
      offers.background.unload();
    });

    context('triggering an offer', function () {
      const tooltipSelector = '#cliqz-offers-cc #cqz-offer-cc-content';

      beforeEach(async function () {
        await newTab(getPage(`landing?q=${triggerKeyword}`), true);
        await waitForAsync(() => testServer.hasHit('/api/v1/offers'), 50);

        await waitFor(
          () =>
            expect(getBlueNotificationPopup().querySelector(tooltipSelector).classList.contains('tooltip'))
              .to.be.true,
          1000);
      });

      it('shows a blue notification popup with correct text', function () {
        expect(getBlueNotificationPopup().querySelector(tooltipSelector))
          .to.contain.text('You have a new offer');
      });

      context('clicking on the blue notification', function () {
        beforeEach(function () {
          getBlueNotificationPopup().querySelector(tooltipSelector).click();
        });

        afterEach(async function () {
          press({
            key: 'Escape'
          });
          await waitFor(
            () =>
              expect(win.document.querySelector('#offers-cc-browser-action-iframe'))
                .to.not.exist,
            1000);
        });

        it('closes the blue notification', async function () {
          await waitFor(
            () =>
              expect(getBlueNotificationPopup().querySelector(tooltipSelector).classList.contains('tooltip'))
                .to.be.false);
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
          const feedbackButtonSelector = '#feedback-button';

          const $offer = win.document
            .querySelector('#offers-cc-browser-action-iframe').contentWindow.document
            .querySelector('#cliqz-offers-cc');

          await waitFor(() => expect($offer).to.exist, 1000);
          await waitFor(() => expect($offer.querySelector(`${labelSelector} ${exclusiveLabelSelector}`), 'Exclusive label', 1000).to.exist);
          expect($offer.querySelector(`${labelSelector} ${exclusiveLabelSelector}`))
            .to.have.text('Exclusive');

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

          expect($bestLabel, 'Best offer label').to.exist;
          expect($bestLabel).to.have.text('Best offer');

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
        });
      });
    });
  });
}
