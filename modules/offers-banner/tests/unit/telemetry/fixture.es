// The data for the constants `RAW_RESULT` and `CURRENT_RESULTS` is
// taken from a live system. `CURRENT_RESULTS` consists of 6 entries
// for the query "fla". 2nd and 5th entries are offers. `RAW_RESULT`
// is a click on 5th entry (an offer for hse24).
// `CURRENT_RESULTS_ONLY_HSE_OFFER` is the last 3 entries of `CURRENT_RESULTS`.

const HSE_OFFER = {
  action_info: {},
  campaign_id: '5c6e66806d48b8000191d386',
  display_id: '5c6e66806d48b8000191d386_5c88ceddcd3f4941f002e719_5c6e70986d48b8000191d3d7_5c88ceddcd3f4941f002e71a_D',
  filter_info: {},
  monitorData:
    [{
      params: { filter_last_secs: 5, referrer_cat: true, store: false },
      patterns: ['||hse24.de/basket$script'],
      signalID: 'cart',
      type: 'urlchange',
    },
    {
      params: { filter_last_secs: 5, referrer_cat: true, store: false },
      patterns:
        ['||hse24.de*&refid=pn/1058/klick&emsrc=affiliate*&nfxsid$script'],
      signalID: 'landing',
      type: 'urlchange',
    },
    {
      params: { filter_last_secs: 5, referrer_cat: true, store: false },
      patterns: ['||hse24.de$script'],
      signalID: 'page_imp',
      type: 'urlchange',
    },
    {
      params: { filter_last_secs: 5, referrer_cat: true, store: false },
      patterns: ['||hse24.de/checkout/payment$script'],
      signalID: 'payment',
      type: 'urlchange',
    },
    {
      params: { filter_last_secs: 5, referrer_cat: true, store: false },
      patterns: ['||hse24.de/checkout/confirmation*?orderid$script'],
      signalID: 'success',
      type: 'urlchange',
    },
    {
      couponInfo: { autoFillField: true },
      params: { filter_last_secs: 5, referrer_cat: true, store: false },
      patterns: ['||hse24.de/checkout/payment$script'],
      signalID: '_coupon_',
      type: 'coupon',
    }],
  offer_id: '5c6e66806d48b8000191d386_5c88ceddcd3f4941f002e719_5c6e70986d48b8000191d3d7_5c88ceddcd3f4941f002e71a',
  rs_dest: ['dropdown'],
  rule_info: {},
  ui_info: {},
};

