import prefs from '../../../core/prefs';
import { isWebExtension } from '../../../core/platform';
import config from '../../../core/config';

import {
  app,
  clearDB,
  testServer,
  win,
} from '../test-helpers';

export const triggerKeyword = 'abcdefg';
export const promoCode = 'asdflkasflkhnlqwe';

function getMainPage() {
  return `http://cliqztest.com:${testServer.port}`;
}

export function getPage(url) {
  return `${getMainPage()}/integration_tests/${url}`;
}

export const getPanelDocument = () => win.document.querySelector('#cqz-b-p-iframe').contentWindow.document;

export const offersDB = [
  'offers-signals-url',
  'offers-last-cmp-signals',
  'cliqz-categories-data',
  'cliqz-categories-patterns',
  'cliqz-offers-intent-db',
  'cliqz-intent-offers-db',
  'offers-db-index',
  'offers-db-display-index',
  '_pouch_cliqz-offers',
  'cliqz-offers'
];

function getApiCategoriesMock() {
  return JSON.stringify({
    categories: [
      {
        name: 'tempcat_Sparbonus.com_RewardBox_200€AmazonGiftCard_TG1',
        timeRangeSecs: 900,
        patterns: [
          `${triggerKeyword}$fuzzy,domain=cliqztest.com`,
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
}

const now = Date.now();

function getRawApiLoadSubTriggersMock() {
  return {
    trigger_uid: '1212121212121212121212',
    campaign_id: 'test_campaign_v1',
    parent_trigger_ids: [
      'root'
    ],
    trigger_id: 'test_campaign_v1_triggering',
    version: 20,
    validity: [
      1524528023,
      now - 1
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
  };
}

function getApiLoadSubTriggersMock({ dest }) {
  const mock = getRawApiLoadSubTriggersMock();

  if (dest === 'browser-panel') {
    mock.condition = [
      '$is_category_active',
      [
        {
          catName: 'tempcat_Sparbonus.com_RewardBox_200€AmazonGiftCard_TG1',
        }
      ]
    ];
  }
  return JSON.stringify([mock]);
}

function getRawApiOffersMock({ timeout = 7 } = {}) {
  return {
    offer_id: 'test_offer_v1',
    campaign_id: 'test_campaign_v1',
    display_id: 'test_campaign_v1-d',
    types: ['test_campaign_v1'],
    version: '123123123123123',
    targeted: true,
    categories: [
      'tempcat_Sparbonus.com_RewardBox_200€AmazonGiftCard_TG1'
    ],
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
    displayPriority: 1,
    rule_info: {
      display_time_secs: timeout,
      type: 'exact_match',
      url: []
    },
    filterRules: {
      eval_expression: "generic_comparator('offer_pushed','counter','<=',0)"
    },
    expirationMs: 624789
  };
}

export function getApiOffersMock({ dest, timeout }) {
  const mock = getRawApiOffersMock({ timeout });
  mock.rs_dest = [dest];

  if (dest === 'browser-panel') {
    mock.ui_info = {
      styles: {
        'call-to-action-bg-color': '#e741',
        'call-to-action-color': '#fff'
      },
      template_data: {
        voucher_classes: '',
        logo_class: 'normal',
        titleColor: '#56a699',
        title: 'title-test',
        headline: 'Gutschein test',
        desc: 'Genießen Sie die besten Weine aus Spanien, Italien und aus aller Welt.',
        benefit: '11%',
        logo_url: './debug/images/ticket-tmpl/normal.png',
        picture_url: './debug/images/ticket-tmpl/rewe-picture.jpg',
        conditions: 'conditions-test',
        code: promoCode,
        call_to_action: {
          url: getPage('landing'),
          target: '',
          text: 'Jetztz bestellen'
        },
        validity: (now * 1000) + 1
      },
      template_name: 'ticket_template',
    };
  } else if (dest === 'cliqz-tab') {
    mock.ui_info = {
      styles: {
        'call-to-action-bg-color': '#e741',
        'call-to-action-color': '#fff'
      },
      template_data: {
        labels: [
          'best_offer',
          'exclusive'
        ],
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
        validity: (now * 1000) + 1
      },
      template_name: 'ticket_template'
    };
  } else if (dest === 'offers-cc') {
    const path = `/${config.testsBasePath}/offers-cc/debug/images/audible.png`;
    mock.ui_info = {
      notif_type: isWebExtension ? 'pop-up' : 'tooltip',
      created: 1514984136299,
      template_data: {
        benefit: '2x',
        call_to_action: {
          target: '',
          text: 'Zum Angebot',
          url: getPage('landing'),
        },
        code: 'cLsWk17',
        conditions: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Tenetur, architecto, explicabo perferendis nostrum, maxime impedit atque odit sunt pariatur illo obcaecati soluta molestias iure facere dolorum adipisci eum? Saepe, itaque.',
        desc: 'Genießen Sie die besten Weine aus Spanien, Italien und aus aller Welt. Jetzt Angebot sichern!',
        headline: 'Kostenlose Horbucher',
        logo_url: path,
        voucher_classes: '',
        labels: [
          'exclusive',
          'best_offer',
        ],
      },
      offer_id: 'SilkesWK_TG1_O1_V1',
      logoClass: 'normal',
      backgroundColor: '#d7011d',
      validity: (now * 1000) + 1
    };
  }

  return JSON.stringify([mock]);
}


export const clearOffersDB = () => clearDB(offersDB);


export const mockOffersBackend = async ({ dest, timeout } = {}) => {
  const noCacheHeaders = [
    { name: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
    { name: 'Pragma', value: 'no-cache' },
    { name: 'Expires', value: '0' },
  ];

  // Configure offers to use our local http server
  app.modules['offers-v2'].background.configureFlags({
    triggersBE: testServer.getBaseUrl(),
  });

  prefs.set('offersInstallInfo', `${app.version}|1`);

  // Clear state
  await app.disableModule('offers-v2');

  if (dest === 'cliqz-tab') {
    await app.disableModule('message-center');
    await app.disableModule('freshtab');
  }

  if (dest === 'browser-panel') {
    if (isWebExtension) { await app.disableModule('offers-banner'); }
    await app.disableModule('browser-panel');
  }

  if (dest === 'offers-cc') {
    if (isWebExtension) { await app.disableModule('offers-banner'); }
    await app.disableModule('offers-cc');
  }

  await clearOffersDB();

  // Register mocked paths for offers
  await Promise.all([
    testServer.registerPathHandler('/api/v1/categories', { result: getApiCategoriesMock(), headers: noCacheHeaders }),
    testServer.registerPathHandler('/api/v1/loadsubtriggers', { result: getApiLoadSubTriggersMock({ dest }), headers: noCacheHeaders }),
    testServer.registerPathHandler('/api/v1/offers', { result: getApiOffersMock({ dest, timeout }), headers: noCacheHeaders }),
    testServer.registerPathHandler('/api/v1/savesignal', { result: JSON.stringify({}), headers: noCacheHeaders }),
    testServer.registerPathHandler('/integration_tests/landing', { result: '<html><body><p>Hello world</p></body></html>', headers: noCacheHeaders }),
    testServer.registerPathHandler('/integration_tests/cart', { result: '<html><body><p>cart</p></body></html>', headers: noCacheHeaders }),
    testServer.registerPathHandler('/integration_tests/payment', { result: '<html><body><p>payment</p></body></html>', headers: noCacheHeaders }),
    testServer.registerPathHandler('/integration_tests/success', { result: '<html><body><p>success</p></body></html>', headers: noCacheHeaders }),
  ]);

  // Reload offer to take the new config into account
  await app.enableModule('offers-v2');

  if (dest === 'cliqz-tab') {
    await app.enableModule('message-center');
    await app.enableModule('freshtab');
  }

  if (dest === 'browser-panel') {
    if (isWebExtension) {
      await app.enableModule('offers-banner');
    } else {
      await app.enableModule('browser-panel');
    }
  }

  if (dest === 'offers-cc') {
    if (isWebExtension) {
      await app.enableModule('offers-banner');
    } else {
      await app.enableModule('offers-cc');
    }
  }

  // Force call to /api/v1/categories
  await app.modules['offers-v2'].background.categoryFetcher._performFetch();
};
