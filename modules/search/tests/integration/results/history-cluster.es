import { getUrl } from '../../../core/test-helpers';

const finalWithoutHistoryView = {
  final: [
    {
      url: 'https://www.google.com/search?q=headphones&ie=utf-8&oe=utf-8&client=firefox-b',
      href: 'https://www.google.com/search?q=headphones&ie=utf-8&oe=utf-8&client=firefox-b',
      friendlyUrl: 'google.com/search?q=headphones&ie=utf-8&oe=utf-8&client=firefox-b',
      kind: [
        'custom-search'
      ],
      provider: 'instant',
      suggestion: 'headphones',
      text: 'headphones',
      type: 'supplementary-search',
      meta: {
        level: 0,
        type: 'main',
        domain: 'google.com',
        host: 'google.com',
        hostAndPort: 'google.com',
        port: '',
        url: 'google.com/search?q=headphones&ie=utf-8&oe=utf-8&client=firefox-b',
        subType: {},
        logo: {},
        extraLogos: {},
        externalProvidersLogos: {
          kicker: {}
        }
      },
      data: {
        deepResults: [],
        extra: {
          mozActionUrl: 'https://www.google.com/search?q=headphones&ie=utf-8&oe=utf-8&client=firefox-b',
          searchEngineName: 'Google'
        },
        kind: [
          'custom-search'
        ],
        suggestion: 'headphones'
      }
    },
    {
      url: 'https://bestbuy.com/',
      href: 'https://bestbuy.com/',
      friendlyUrl: 'bestbuy.com',
      title: 'bestbuy.com',
      kind: [
        'C'
      ],
      provider: 'history',
      text: 'headphones',
      meta: {
        level: 0,
        type: 'main',
        isConstructed: true,
        domain: 'bestbuy.com',
        host: 'bestbuy.com',
        hostAndPort: 'bestbuy.com',
        port: '',
        url: 'bestbuy.com',
        subType: {},
        isCluster: true,
        completion: '',
        logo: {},
        extraLogos: {},
        externalProvidersLogos: {
          kicker: {}
        }
      },
      data: {
        deepResults: [],
        kind: [
          'C'
        ],
        urls: [
          {
            url: 'https://www.bestbuy.com/site/audio/headphones/abcat0204000.c?id=abcat0204000',
            href: 'https://www.bestbuy.com/site/audio/headphones/abcat0204000.c?id=abcat0204000',
            friendlyUrl: 'bestbuy.com/site/audio/headphones/abcat0204000.c?id=abcat0204000',
            title: 'Best Buy International: Select your Country - Best Buy',
            extra: {},
            kind: [
              'C'
            ],
            style: 'favicon',
            provider: 'history',
            text: 'headphones',
            type: 'favicon',
            meta: {
              level: 1,
              type: 'history',
              domain: 'bestbuy.com',
              host: 'bestbuy.com',
              hostAndPort: 'bestbuy.com',
              port: '',
              url: 'bestbuy.com/site/audio/headphones/abcat0204000.c?id=abcat0204000',
              subType: {},
              completion: '',
              logo: {},
              extraLogos: {},
              externalProvidersLogos: {
                kicker: {}
              }
            }
          },
          {
            url: 'https://www.bestbuy.com/site/headphones/all-headphones/pcmcat144700050004.c?id=pcmcat144700050004',
            href: 'https://www.bestbuy.com/site/headphones/all-headphones/pcmcat144700050004.c?id=pcmcat144700050004',
            friendlyUrl: 'bestbuy.com/site/headphones/all-headphones/pcmcat144700050004.c?id=pcmcat144700050004',
            title: 'Best Buy International: Select your Country - Best Buy',
            extra: {},
            kind: [
              'C'
            ],
            style: 'favicon',
            provider: 'history',
            text: 'headphones',
            type: 'favicon',
            meta: {
              level: 1,
              type: 'history',
              domain: 'bestbuy.com',
              host: 'bestbuy.com',
              hostAndPort: 'bestbuy.com',
              port: '',
              url: 'bestbuy.com/site/headphones/all-headphones/pcmcat144700050004.c?id=pcmcat144700050004',
              subType: {},
              completion: '',
              logo: {},
              extraLogos: {},
              externalProvidersLogos: {
                kicker: {}
              }
            }
          }
        ]
      }
    },
    {
      url: 'https://www.argos.co.uk/browse/technology/ipod-mp3-and-headphones/headphones-and-earphones/c:30128/',
      href: 'https://www.argos.co.uk/browse/technology/ipod-mp3-and-headphones/headphones-and-earphones/c:30128/',
      friendlyUrl: 'argos.co.uk/browse/technology/ipod-mp3-and-headphones/headphones-and-earphones/c:30128',
      title: 'Headphones & Earphones | Argos',
      kind: [
        'H',
        'm'
      ],
      style: 'favicon',
      provider: 'history',
      text: 'headphones',
      type: 'favicon',
      meta: {
        level: 0,
        type: 'main',
        domain: 'argos.co.uk',
        host: 'argos.co.uk',
        hostAndPort: 'argos.co.uk',
        port: '',
        url: 'argos.co.uk/browse/technology/ipod-mp3-and-headphones/headphones-and-earphones/c:30128',
        subType: {},
        completion: '',
        logo: {},
        extraLogos: {},
        externalProvidersLogos: {
          kicker: {}
        }
      },
      data: {
        deepResults: [],
        extra: {},
        kind: [
          'H',
          'm'
        ]
      }
    },
    {
      url: 'https://www.currys.co.uk/gbuk/audio-and-headphones/headphones-291-c.html',
      href: 'https://www.currys.co.uk/gbuk/audio-and-headphones/headphones-291-c.html',
      friendlyUrl: 'currys.co.uk/gbuk/audio-and-headphones/headphones-291-c.html',
      title: 'Headphones & Earphones - Deals on Headphones | Currys',
      kind: [
        'H',
        'm'
      ],
      style: 'favicon',
      provider: 'history',
      text: 'headphones',
      type: 'favicon',
      meta: {
        level: 0,
        type: 'main',
        domain: 'currys.co.uk',
        host: 'currys.co.uk',
        hostAndPort: 'currys.co.uk',
        port: '',
        url: 'currys.co.uk/gbuk/audio-and-headphones/headphones-291-c.html',
        subType: {},
        completion: '',
        logo: {},
        extraLogos: {},
        externalProvidersLogos: {
          kicker: {}
        }
      },
      data: {
        deepResults: [],
        extra: {},
        kind: [
          'H',
          'm'
        ]
      }
    },
  ]
};

