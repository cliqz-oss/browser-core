export default {
  offers: [
    {
      snippet: {
        description: 'Nur für Neukunden. Code eingeben, zwei Hörbucher aussuchen und anhören',
        extra: {
          has_injection: true,
          injected_ids: {
            'audible-test.de': {
              type: 'domain'
            },
            'https://www.audible-test.de': {
              type: 'full_url'
            }
          },
          is_ad: true,
          is_attachable: true,
          offers_data: {
            data: {
              action_info: {},
              campaign_id: 'HCar_test_campaign',
              display_id: 'HCar_test_id',
              filter_info: {},
              monitorData: [
                {
                  params: {
                    filter_last_secs: 5,
                    referrer_cat: true,
                    store: false
                  },
                  patterns: [
                    '||audible-test.de*/ref=cart_cmplt_prchs_tl_mem'
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
                    '||audible-test.de*?cartaction=confirmpurchase\u0026appaction=audibleaction'
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
                    '||audible-test.de'
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
                    '||audible-test.de*/probeabo_pm_04'
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
                    '||audible-test.de/mycart'
                  ],
                  signalID: 'cart',
                  type: 'urlchange'
                }
              ],
              offer_id: 'HCar_test_offer',
              rs_dest: ['dropdown'],
              rule_info: {},
              ui_info: { template_data: { validity: Date.now() + 1000 * 60 * 60 * 24 } }
            },
            description: 'Nur für Neukunden. Code eingeben, zwei Hörbucher aussuchen und anhören',
            promo_code: 'nicht benötigt',
            thumbnail: 'http://cdn.cliqz.com/extension/rh-offers/Audible/74/image.png',
            title: 'Audible: 2 kostenlose Hörbücher von audible-test.de - Nur für kurze Zeit',
            url_ad: 'https://audible-test.de/myoffrz'
          },
          target_url: 'http://www.audible-test.de/',
          url_ad: 'https://audible-test.de/myoffrz'
        },
        friendlyUrl: 'audible-test.de/myoffrz',
        title: 'Audible: 2 kostenlose Hörbücher von audible-test.de - Nur für kurze Zeit'
      },
      subType: {
        class: 'EntityKPI',
        id: '7685102676036617694',
        name: 'attached:Audible'
      },
      template: 'offer',
      trigger: [],
      trigger_method: 'url',
      type: 'rh',
      url: 'https://audible-test.de/myoffrz'
    }
  ],
  q: 'audib',
  results: [
    {
      url: 'https://audible-test.de/myoffrz',
      score: 0,
      snippet: {
        description: 'Nur für Neukunden. Code eingeben, zwei Hörbucher aussuchen und anhören',
        extra: {
          has_injection: true,
          injected_ids: {
            'audible-test.de': { type: 'domain' },
            'https://www.audible-test.de': { type: 'full_url' }
          },
          is_ad: true,
          is_attachable: true,
          offers_data: {
            data: {
              action_info: {},
              campaign_id: 'HCar_test_campaign',
              display_id: 'HCar_test_id',
              filter_info: {},
              monitorData: [
                {
                  params: {
                    filter_last_secs: 5,
                    referrer_cat: true,
                    store: false
                  },
                  patterns: [
                    '||audible-test.de*/ref=cart_cmplt_prchs_tl_mem'
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
                    '||audible-test.de*?cartaction=confirmpurchase\u0026appaction=audibleaction'
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
                    '||audible-test.de'
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
                    '||audible-test.de*/probeabo_pm_04'
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
                    '||audible-test.de/mycart'
                  ],
                  signalID: 'cart',
                  type: 'urlchange'
                }
              ],
              offer_id: 'HCar_test_offer',
              rs_dest: ['dropdown'],
              rule_info: {},
              ui_info: {}
            },
            description: 'Nur für Neukunden. Code eingeben, zwei Hörbucher aussuchen und anhören',
            promo_code: 'nicht benötigt',
            thumbnail: 'https://imgr.cliqz.com/iGvnBEHWtslOyh2qG3_GbUzOS6cJ2oK_CsAAqtROXw0/fill/0/200/no/1/aHR0cDovL2Nkbi5jbGlxei5jb20vZXh0ZW5zaW9uL3JoLW9mZmVycy9BdWRpYmxlLzc0L2ltYWdlLnBuZw.png',
            title: 'Audible: 2 kostenlose Hörbücher von audible-test.de - Nur für kurze Zeit',
            url_ad: 'https://audible-test.de/myoffrz'
          },
          target_url: 'http://www.audible-test.de/',
          url_ad: 'https://audible-test.de/myoffrz'
        },
        friendlyUrl: 'audible-test.de/myoffrz',
        title: 'Audible: 2 kostenlose Hörbücher von audible-test.de - Nur für kurze Zeit'
      },
      type: 'rh',
      subType: {
        class: 'EntityKPI',
        id: '7685102676036617694',
        name: 'attached:Audible'
      },
      template: 'offer',
      trigger_method: 'url'
    },
    {
      url: 'http://www.audible-test.de/',
      score: 1118,
      snippet: {
        description: 'Hörbücher \u0026 Hörspiele zum Download ✓Unbegrenzt Original Podcasts hören ✓Über 250.000 Titel ✓Immer und überall hören ✓Bei Nichtgefallen jeden Titel einfach umtauschen ✓Jederzeit kündbar ✓1. Hörbuch gratis ✓Jetzt 30 Tage kostenlos testen ▻ audible-test.de',
        extra: {
          alternatives: [],
          language: {
            de: 0.9800000190734863
          },
          m_url: 'https://mobile.audible-test.de'
        },
        title: 'Hörbücher, Hörspiele \u0026 mehr'
      },
      c_url: 'http://www.audible-test.de/',
      similars: [
        'http://www.audible-test.com/',
        'https://www.audible-test.de/sw'
      ],
      type: 'bm'
    },
  ],
};