const RAW_RESULT = {
  data:
    {
      deepResults: [],
      extra:
        {
          injected_ids: {},
          is_ad: true,
          landing_domain: 'hse24.de*&refid=pn',
          offers_data:
            {
              data: HSE_OFFER,
              description: 'Entdecken Sie die Produktvielfalt und sparen Sie bei Ihrem nächsten Einkauf.',
              promo_code: 'Nach dem Klick',
              thumbnail: 'https://placeholdervalueforquicksearch.com',
              title: '15€ Rabatt auf ALLES bei HSE24.de',
              url_ad: 'https://www.hse24.de/?mkt=AFK_pn&refID=pn/1058/Klick&emsrc=affiliate&destination=classic&nfxsid=&myoffrz',
            },
          url_ad: 'https://www.hse24.de/?mkt=AFK_pn&refID=pn/1058/Klick&emsrc=affiliate&destination=classic&nfxsid=&myoffrz',
        },
      kind: ['X|{"class":"EntityOffers"}'],
      template: 'offer',
    },
  url: 'https://www.hse24.de/?mkt=AFK_pn&refID=pn/1058/Klick&emsrc=affiliate&destination=classic&nfxsid=&myoffrz',
  href: 'https://www.hse24.de/?mkt=AFK_pn&refID=pn/1058/Klick&emsrc=affiliate&destination=classic&nfxsid=&myoffrz',
  friendlyUrl: 'hse24.de',
  title: '15€ Rabatt auf ALLES bei HSE24.de',
  description: 'Entdecken Sie die Produktvielfalt und sparen Sie bei Ihrem nächsten Einkauf.',
  kind: ['X|{"class":"EntityOffers"}'],
  provider: 'cliqz::offers',
  template: 'offer',
  text: 'fla',
  type: 'rh',
  meta:
    {
      level: 0,
      type: 'main',
      triggerMethod: 'partial_url',
      domain: 'hse24.de',
      host: 'hse24.de',
      hostAndPort: 'hse24.de',
      port: '',
      url: 'hse24.de/?mkt=AFK_pn&refID=pn/1058/Klick&emsrc=affiliate&destination=classic&nfxsid=&myoffrz',
      subType:
        {
          class: 'EntityOffers',
          id: '865275795bc11eb1f02c75013bff9e0aad8d4e19553a00eaf96f171e3b3fe99a',
          name: '05974d0b69fa4d5d92cb1e941b917d8c_urls\n1db8823c57854365984c4cf959b3f7cf_urls\n\n5c6e66806d48b8000191d386_triggering\n5c77a9806d48b8000191db41_triggering',
        },
      completion: '',
      logo:
        {
          backgroundColor: 'f97136',
          backgroundImage: 'url(https://cdn.cliqz.com/brands-database/database/1521469421408/logos/hse24/$.svg)',
          text: 'hs',
          color: '#fff',
          brandTxtColor: 'f97136',
          buttonsClass: 'cliqz-brands-button-2',
          style: 'background-color: #f97136;color:#fff;background-image:url(https://cdn.cliqz.com/brands-database/database/1521469421408/logos/hse24/$.svg); text-indent: -10em;',
        },
      extraLogos: {},
      externalProvidersLogos:
        {
          kicker:
            {
              backgroundColor: 'd7011d',
              backgroundImage: 'url(https://cdn.cliqz.com/brands-database/database/1521469421408/logos/kicker/$.svg)',
              text: 'ki',
              color: '#fff',
              brandTxtColor: 'd7011d',
              buttonsClass: 'cliqz-brands-button-1',
              style: 'background-color: #d7011d;color:#fff;background-image:url(https://cdn.cliqz.com/brands-database/database/1521469421408/logos/kicker/$.svg); text-indent: -10em;',
            },
        },
    },
  query: 'fla',
  index: 4,
  isBookmark: false,
  historyUrl: 'https://www.hse24.de/?mkt=AFK_pn&refID=pn/1058/Klick&emsrc=affiliate&destination=classic&nfxsid=&myoffrz',
  subResult: {},
};

