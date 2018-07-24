export default {
  results: [
    {
      url: 'https://www.billiger-mietwagen.de/',
      snippet: {
        title: 'Spielen - Kostenlose Spiele Spielen',
        description: 'Kostenlose Spiele spielen, Kartenspiele, Puzzlespiele, Wortspiele, Actionspiele, Brettspiele, Sportspiele, Denkspiele, Strategiespiele und Flashspiele bei Royalgames.com.',
      },
      type: 'bm',
      subType: {
        id: '-896719192706179186',
        name: 'CarRentalAd',
        class: 'EntityKPI'
      }
    }
  ],
  offers: [
    {
      url: 'https://www.mietwagen-happycar.de',
      trigger_method: 'url',
      snippet: {
        title: 'Mietwagen und Autovermietung im Preisvergleich | HAPPYCAR',
        friendlyUrl: 'happycar.de',
        description: 'Sparen Sie bis zu 60% bei der Buchung mit unserem Vergleichsportal!',
        extra: {
          url_ad: 'https://www.mietwagen-happycar.de/?utm_source=cliqz&utm_medium=referral&utm_campaign=Cliqz_Camp1&utm_content=drpdwn',
          offers_data: {
            data: {
              display_id: 'HCarTG9O2_D',
              rule_info: {},
              ui_info: {
                template_data: {
                  validity: (Date.now() * 1000) + 1
                }
              },
              filter_info: {},
              campaign_id: 'HCar',
              action_info: {},
              rs_dest: [
                'dropdown'
              ],
              offer_id: 'HCar_TG9_O2_V1',
              monitorData: [
                {
                  params: {
                    filter_last_secs: 5,
                    referrer_cat: true,
                    store: false
                  },
                  patterns: [
                    '||billiger-mietwagen.de/booking-personaldata-new.php'
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
                    '||billiger-mietwagen.de'
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
                    '||billiger-mietwagen.de*?utm_source=myoffrz*\u0026utm_campaign=ghostery'
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
                    '||billiger-mietwagen.de/booking-personaldata-new.php'
                  ],
                  signalID: 'cart',
                  type: 'urlchange'
                }
              ]
            },
            promo_code: 'nicht benötigt',
            thumbnail: 'http://cdn.cliqz.com/extension/rh-offers/CarRentalAd/74/image.png'
          },
          is_ad: true,
          injected_ids: {}
        }
      },
      subType: {
        id: '-896719192706179186',
        name: 'CarRentalAd',
        class: 'EntityKPI'
      },
      trigger: [],
      template: 'offer',
      type: 'rh'
    }
  ]
};