const finalWithHistoryView = {
  final: [
    {
      url: 'https://www.google.com/search?q=headphones&ie=utf-8&oe=utf-8&client=firefox-b',
      href: 'https://www.google.com/search?q=headphones&ie=utf-8&oe=utf-8&client=firefox-b',
      friendlyUrl: 'google.com/search?q=headphones&ie=utf-8&oe=utf-8&client=firefox-b',
      kind: [
        'custom-search'
      ],
      provider: 'instant',
      suggestion: 'headphones',
      text: 'headphones',
      type: 'supplementary-search',
      meta: {
        level: 0,
        type: 'main',
        domain: 'google.com',
        host: 'google.com',
        hostAndPort: 'google.com',
        port: '',
        url: 'google.com/search?q=headphones&ie=utf-8&oe=utf-8&client=firefox-b',
        subType: {},
        logo: {},
        extraLogos: {},
        externalProvidersLogos: {
          kicker: {}
        }
      },
      data: {
        deepResults: [],
        extra: {
          mozActionUrl: 'https://www.google.com/search?q=headphones&ie=utf-8&oe=utf-8&client=firefox-b',
          searchEngineName: 'Google'
        },
        kind: [
          'custom-search'
        ],
        suggestion: 'headphones'
      }
    },
    {
      url: 'https://bestbuy.com/',
      href: 'https://bestbuy.com/',
      friendlyUrl: 'bestbuy.com',
      title: 'bestbuy.com',
      kind: [
        'C'
      ],
      provider: 'history',
      text: 'headphones',
      meta: {
        level: 0,
        type: 'main',
        isConstructed: true,
        domain: 'bestbuy.com',
        host: 'bestbuy.com',
        hostAndPort: 'bestbuy.com',
        port: '',
        url: 'bestbuy.com',
        subType: {},
        isCluster: true,
        completion: '',
        logo: {},
        extraLogos: {},
        externalProvidersLogos: {
          kicker: {}
        }
      },
      data: {
        deepResults: [],
        kind: [
          'C'
        ],
        urls: [
          {
            url: 'https://www.bestbuy.com/site/audio/headphones/abcat0204000.c?id=abcat0204000',
            href: 'https://www.bestbuy.com/site/audio/headphones/abcat0204000.c?id=abcat0204000',
            friendlyUrl: 'bestbuy.com/site/audio/headphones/abcat0204000.c?id=abcat0204000',
            title: 'Best Buy International: Select your Country - Best Buy',
            extra: {},
            kind: [
              'C'
            ],
            style: 'favicon',
            provider: 'history',
            text: 'headphones',
            type: 'favicon',
            meta: {
              level: 1,
              type: 'history',
              domain: 'bestbuy.com',
              host: 'bestbuy.com',
              hostAndPort: 'bestbuy.com',
              port: '',
              url: 'bestbuy.com/site/audio/headphones/abcat0204000.c?id=abcat0204000',
              subType: {},
              completion: '',
              logo: {},
              extraLogos: {},
              externalProvidersLogos: {
                kicker: {}
              }
            }
          },
          {
            url: 'https://www.bestbuy.com/site/headphones/all-headphones/pcmcat144700050004.c?id=pcmcat144700050004',
            href: 'https://www.bestbuy.com/site/headphones/all-headphones/pcmcat144700050004.c?id=pcmcat144700050004',
            friendlyUrl: 'bestbuy.com/site/headphones/all-headphones/pcmcat144700050004.c?id=pcmcat144700050004',
            title: 'Best Buy International: Select your Country - Best Buy',
            extra: {},
            kind: [
              'C'
            ],
            style: 'favicon',
            provider: 'history',
            text: 'headphones',
            type: 'favicon',
            meta: {
              level: 1,
              type: 'history',
              domain: 'bestbuy.com',
              host: 'bestbuy.com',
              hostAndPort: 'bestbuy.com',
              port: '',
              url: 'bestbuy.com/site/headphones/all-headphones/pcmcat144700050004.c?id=pcmcat144700050004',
              subType: {},
              completion: '',
              logo: {},
              extraLogos: {},
              externalProvidersLogos: {
                kicker: {}
              }
            }
          }
        ]
      }
    },
    {
      url: 'https://www.argos.co.uk/browse/technology/ipod-mp3-and-headphones/headphones-and-earphones/c:30128/',
      href: 'https://www.argos.co.uk/browse/technology/ipod-mp3-and-headphones/headphones-and-earphones/c:30128/',
      friendlyUrl: 'argos.co.uk/browse/technology/ipod-mp3-and-headphones/headphones-and-earphones/c:30128',
      title: 'Headphones & Earphones | Argos',
      kind: [
        'H',
        'm'
      ],
      style: 'favicon',
      provider: 'history',
      text: 'headphones',
      type: 'favicon',
      meta: {
        level: 0,
        type: 'main',
        domain: 'argos.co.uk',
        host: 'argos.co.uk',
        hostAndPort: 'argos.co.uk',
        port: '',
        url: 'argos.co.uk/browse/technology/ipod-mp3-and-headphones/headphones-and-earphones/c:30128',
        subType: {},
        completion: '',
        logo: {},
        extraLogos: {},
        externalProvidersLogos: {
          kicker: {}
        }
      },
      data: {
        deepResults: [],
        extra: {},
        kind: [
          'H',
          'm'
        ]
      }
    },
    {
      url: 'https://www.currys.co.uk/gbuk/audio-and-headphones/headphones-291-c.html',
      href: 'https://www.currys.co.uk/gbuk/audio-and-headphones/headphones-291-c.html',
      friendlyUrl: 'currys.co.uk/gbuk/audio-and-headphones/headphones-291-c.html',
      title: 'Headphones & Earphones - Deals on Headphones | Currys',
      kind: [
        'H',
        'm'
      ],
      style: 'favicon',
      provider: 'history',
      text: 'headphones',
      type: 'favicon',
      meta: {
        level: 0,
        type: 'main',
        domain: 'currys.co.uk',
        host: 'currys.co.uk',
        hostAndPort: 'currys.co.uk',
        port: '',
        url: 'currys.co.uk/gbuk/audio-and-headphones/headphones-291-c.html',
        subType: {},
        completion: '',
        logo: {},
        extraLogos: {},
        externalProvidersLogos: {
          kicker: {}
        }
      },
      data: {
        deepResults: [],
        extra: {},
        kind: [
          'H',
          'm'
        ]
      }
    },
    {
      url: getUrl('modules/cliqz-history/index.html#/?query=headphones'),
      href: getUrl('modules/cliqz-history/index.html#/?query=headphones'),
      friendlyUrl: getUrl('modules/cliqz-history/index.html#/?query=headphones#/?query=headphones'),
      kind: [
        'history-ui'
      ],
      template: 'sessions',
      text: 'headphones',
      meta: {
        level: 0,
        type: 'main',
        domain: '90c2d786-3b6c-bc44-9225-f3aaea0dbc41.90c2d786-3b6c-bc44-9225-f3aaea0dbc41',
        host: '90c2d786-3b6c-bc44-9225-f3aaea0dbc41',
        hostAndPort: '90c2d786-3b6c-bc44-9225-f3aaea0dbc41',
        port: '',
        url: getUrl('modules/cliqz-history/index.html#/?query=headphones'),
        subType: {},
        completion: '',
        logo: {},
        extraLogos: {},
        externalProvidersLogos: {
          kicker: {}
        }
      },
      data: {
        deepResults: [],
        extra: {},
        kind: [
          'history-ui'
        ],
        template: 'sessions'
      }
    }
  ]
};