const CURRENT_RESULTS = [{
  url: 'https://www.google.com/search?client=firefox-b&q=fla',
  href: 'https://www.google.com/search?client=firefox-b&q=fla',
  friendlyUrl: 'google.com/search?client=firefox-b&q=fla',
  kind: ['custom-search'],
  provider: 'instant',
  suggestion: 'fla',
  text: 'fla',
  type: 'supplementary-search',
  meta:
    {
      level: 0,
      type: 'main',
      domain: 'google.com',
      host: 'google.com',
      hostAndPort: 'google.com',
      port: '',
      url: 'google.com/search?client=firefox-b&q=fla',
      subType: {},
      logo:
        {
          backgroundColor: '5ea3f9',
          backgroundImage: 'url(https://cdn.cliqz.com/brands-database/database/1521469421408/logos/google/$.svg)',
          text: 'go',
          color: '#fff',
          brandTxtColor: '5ea3f9',
          buttonsClass: 'cliqz-brands-button-6',
          style: 'background-color: #5ea3f9;color:#fff;background-image:url(https://cdn.cliqz.com/brands-database/database/1521469421408/logos/google/$.svg); text-indent: -10em;',
        },
      extraLogos: {},
      externalProvidersLogos:
        {
          kicker:
            {
              backgroundColor: 'd7011d',
              backgroundImage: 'url(https://cdn.cliqz.com/brands-database/database/1521469421408/logos/kicker/$.svg)',
              text: 'ki',
              color: '#fff',
              brandTxtColor: 'd7011d',
              buttonsClass: 'cliqz-brands-button-1',
              style: 'background-color: #d7011d;color:#fff;background-image:url(https://cdn.cliqz.com/brands-database/database/1521469421408/logos/kicker/$.svg); text-indent: -10em;',
            },
        },
    },
  data:
    {
      deepResults: [],
      extra:
        {
          mozActionUrl: 'https://www.google.com/search?client=firefox-b&q=fla',
          searchEngineName: 'Google',
        },
      kind: ['custom-search'],
      suggestion: 'fla',
    },
},
{
  url: 'https://www.flaconi.de/search/?par=myoffrz.base.promobar10P.032019.',
  href: 'https://www.flaconi.de/search/?par=myoffrz.base.promobar10P.032019.',
  friendlyUrl: 'flaconi.de/search',
  title: '10% auf ALLE Artikel bei Flaconi!',
  description: 'Ob Parfum, Make-Up oder Pflegeprodukte - hier geht\'s zu Ihren Lieblingsmarken.',
  kind: ['H'],
  style: 'favicon',
  provider: 'history',
  template: 'offer',
  text: 'fla',
  type: 'rh',
  meta:
    {
      level: 0,
      type: 'main',
      domain: 'flaconi.de',
      host: 'flaconi.de',
      hostAndPort: 'flaconi.de',
      port: '',
      url: 'flaconi.de/search/?par=myoffrz.base.promobar10P.032019.',
      subType: {},
      originalUrl: 'https://www.flaconi.de/search/?par=myoffrz.base.promobar10P.032019.',
      isEnriched: true,
      completion: '',
      logo:
        {
          backgroundColor: 'd3807a',
          backgroundImage: 'url(https://cdn.cliqz.com/brands-database/database/1521469421408/logos/flaconi/$.de.svg)',
          text: 'fl',
          color: '#fff',
          brandTxtColor: 'd3807a',
          buttonsClass: 'cliqz-brands-button-10',
          style: 'background-color: #d3807a;color:#fff;background-image:url(https://cdn.cliqz.com/brands-database/database/1521469421408/logos/flaconi/$.de.svg); text-indent: -10em;',
        },
      extraLogos: {},
      externalProvidersLogos:
        {
          kicker:
            {
              backgroundColor: 'd7011d',
              backgroundImage: 'url(https://cdn.cliqz.com/brands-database/database/1521469421408/logos/kicker/$.svg)',
              text: 'ki',
              color: '#fff',
              brandTxtColor: 'd7011d',
              buttonsClass: 'cliqz-brands-button-1',
              style: 'background-color: #d7011d;color:#fff;background-image:url(https://cdn.cliqz.com/brands-database/database/1521469421408/logos/kicker/$.svg); text-indent: -10em;',
            },
        },
    },
  data:
    {
      deepResults: [],
      extra:
        {
          injected_ids: {},
          is_ad: true,
          landing_domain: 'flaconi.de',
          offers_data:
            {
              data:
                {
                  action_info: {},
                  campaign_id: '5c77a9806d48b8000191db41',
                  display_id: '5c77a9806d48b8000191db41_5c88ceddcd3f4941f002e738_5c77a9806d48b8000191db48_5c88ceddcd3f4941f002e739_D',
                  filter_info: {},
                  monitorData:
                    [{
                      params: { filter_last_secs: 5, referrer_cat: true, store: false },
                      patterns: ['||flaconi.de/warenkorb$script'],
                      signalID: 'cart',
                      type: 'urlchange',
                    },
                    {
                      params: { filter_last_secs: 5, referrer_cat: true, store: false },
                      patterns: ['||flaconi.de*?par=myoffrz.base.promobar10p.032019.$script'],
                      signalID: 'landing',
                      type: 'urlchange',
                    },
                    {
                      params: { filter_last_secs: 5, referrer_cat: true, store: false },
                      patterns: ['||flaconi.de$script'],
                      signalID: 'page_imp',
                      type: 'urlchange',
                    },
                    {
                      params: { filter_last_secs: 5, referrer_cat: true, store: false },
                      patterns: ['||flaconi.de/kasse$script'],
                      signalID: 'payment',
                      type: 'urlchange',
                    },
                    {
                      params: { filter_last_secs: 5, referrer_cat: true, store: false },
                      patterns: ['||flaconi.de/kasse/bestellt$script'],
                      signalID: 'success',
                      type: 'urlchange',
                    }],
                  offer_id: '5c77a9806d48b8000191db41_5c88ceddcd3f4941f002e738_5c77a9806d48b8000191db48_5c88ceddcd3f4941f002e739',
                  rs_dest: ['dropdown'],
                  rule_info: {},
                  ui_info: {},
                },
              description: 'Ob Parfum, Make-Up oder Pflegeprodukte - hier geht\'s zu Ihren Lieblingsmarken.',
              promo_code: 'Nach dem Klick',
              thumbnail: 'https://placeholdervalueforquicksearch.com',
              title: '10% auf ALLE Artikel bei Flaconi!',
              url_ad: 'https://www.flaconi.de/search/?par=myoffrz.base.promobar10P.032019.',
            },
          url_ad: 'https://www.flaconi.de/search/?par=myoffrz.base.promobar10P.032019.',
        },
      kind: ['H'],
      template: 'offer',
    },
},
{
  url: 'moz-extension://51f7204d-54a5-4cc4-9b8c-a92c047fe8de/modules/cliqz-history/index.html#/?query=fla',
  href: 'moz-extension://51f7204d-54a5-4cc4-9b8c-a92c047fe8de/modules/cliqz-history/index.html#/?query=fla',
  friendlyUrl: 'moz-extension://51f7204d-54a5-4cc4-9b8c-a92c047fe8de/modules/cliqz-history/index.html',
  kind: ['history-ui'],
  template: 'sessions',
  text: 'fla',
  meta:
    {
      level: 0,
      type: 'main',
      domain: '51f7204d-54a5-4cc4-9b8c-a92c047fe8de',
      host: '51f7204d-54a5-4cc4-9b8c-a92c047fe8de',
      hostAndPort: '51f7204d-54a5-4cc4-9b8c-a92c047fe8de',
      port: '',
      url: 'moz-extension://51f7204d-54a5-4cc4-9b8c-a92c047fe8de/modules/cliqz-history/index.html#/?query=fla',
      subType: {},
      completion: '',
      logo:
        {
          text: '51',
          backgroundColor: 'c78e6d',
          brandTxtColor: '2d2d2d',
          buttonsClass: 'cliqz-brands-button-9',
          style: 'background-color: #c78e6d;color:#fff;',
        },
      extraLogos: {},
      externalProvidersLogos:
        {
          kicker:
            {
              backgroundColor: 'd7011d',
              backgroundImage: 'url(https://cdn.cliqz.com/brands-database/database/1521469421408/logos/kicker/$.svg)',
              text: 'ki',
              color: '#fff',
              brandTxtColor: 'd7011d',
              buttonsClass: 'cliqz-brands-button-1',
              style: 'background-color: #d7011d;color:#fff;background-image:url(https://cdn.cliqz.com/brands-database/database/1521469421408/logos/kicker/$.svg); text-indent: -10em;',
            },
        },
    },
  data:
    {
      deepResults: [],
      extra: {},
      kind: ['history-ui'],
      template: 'sessions',
    },
},
{
  url: 'https://www.flaconi.de/',
  href: 'https://www.flaconi.de/',
  friendlyUrl: 'flaconi.de',
  title: 'Online Parfümerie: Parfum & Kosmetik bestellen | FLACONI',
  description: 'Parfum, Pflege & Make-up bei Flaconi ✔ schneller Versand in 1-2 Tagen, gratis ab 19€ ✔ 2 Gratisproben | Jetzt Parfüm & Kosmetik online bestellen!',
  kind: ['X|{"class":"EntityGeneric"}'],
  provider: 'cliqz',
  template: 'generic',
  text: 'fla',
  type: 'rh',
  meta:
    {
      level: 0,
      type: 'main',
      triggerMethod: 'url',
      domain: 'flaconi.de',
      host: 'flaconi.de',
      hostAndPort: 'flaconi.de',
      port: '',
      url: 'flaconi.de',
      score: 8564.657,
      subType:
        {
          class: 'EntityGeneric',
          id: 'b54906fbf7779cc284c2e72f4251e2fd406a3b8a0e6b21e600a2fcdf3874f5df',
          name: 'flaconi.de',
        },
      latency: 221,
      backendCountry: 'de',
      completion: 'coni.de',
      logo:
        {
          backgroundColor: 'd3807a',
          backgroundImage: 'url(https://cdn.cliqz.com/brands-database/database/1521469421408/logos/flaconi/$.de.svg)',
          text: 'fl',
          color: '#fff',
          brandTxtColor: 'd3807a',
          buttonsClass: 'cliqz-brands-button-10',
          style: 'background-color: #d3807a;color:#fff;background-image:url(https://cdn.cliqz.com/brands-database/database/1521469421408/logos/flaconi/$.de.svg); text-indent: -10em;',
        },
      extraLogos: {},
      externalProvidersLogos:
        {
          kicker:
            {
              backgroundColor: 'd7011d',
              backgroundImage: 'url(https://cdn.cliqz.com/brands-database/database/1521469421408/logos/kicker/$.svg)',
              text: 'ki',
              color: '#fff',
              brandTxtColor: 'd7011d',
              buttonsClass: 'cliqz-brands-button-1',
              style: 'background-color: #d7011d;color:#fff;background-image:url(https://cdn.cliqz.com/brands-database/database/1521469421408/logos/kicker/$.svg); text-indent: -10em;',
            },
        },
    },
  data:
    {
      deepResults:
        [{
          type: 'buttons',
          links:
            [{
              url: 'https://www.flaconi.de/parfum',
              href: 'https://www.flaconi.de/parfum',
              friendlyUrl: 'flaconi.de/parfum',
              title: 'Parfum',
              kind: ['X|{"class":"EntityGeneric"}'],
              meta:
                {
                  level: 1,
                  type: 'buttons',
                  domain: 'flaconi.de',
                  host: 'flaconi.de',
                  hostAndPort: 'flaconi.de',
                  port: '',
                  url: 'flaconi.de/parfum',
                  subType: {},
                  completion: 'coni.de/parfum',
                  logo:
                    {
                      backgroundColor: 'd3807a',
                      backgroundImage: 'url(https://cdn.cliqz.com/brands-database/database/1521469421408/logos/flaconi/$.de.svg)',
                      text: 'fl',
                      color: '#fff',
                      brandTxtColor: 'd3807a',
                      buttonsClass: 'cliqz-brands-button-10',
                      style: 'background-color: #d3807a;color:#fff;background-image:url(https://cdn.cliqz.com/brands-database/database/1521469421408/logos/flaconi/$.de.svg); text-indent: -10em;',
                    },
                  extraLogos: {},
                  externalProvidersLogos:
                    {
                      kicker:
                        {
                          backgroundColor: 'd7011d',
                          backgroundImage: 'url(https://cdn.cliqz.com/brands-database/database/1521469421408/logos/kicker/$.svg)',
                          text: 'ki',
                          color: '#fff',
                          brandTxtColor: 'd7011d',
                          buttonsClass: 'cliqz-brands-button-1',
                          style: 'background-color: #d7011d;color:#fff;background-image:url(https://cdn.cliqz.com/brands-database/database/1521469421408/logos/kicker/$.svg); text-indent: -10em;',
                        },
                    },
                },
            },
            {
              url: 'https://www.flaconi.de/nagellack',
              href: 'https://www.flaconi.de/nagellack',
              friendlyUrl: 'flaconi.de/nagellack',
              title: 'Nagellack',
              kind: ['X|{"class":"EntityGeneric"}'],
              meta:
                {
                  level: 1,
                  type: 'buttons',
                  domain: 'flaconi.de',
                  host: 'flaconi.de',
                  hostAndPort: 'flaconi.de',
                  port: '',
                  url: 'flaconi.de/nagellack',
                  subType: {},
                  completion: 'coni.de/nagellack',
                  logo:
                    {
                      backgroundColor: 'd3807a',
                      backgroundImage: 'url(https://cdn.cliqz.com/brands-database/database/1521469421408/logos/flaconi/$.de.svg)',
                      text: 'fl',
                      color: '#fff',
                      brandTxtColor: 'd3807a',
                      buttonsClass: 'cliqz-brands-button-10',
                      style: 'background-color: #d3807a;color:#fff;background-image:url(https://cdn.cliqz.com/brands-database/database/1521469421408/logos/flaconi/$.de.svg); text-indent: -10em;',
                    },
                  extraLogos: {},
                  externalProvidersLogos:
                    {
                      kicker:
                        {
                          backgroundColor: 'd7011d',
                          backgroundImage: 'url(https://cdn.cliqz.com/brands-database/database/1521469421408/logos/kicker/$.svg)',
                          text: 'ki',
                          color: '#fff',
                          brandTxtColor: 'd7011d',
                          buttonsClass: 'cliqz-brands-button-1',
                          style: 'background-color: #d7011d;color:#fff;background-image:url(https://cdn.cliqz.com/brands-database/database/1521469421408/logos/kicker/$.svg); text-indent: -10em;',
                        },
                    },
                },
            },
            {
              url: 'https://www.flaconi.de/lippenstift',
              href: 'https://www.flaconi.de/lippenstift',
              friendlyUrl: 'flaconi.de/lippenstift',
              title: 'Lippenstift',
              kind: ['X|{"class":"EntityGeneric"}'],
              meta:
                {
                  level: 1,
                  type: 'buttons',
                  domain: 'flaconi.de',
                  host: 'flaconi.de',
                  hostAndPort: 'flaconi.de',
                  port: '',
                  url: 'flaconi.de/lippenstift',
                  subType: {},
                  completion: 'coni.de/lippenstift',
                  logo:
                    {
                      backgroundColor: 'd3807a',
                      backgroundImage: 'url(https://cdn.cliqz.com/brands-database/database/1521469421408/logos/flaconi/$.de.svg)',
                      text: 'fl',
                      color: '#fff',
                      brandTxtColor: 'd3807a',
                      buttonsClass: 'cliqz-brands-button-10',
                      style: 'background-color: #d3807a;color:#fff;background-image:url(https://cdn.cliqz.com/brands-database/database/1521469421408/logos/flaconi/$.de.svg); text-indent: -10em;',
                    },
                  extraLogos: {},
                  externalProvidersLogos:
                    {
                      kicker:
                        {
                          backgroundColor: 'd7011d',
                          backgroundImage: 'url(https://cdn.cliqz.com/brands-database/database/1521469421408/logos/kicker/$.svg)',
                          text: 'ki',
                          color: '#fff',
                          brandTxtColor: 'd7011d',
                          buttonsClass: 'cliqz-brands-button-1',
                          style: 'background-color: #d7011d;color:#fff;background-image:url(https://cdn.cliqz.com/brands-database/database/1521469421408/logos/kicker/$.svg); text-indent: -10em;',
                        },
                    },
                },
            },
            {
              url: 'https://www.flaconi.de/top-10-herrenduefte',
              href: 'https://www.flaconi.de/top-10-herrenduefte',
              friendlyUrl: 'flaconi.de/top-10-herrenduefte',
              title: 'Top 10 Herrendüfte',
              kind: ['X|{"class":"EntityGeneric"}'],
              meta:
                {
                  level: 1,
                  type: 'buttons',
                  domain: 'flaconi.de',
                  host: 'flaconi.de',
                  hostAndPort: 'flaconi.de',
                  port: '',
                  url: 'flaconi.de/top-10-herrenduefte',
                  subType: {},
                  completion: 'coni.de/top-10-herrenduefte',
                  logo:
                    {
                      backgroundColor: 'd3807a',
                      backgroundImage: 'url(https://cdn.cliqz.com/brands-database/database/1521469421408/logos/flaconi/$.de.svg)',
                      text: 'fl',
                      color: '#fff',
                      brandTxtColor: 'd3807a',
                      buttonsClass: 'cliqz-brands-button-10',
                      style: 'background-color: #d3807a;color:#fff;background-image:url(https://cdn.cliqz.com/brands-database/database/1521469421408/logos/flaconi/$.de.svg); text-indent: -10em;',
                    },
                  extraLogos: {},
                  externalProvidersLogos:
                    {
                      kicker:
                        {
                          backgroundColor: 'd7011d',
                          backgroundImage: 'url(https://cdn.cliqz.com/brands-database/database/1521469421408/logos/kicker/$.svg)',
                          text: 'ki',
                          color: '#fff',
                          brandTxtColor: 'd7011d',
                          buttonsClass: 'cliqz-brands-button-1',
                          style: 'background-color: #d7011d;color:#fff;background-image:url(https://cdn.cliqz.com/brands-database/database/1521469421408/logos/kicker/$.svg); text-indent: -10em;',
                        },
                    },
                },
            },
            {
              url: 'https://www.flaconi.de/herrenparfum',
              href: 'https://www.flaconi.de/herrenparfum',
              friendlyUrl: 'flaconi.de/herrenparfum',
              title: 'Herrenparfum',
              kind: ['X|{"class":"EntityGeneric"}'],
              meta:
                {
                  level: 1,
                  type: 'buttons',
                  domain: 'flaconi.de',
                  host: 'flaconi.de',
                  hostAndPort: 'flaconi.de',
                  port: '',
                  url: 'flaconi.de/herrenparfum',
                  subType: {},
                  completion: 'coni.de/herrenparfum',
                  logo:
                    {
                      backgroundColor: 'd3807a',
                      backgroundImage: 'url(https://cdn.cliqz.com/brands-database/database/1521469421408/logos/flaconi/$.de.svg)',
                      text: 'fl',
                      color: '#fff',
                      brandTxtColor: 'd3807a',
                      buttonsClass: 'cliqz-brands-button-10',
                      style: 'background-color: #d3807a;color:#fff;background-image:url(https://cdn.cliqz.com/brands-database/database/1521469421408/logos/flaconi/$.de.svg); text-indent: -10em;',
                    },
                  extraLogos: {},
                  externalProvidersLogos:
                    {
                      kicker:
                        {
                          backgroundColor: 'd7011d',
                          backgroundImage: 'url(https://cdn.cliqz.com/brands-database/database/1521469421408/logos/kicker/$.svg)',
                          text: 'ki',
                          color: '#fff',
                          brandTxtColor: 'd7011d',
                          buttonsClass: 'cliqz-brands-button-1',
                          style: 'background-color: #d7011d;color:#fff;background-image:url(https://cdn.cliqz.com/brands-database/database/1521469421408/logos/kicker/$.svg); text-indent: -10em;',
                        },
                    },
                },
            }],
        }],
      extra:
        {
          alternatives: ['https://www.flaconi.de/'],
          language: { de: 0.9 },
          official: false,
          og:
            {
              description: 'Parfum, Pflege & Make-up bei Flaconi ✔ schneller Versand in 1-2 Tagen, gratis ab 19€ ✔ 2 Gratisproben | Jetzt Parfüm & Kosmetik online bestellen!',
              image: 'https://imgr.cliqz.com/xyohhdzrZYGRxcR5StYGtc6cRkTr4MPe4oyRT8fxItY/fill/0/200/no/1/aHR0cHM6Ly9jZG4uZmxhY29uaS5kZS90aGVtZXMvZmxhY29uaS9hc3NldHMvMjAxODEyMTMwOTQzNTIvaW1hZ2VzL2xvZ28vZmxhY29uaS1sb2dvLWljby5qcGc.jpg',
              title: 'Online Parfümerie: Parfum & Kosmetik bestellen | FLACONI',
              url: 'https://www.flaconi.de/home',
            },
          rich_data:
            {
              addresslocality: 'Berlin',
              bestrating: 5,
              postalcode: 'D-10587',
              ratingcount: 131080,
              ratingvalue: 4.86,
              streetaddress: 'Franklinstraße 13',
              worstrating: 1,
            },
        },
      kind: ['X|{"class":"EntityGeneric"}'],
      template: 'generic',
    },
},
{
  url: 'https://www.hse24.de/?mkt=AFK_pn&refID=pn/1058/Klick&emsrc=affiliate&destination=classic&nfxsid=&myoffrz',
  href: 'https://www.hse24.de/?mkt=AFK_pn&refID=pn/1058/Klick&emsrc=affiliate&destination=classic&nfxsid=&myoffrz',
  friendlyUrl: 'hse24.de',
  title: '15€ Rabatt auf ALLES bei HSE24.de',
  description: 'Entdecken Sie die Produktvielfalt und sparen Sie bei Ihrem nächsten Einkauf.',
  kind: ['X|{"class":"EntityOffers"}'],
  provider: 'cliqz::offers',
  template: 'offer',
  text: 'fla',
  type: 'rh',
  meta:
    {
      level: 0,
      type: 'main',
      triggerMethod: 'partial_url',
      domain: 'hse24.de',
      host: 'hse24.de',
      hostAndPort: 'hse24.de',
      port: '',
      url: 'hse24.de/?mkt=AFK_pn&refID=pn/1058/Klick&emsrc=affiliate&destination=classic&nfxsid=&myoffrz',
      subType:
        {
          class: 'EntityOffers',
          id: '865275795bc11eb1f02c75013bff9e0aad8d4e19553a00eaf96f171e3b3fe99a',
          name: '05974d0b69fa4d5d92cb1e941b917d8c_urls\n1db8823c57854365984c4cf959b3f7cf_urls\n\n5c6e66806d48b8000191d386_triggering\n5c77a9806d48b8000191db41_triggering',
        },
      completion: '',
      logo:
        {
          backgroundColor: 'f97136',
          backgroundImage: 'url(https://cdn.cliqz.com/brands-database/database/1521469421408/logos/hse24/$.svg)',
          text: 'hs',
          color: '#fff',
          brandTxtColor: 'f97136',
          buttonsClass: 'cliqz-brands-button-2',
          style: 'background-color: #f97136;color:#fff;background-image:url(https://cdn.cliqz.com/brands-database/database/1521469421408/logos/hse24/$.svg); text-indent: -10em;',
        },
      extraLogos: {},
      externalProvidersLogos:
        {
          kicker:
            {
              backgroundColor: 'd7011d',
              backgroundImage: 'url(https://cdn.cliqz.com/brands-database/database/1521469421408/logos/kicker/$.svg)',
              text: 'ki',
              color: '#fff',
              brandTxtColor: 'd7011d',
              buttonsClass: 'cliqz-brands-button-1',
              style: 'background-color: #d7011d;color:#fff;background-image:url(https://cdn.cliqz.com/brands-database/database/1521469421408/logos/kicker/$.svg); text-indent: -10em;',
            },
        },
    },
  data:
    {
      deepResults: [],
      extra:
        {
          injected_ids: {},
          is_ad: true,
          landing_domain: 'hse24.de*&refid=pn',
          offers_data:
            {
              data: HSE_OFFER,
              description: 'Entdecken Sie die Produktvielfalt und sparen Sie bei Ihrem nächsten Einkauf.',
              promo_code: 'Nach dem Klick',
              thumbnail: 'https://placeholdervalueforquicksearch.com',
              title: '15€ Rabatt auf ALLES bei HSE24.de',
              url_ad: 'https://www.hse24.de/?mkt=AFK_pn&refID=pn/1058/Klick&emsrc=affiliate&destination=classic&nfxsid=&myoffrz',
            },
          url_ad: 'https://www.hse24.de/?mkt=AFK_pn&refID=pn/1058/Klick&emsrc=affiliate&destination=classic&nfxsid=&myoffrz',
        },
      kind: ['X|{"class":"EntityOffers"}'],
      template: 'offer',
    },
},
{
  url: 'https://en.wikipedia.org/wiki/FLA',
  href: 'https://en.wikipedia.org/wiki/FLA',
  friendlyUrl: 'en.wikipedia.org/wiki/FLA',
  title: 'FLA',
  description: 'FLA may refer to:',
  kind: ['h'],
  provider: 'cliqz',
  template: 'hq',
  text: 'fla',
  type: 'bm',
  meta:
    {
      level: 0,
      type: 'main',
      domain: 'wikipedia.org',
      host: 'en.wikipedia.org',
      hostAndPort: 'en.wikipedia.org',
      port: '',
      url: 'en.wikipedia.org/wiki/FLA',
      score: 485.33542,
      subType: {},
      latency: 221,
      backendCountry: 'de',
      completion: '',
      logo:
        {
          backgroundColor: '999999',
          backgroundImage: 'url(https://cdn.cliqz.com/brands-database/database/1521469421408/logos/wikipedia/$.svg)',
          text: 'wi',
          color: '#fff',
          brandTxtColor: '999999',
          buttonsClass: 'cliqz-brands-button-10',
          style: 'background-color: #999999;color:#fff;background-image:url(https://cdn.cliqz.com/brands-database/database/1521469421408/logos/wikipedia/$.svg); text-indent: -10em;',
        },
      extraLogos: {},
      externalProvidersLogos:
        {
          kicker:
            {
              backgroundColor: 'd7011d',
              backgroundImage: 'url(https://cdn.cliqz.com/brands-database/database/1521469421408/logos/kicker/$.svg)',
              text: 'ki',
              color: '#fff',
              brandTxtColor: 'd7011d',
              buttonsClass: 'cliqz-brands-button-1',
              style: 'background-color: #d7011d;color:#fff;background-image:url(https://cdn.cliqz.com/brands-database/database/1521469421408/logos/kicker/$.svg); text-indent: -10em;',
            },
        },
    },
  data: { deepResults: [], kind: ['h'], template: 'hq' },
}];

module.exports = {
  HSE_OFFER,
  RAW_RESULT,
  CURRENT_RESULTS,
  CURRENT_RESULTS_ONLY_HSE_OFFER: CURRENT_RESULTS.slice(3, 6),
};
