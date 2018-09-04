export default {
  'offer-organic': {
    query: 'audible',
    results: [
      {
        title: 'Hörbücher Gratis im Probeabo von Audible.de',
        url: 'http://www.audible.de/',
        description: '',
        originalUrl: 'http://www.audible.de/',
        type: 'cliqz-extra',
        text: 'audible',
        data: {
          deepResults: [
            {
              type: 'buttons',
              links: [
                {
                  title: 'Englische Hörbücher',
                  url: 'http://www.audible.de/morecategories?titles=english'
                },
                {
                  title: 'Kinder-Hörbücher',
                  url: 'http://www.audible.de/cat/Kinder-Hoerbuecher-Hoerbuecher/656405031'
                },
                {
                  title: 'Thriller',
                  url: 'http://www.audible.de/cat/Thriller-Hoerbuecher/656448031'
                },
                {
                  title: 'Bildung & Wissen',
                  url: 'http://www.audible.de/cat/Bildung-Wissen-Hoerbuecher/656303031'
                },
                {
                  title: 'Comedy & Humor',
                  url: 'http://www.audible.de/cat/Comedy-Humor-Hoerbuecher/656313031'
                },
                {
                  title: 'Krimi',
                  url: 'http://www.audible.de/cat/Krimi-Hoerbuecher/656425031'
                },
                {
                  title: 'Science-Fiction',
                  url: 'http://www.audible.de/cat/Science-Fiction-Hoerbuecher/656436031'
                },
                {
                  title: 'Jugend-Hörbücher',
                  url: 'http://www.audible.de/cat/Jugend-Hoerbuecher-Hoerbuecher/656396031'
                },
                {
                  title: 'Fantasy',
                  url: 'http://www.audible.de/cat/Fantasy-Hoerbuecher/656378031'
                },
                {
                  title: 'Historische Romane',
                  url: 'http://www.audible.de/cat/Historische-Romane-Hoerbuecher/656392031'
                },
                {
                  title: 'Rufus Beck',
                  url: 'http://www.audible.de/search?searchNarrator=Rufus+Beck'
                },
                {
                  title: 'Sprachkurse',
                  url: 'http://www.audible.de/cat/Sprachkurse-Hoerbuecher/656441031'
                },
                {
                  title: 'Romane',
                  url: 'http://www.audible.de/cat/Romane-Hoerbuecher/656430031'
                },
                {
                  title: 'Klassiker',
                  url: 'http://www.audible.de/cat/Klassiker-Hoerbuecher/656420031'
                },
                {
                  title: 'Wirtschaft & Karriere',
                  url: 'http://www.audible.de/cat/Wirtschaft-Karriere-Hoerbuecher/656454031'
                },
                {
                  title: 'Freizeit & Leben',
                  url: 'http://www.audible.de/cat/Freizeit-Leben-Hoerbuecher/656385031'
                }
              ]
            }
          ],
          extra: {
            offers_data: {
              data: {
                action_info: {

                },
                campaign_id: 'HGL1',
                display_id: 'HGL1Dd2_D',
                filter_info: {

                },
                offer_id: 'HGL1Dd2',
                rs_dest: [
                  'dropdown'
                ],
                rule_info: {

                },
                ui_info: {

                }
              },
              description: 'Nur für Neukunden. Code eingeben, zwei Hörbucher aussuchen und anhören',
              is_injected: true,
              promo_code: 'MYOFFRZ17',
              thumbnail: 'http://cdn.cliqz.com/extension/rh-offers/Audible/image.png',
              title: 'Audible: 2 kostenlose Hörbücher von Audible.de - Nur für kurze Zeit',
              url_ad: 'http://www.audible.de/myoffrz'
            }
          },
          friendlyUrl: 'audible.de',
          title: 'Hörbücher Gratis im Probeabo von Audible.de',
          subType: {
            class: 'EntityGeneric',
            trigger_method: 'rh_query',
            ez: 'deprecated',
            i: 0,
            cs: 0
          },
          trigger_urls: [
            'audible.de'
          ],
          template: 'generic',
          kind: [
            'X|{"class":"EntityGeneric","trigger_method":"rh_query","ez":"deprecated","i":0,"cs":0}'
          ]
        },
        maxNumberOfSlots: 1
      }
    ]
  },
  'offer-non-organic': {
    query: 'https://www.youtube.com/user/audibletrailer',
    results: [
      {
        title: 'Audible: 2 kostenlose Hörbücher von Audible.de - Nur für kurze Zeit',
        url: 'http://www.audible.de/myoffrz',
        description: 'Nur für Neukunden. Code eingeben, zwei Hörbucher aussuchen und anhören',
        originalUrl: 'http://www.audible.de/myoffrz',
        type: 'cliqz-extra',
        text: 'https://www.youtube.com/user/audibletrailer',
        data: {
          description: 'Nur für Neukunden. Code eingeben, zwei Hörbucher aussuchen und anhören',
          extra: {
            is_ad: true,
            offers_data: {
              data: {
                action_info: {

                },
                campaign_id: 'HGL1',
                display_id: 'HGL1Dd2_D',
                filter_info: {

                },
                offer_id: 'HGL1Dd2',
                rs_dest: [
                  'dropdown'
                ],
                rule_info: {

                },
                ui_info: {

                }
              },
              promo_code: 'MYOFFRZ17',
              thumbnail: 'http://cdn.cliqz.com/extension/rh-offers/Audible/image.png'
            }
          },
          friendlyUrl: 'audible.de/myoffrz',
          title: 'Audible: 2 kostenlose Hörbücher von Audible.de - Nur für kurze Zeit',
          subType: {
            class: 'EntityKPI',
            trigger_method: 'rh_query',
            ez: 'deprecated',
            i: 1,
            cs: 0
          },
          template: 'offer',
          kind: [
            'X|{"class":"EntityKPI","trigger_method":"rh_query","ez":"deprecated","i":1,"cs":0}'
          ],
          deepResults: [

          ]
        },
        maxNumberOfSlots: 1
      }
    ]
  }
};