const results = {
  instant: [
    {
      url: 'https://www.google.com/search?q=headphones&ie=utf-8&oe=utf-8&client=firefox-b',
      href: 'https://www.google.com/search?q=headphones&ie=utf-8&oe=utf-8&client=firefox-b',
      friendlyUrl: 'google.com/search?q=headphones&ie=utf-8&oe=utf-8&client=firefox-b',
      extra: {
        mozActionUrl: 'https://www.google.com/search?q=headphones&ie=utf-8&oe=utf-8&client=firefox-b',
        searchEngineName: 'Google'
      },
      kind: [
        'custom-search'
      ],
      provider: 'instant',
      suggestion: 'headphones',
      text: 'headphones',
      type: 'supplementary-search',
      meta: {
        level: 0,
        type: 'main',
        domain: 'google.com',
        host: 'google.com',
        hostAndPort: 'google.com',
        port: '',
        url: 'google.com/search?q=headphones&ie=utf-8&oe=utf-8&client=firefox-b',
        subType: {}
      }
    }
  ],
  cliqz: [
    {
      url: 'https://www.bestbuy.com/site/headphones/all-headphones/pcmcat144700050004.c?id=pcmcat144700050004',
      score: 0,
      snippet: {
        description: 'Best Buy has low prices on a variety of headphones from Beats by Dre, Bose, Skullcandy & Sony. Free shipping on select items or pick up in store today.',
        extra: {
          alternatives: [
            'https://www.bestbuy.com/site/headphones/all-headphones/pcmcat144700050004.c?id=pcmcat144700050004'
          ],
          language: {
            en: 0.99
          }
        },
        title: 'All Headphones - Best Buy'
      },
      c_url: 'https://www.bestbuy.com/site/headphones/all-headphones/pcmcat144700050004.c?id=pcmcat144700050004',
      type: 'bm'
    },
    {
      url: 'https://www.amazon.com/Headphones-Accessories-Supplies/b?ie=UTF8&node=172541',
      score: 242.40471,
      snippet: {
        description: 'Online shopping for Electronics from a great selection of Earbud Headphones, Over-Ear Headphones, On-Ear Headphones & more at everyday low prices.',
        extra: {
          alternatives: [
            'https://www.amazon.com/Headphones-Accessories-Supplies/b?ie=UTF8&node=172541'
          ],
          language: {
            en: 0.99
          },
          og: {
            description: 'Online shopping for Electronics from a great selection of Earbud Headphones, Over-Ear Headphones, On-Ear Headphones & more at everyday low prices.',
            title: 'Amazon.com: Headphones: Electronics: Earbud Headphones, Over-Ear Headphones, On-Ear Headphones & More'
          }
        },
        title: 'Amazon.com: Headphones: Electronics: Earbud Headphones, Over-Ear Headphones, On-Ear Headphones & More'
      },
      c_url: 'https://www.amazon.com/Headphones-Accessories-Supplies/b?ie=UTF8&node=172541',
      type: 'bm'
    },
    {
      url: 'https://www.currys.co.uk/gbuk/audio-and-headphones/headphones-291-c.html',
      score: 220.47296,
      snippet: {
        description: 'Listen to all your favourite playlists, podcasts and audio books with our amazing online deals on headphones at Currys PC World. Shop the latest models from Bose, Beats and a range of other great bran',
        extra: {
          alternatives: [],
          language: {
            en: 0.99
          }
        },
        title: 'Headphones & Earphones - Deals on Headphones | Currys'
      },
      c_url: 'https://www.currys.co.uk/gbuk/audio-and-headphones/headphones-291-c.html',
      type: 'bm'
    },
    {
      url: 'https://www.argos.co.uk/browse/technology/ipod-mp3-and-headphones/headphones-and-earphones/c:30128',
      score: 155.03477,
      snippet: {
        description: 'Headphones & earphones at Argos. Gear for all needs including wireless, in-ear & on-ear. Get it today. Same day delivery £3.95, or fast store collection.',
        extra: {
          alternatives: [
            'https://www.argos.co.uk/browse/technology/ipod-mp3-and-headphones/headphones-and-earphones/c:30128'
          ],
          language: {
            en: 0.99
          }
        },
        title: 'Headphones & Earphones | Argos'
      },
      c_url: 'https://www.argos.co.uk/browse/technology/ipod-mp3-and-headphones/headphones-and-earphones/c:30128',
      type: 'bm'
    },
    {
      url: 'https://www.bestbuy.com/site/audio/headphones/abcat0204000.c?id=abcat0204000',
      score: 255.76031,
      snippet: {
        description: 'Shop online at Best Buy in your country and language of choice. Best Buy provides online shopping in a number of countries and languages.',
        extra: {
          alternatives: [],
          language: {
            fr: 0.52
          }
        },
        title: 'Best Buy International: Select your Country - Best Buy'
      },
      c_url: 'https://www.bestbuy.com/site/audio/headphones/abcat0204000.c?id=abcat0204000',
      type: 'bm'
    }
  ],
  history: [
    {
      style: 'favicon',
      value: 'https://www.bestbuy.com/site/audio/headphones/abcat0204000.c?id=abcat0204000',
      image: 'page-icon:https://www.bestbuy.com/site/audio/headphones/abcat0204000.c?id=abcat0204000',
      comment: 'Best Buy International: Select your Country - Best Buy',
      label: 'https://www.bestbuy.com/site/audio/headphones/abcat0204000.c?id=abcat0204000'
    },
    {
      style: 'favicon',
      value: 'https://www.argos.co.uk/browse/technology/ipod-mp3-and-headphones/headphones-and-earphones/c:30128/',
      image: 'page-icon:https://www.argos.co.uk/browse/technology/ipod-mp3-and-headphones/headphones-and-earphones/c:30128/',
      comment: 'Headphones & Earphones | Argos',
      label: 'https://www.argos.co.uk/browse/technology/ipod-mp3-and-headphones/headphones-and-earphones/c:30128/'
    },
    {
      style: 'favicon',
      value: 'https://www.currys.co.uk/gbuk/audio-and-headphones/headphones-291-c.html',
      image: 'page-icon:https://www.currys.co.uk/gbuk/audio-and-headphones/headphones-291-c.html',
      comment: 'Headphones & Earphones - Deals on Headphones | Currys',
      label: 'https://www.currys.co.uk/gbuk/audio-and-headphones/headphones-291-c.html'
    },
    {
      style: 'favicon',
      value: 'https://www.amazon.com/Headphones-Accessories-Supplies/b?ie=UTF8&node=172541',
      image: 'page-icon:https://www.amazon.com/Headphones-Accessories-Supplies/b?ie=UTF8&node=172541',
      comment: 'Amazon.com: Headphones: Electronics: Earbud Headphones, Over-Ear Headphones, On-Ear Headphones & More',
      label: 'https://www.amazon.com/Headphones-Accessories-Supplies/b?ie=UTF8&node=172541'
    },
    {
      style: 'favicon',
      value: 'https://www.bestbuy.com/site/headphones/all-headphones/pcmcat144700050004.c?id=pcmcat144700050004',
      image: 'page-icon:https://www.bestbuy.com/site/headphones/all-headphones/pcmcat144700050004.c?id=pcmcat144700050004',
      comment: 'Best Buy International: Select your Country - Best Buy',
      label: 'https://www.bestbuy.com/site/headphones/all-headphones/pcmcat144700050004.c?id=pcmcat144700050004'
    }
  ]
};

export const withoutHistoryView = Object.assign({}, finalWithoutHistoryView, results);
export const withHistoryView = Object.assign({}, finalWithHistoryView, results);
