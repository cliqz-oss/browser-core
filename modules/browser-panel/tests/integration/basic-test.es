import {
  app,
  win,
  expect,
  focusOnTab,
  waitFor,
  waitForAsync,
  CliqzEvents,
  testServer,
  clearDB,
  newTab
} from '../../../tests/core/test-helpers';
import prefs from '../../../core/prefs';
import { PANEL_STATE_PREF_NAME } from '../../../browser-panel/consts';

const offers = app.modules['offers-v2'];
const browserPanel = app.modules['browser-panel'];

function getMainPage() {
  return `http://cliqztest.com:${testServer.port}`;
}

function getPage(url) {
  return `${getMainPage()}/integration_tests/${url}`;
}

const triggerKeyword = 'abcdefg';
const promoCode = 'asdflkasflkhnlqwe';

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
    'condition': [
      '$is_category_active',
      [
        {
          'catName': 'tempcat_Sparbonus.com_RewardBox_200€AmazonGiftCard_TG1',
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
        'browser-panel'
      ],
      version: '123123123123123',
      monitorData: [
      ],
      ui_info: {
        styles: {
          'call-to-action-bg-color': '#e741',
          'call-to-action-color': '#fff'
        },
        template_data: {
          voucher_classes: '',
          logo_class: 'normal',
          titleColor: '#56a699',
          title: 'Rindfleischetikettierungsüberwachungsaufgabenübertragungsgesetz für Online Supermarket Lieferservice gutschein für Online Supermarket Lieferservice',
          desc: 'Genießen Sie die besten Weine aus Spanien, Italien und aus aller Welt. Jetzt Angebot sichern! Genießen Sie die besten Weine aus Spanien, Italien und aus aller Welt. Jetzt Angebot sichern!',
          logo_url: './debug/images/ticket-tmpl/normal.png',
          picture_url: './debug/images/ticket-tmpl/rewe-picture.jpg',
          conditions: 'Maßgeblich für die Inanspruchnahme des Gutscheins ist das Datum der Lieferung, nicht der Bestellung. Der Gutschein gilt nur für einen Online-Einkauf beim REWE Lieferservice und ist nicht beim REWE Abholservice oder im REWE Markt einlösbar. Der Gutschein ist nur bei einem Mindestrechnungsbetrag von 70 € einlösbar; vom Mindestrechnungsbetrag sind Druckwaren (bspw. Bücher, Zeitungen, Zeitschriften), Tabakwaren, aufladbare Geschenk- und Guthabenkarten (z. B. iTunes-Karten), Tchibo-Artikel, Zuzahlungen für Treuepunkt-Artikel, Pfand, Sperrgutaufschlag und Servicegebühren (bspw. Liefergebühren) abzuziehen. Jeder Gutschein gilt nur für den einmaligen Gebrauch und verliert danach seine Gültigkeit. Es ist nur ein REWE Lieferservice-Gutschein pro Bestellung einlösbar; andere Gutscheine, wie z. B. LAVIVA- und PAYBACK Papiercoupons und eCoupons, können zusätzlich eingelöst werden. Gutscheine müssen am Ende des Bestellvorgangs eingegeben werden. Der gutgeschriebene Betrag wird nicht im Bestellvorgang angezeigt, sondern erst nach Abschluss des Bestellvorgangs in der übersandten Rechnung. Keine Barauszahlung möglich.',
          code: promoCode,
          call_to_action: {
            url: 'http://newurl',
            target: '',
            text: 'Jetztz bestellen'
          },
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

const mockOffersBackend = async () => {
  // Register mocked paths for offers
  await Promise.all([
    testServer.registerPathHandler('/api/v1/categories', apiCategoriesMock),
    testServer.registerPathHandler('/api/v1/loadsubtriggers', apiLoadSubTriggersMock),
    testServer.registerPathHandler('/api/v1/offers', getApiOffersMock()),
    testServer.registerPathHandler('/integration_tests/landing', '<html><body><p>Hello world</p></body></html>'),
  ]);

  // Configure offers to use our local http server
  prefs.set('triggersBE', testServer.getBaseUrl());

  // Reload offer to take the new config into account
  offers.background.unload();
  await clearDB(offersDB);
  await offers.background.init();

  // Force call to /api/v1/categories
  await offers.background.categoryFetcher._performFetch();
};

const getPanelDocument = () => win.document.querySelector('#cqz-b-p-iframe').contentWindow.document;

export default function () {
  describe('browser-panel', function () {
    before(async function () {
      browserPanel.background.unload();
      prefs.set(PANEL_STATE_PREF_NAME, true);
      await browserPanel.background.init();
      await browserPanel.getWindowLoadingPromise(win);
    });

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
      // prefs.clear('triggersBE');
      offers.background.unload();
    });

    it('opens on valid trigger', async function () {
      const tabId = await newTab(getPage(`landing?q=${triggerKeyword}`), true);
      await focusOnTab(tabId);
      await waitForAsync(() => testServer.hasHit('/api/v1/offers'), 50);
      await waitFor(
        () => expect(getPanelDocument().querySelector('.code')).to.have.property('innerText').that.equals(promoCode),
        1000,
      );
    });
  });
}
