/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { getUrl } from '../../../core/test-helpers';

const finalWithoutHistoryView = {
  final: [
    {
      url: 'https://www.google.com/search?q=headphones&ie=utf-8&oe=utf-8&client=firefox-b',
      href: 'https://www.google.com/search?q=headphones&ie=utf-8&oe=utf-8&client=firefox-b',
      friendlyUrl: 'google.com/search?q=headphones&ie=utf-8&oe=utf-8&client=firefox-b',
      kind: [
        'default-search'
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
          searchEngineName: 'Google'
        },
        kind: [
          'default-search'
        ],
        suggestion: 'headphones'
      }
    },
    {
      url: 'https://www.currys.co.uk/gbuk/audio-and-headphones/headphones-291-c.html',
      href: 'https://www.currys.co.uk/gbuk/audio-and-headphones/headphones-291-c.html',
      friendlyUrl: 'currys.co.uk/gbuk/audio-and-headphones/headphones-291-c.html',
      title: '> Title - Headphones & Earphones - Deals on Headphones | Currys',
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
      url: 'https://www.bestbuy.com/site/headphones/all-headphones/pcmcat144700050004.c?id=pcmcat144700050004',
      href: 'https://www.bestbuy.com/site/headphones/all-headphones/pcmcat144700050004.c?id=pcmcat144700050004',
      friendlyUrl: 'bestbuy.com/site/headphones/all-headphones/pcmcat144700050004.c?id=pcmcat144700050004',
      title: '> Title - All Headphones - Best Buy',
      description: 'Best Buy has low prices on a variety of headphones from Beats by Dre, Bose, Skullcandy & Sony. Free shipping on select items or pick up in store today.',
      kind: [
        'm'
      ],
      provider: 'cliqz',
      text: 'headphones',
      type: 'bm',
      meta: {
        level: 0,
        type: 'main',
        domain: 'bestbuy.com',
        host: 'bestbuy.com',
        hostAndPort: 'bestbuy.com',
        port: '',
        url: 'bestbuy.com/site/headphones/all-headphones/pcmcat144700050004.c?id=pcmcat144700050004',
        score: 0,
        subType: {},
        latency: 80,
        backendCountry: 'de',
        completion: '',
        logo: {},
        extraLogos: {},
        externalProvidersLogos: {
          kicker: {}
        }
      },
      data: {
        deepResults: [],
        extra: {
          alternatives: [
            'https://www.bestbuy.com/site/headphones/all-headphones/pcmcat144700050004.c?id=pcmcat144700050004'
          ],
          language: {
            en: 0.99
          }
        },
        kind: [
          'm'
        ]
      }
    },
    {
      url: 'https://www.amazon.com/Headphones-Accessories-Supplies/b?ie=UTF8&node=172541',
      href: 'https://www.amazon.com/Headphones-Accessories-Supplies/b?ie=UTF8&node=172541',
      friendlyUrl: 'amazon.com/Headphones-Accessories-Supplies/b?ie=UTF8&node=172541',
      title: '> Title - Amazon.com: Headphones: Electronics: Earbud Headphones, Over-Ear Headphones, On-Ear Headphones & More',
      description: 'Online shopping for Electronics from a great selection of Earbud Headphones, Over-Ear Headphones, On-Ear Headphones & more at everyday low prices.',
      kind: [
        'm'
      ],
      provider: 'cliqz',
      text: 'headphones',
      type: 'bm',
      meta: {
        level: 0,
        type: 'main',
        domain: 'amazon.com',
        host: 'amazon.com',
        hostAndPort: 'amazon.com',
        port: '',
        url: 'amazon.com/headphones-accessories-supplies/b?ie=utf8&node=172541',
        score: 242.40471,
        subType: {},
        latency: 80,
        backendCountry: 'de',
        completion: '',
        logo: {},
        extraLogos: {},
        externalProvidersLogos: {
          kicker: {}
        }
      },
      data: {
        deepResults: [],
        extra: {
          alternatives: [
            'https://www.amazon.com/Headphones-Accessories-Supplies/b?ie=UTF8&node=172541'
          ],
          language: {
            en: 0.99
          },
          og: {
            description: 'Online shopping for Electronics from a great selection of Earbud Headphones, Over-Ear Headphones, On-Ear Headphones & more at everyday low prices.',
            title: '> Title - Amazon.com: Headphones: Electronics: Earbud Headphones, Over-Ear Headphones, On-Ear Headphones & More'
          }
        },
        kind: [
          'm'
        ]
      }
    },
    {
      url: 'https://www.argos.co.uk/browse/technology/ipod-mp3-and-headphones/headphones-and-earphones/c:30128',
      href: 'https://www.argos.co.uk/browse/technology/ipod-mp3-and-headphones/headphones-and-earphones/c:30128',
      friendlyUrl: 'argos.co.uk/browse/technology/ipod-mp3-and-headphones/headphones-and-earphones/c:30128',
      title: '> Title - Headphones & Earphones | Argos',
      description: 'Headphones & earphones at Argos. Gear for all needs including wireless, in-ear & on-ear. Get it today. Same day delivery £3.95, or fast store collection.',
      kind: [
        'm'
      ],
      provider: 'cliqz',
      text: 'headphones',
      type: 'bm',
      meta: {
        level: 0,
        type: 'main',
        domain: 'argos.co.uk',
        host: 'argos.co.uk',
        hostAndPort: 'argos.co.uk',
        port: '',
        url: 'argos.co.uk/browse/technology/ipod-mp3-and-headphones/headphones-and-earphones/c:30128',
        score: 155.03477,
        subType: {},
        latency: 80,
        backendCountry: 'de',
        completion: '',
        logo: {},
        extraLogos: {},
        externalProvidersLogos: {
          kicker: {}
        }
      },
      data: {
        deepResults: [],
        extra: {
          alternatives: [
            'https://www.argos.co.uk/browse/technology/ipod-mp3-and-headphones/headphones-and-earphones/c:30128'
          ],
          language: {
            en: 0.99
          }
        },
        kind: [
          'm'
        ]
      }
    }
  ]
};

const finalWithHistoryView = {
  final: [
    {
      url: 'https://www.google.com/search?q=headphones&ie=utf-8&oe=utf-8&client=firefox-b',
      href: 'https://www.google.com/search?q=headphones&ie=utf-8&oe=utf-8&client=firefox-b',
      friendlyUrl: 'google.com/search?q=headphones&ie=utf-8&oe=utf-8&client=firefox-b',
      kind: [
        'default-search'
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
          searchEngineName: 'Google'
        },
        kind: [
          'default-search'
        ],
        suggestion: 'headphones'
      }
    },
    {
      url: 'https://www.currys.co.uk/gbuk/audio-and-headphones/headphones-291-c.html',
      href: 'https://www.currys.co.uk/gbuk/audio-and-headphones/headphones-291-c.html',
      friendlyUrl: 'currys.co.uk/gbuk/audio-and-headphones/headphones-291-c.html',
      title: '> Title - Headphones & Earphones - Deals on Headphones | Currys',
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
      url: getUrl('modules/history/index.html#/?query=headphones'),
      href: getUrl('modules/history/index.html#/?query=headphones'),
      friendlyUrl: getUrl('modules/history/index.html#/?query=headphones#/?query=headphones'),
      kind: [
        'history-ui'
      ],
      template: 'sessions',
      text: 'headphones',
      meta: {
        level: 0,
        type: 'main',
        domain: '8fc58578-99ce-404d-9e4d-dd0d4eacb410.8fc58578-99ce-404d-9e4d-dd0d4eacb410',
        host: '8fc58578-99ce-404d-9e4d-dd0d4eacb410',
        hostAndPort: '8fc58578-99ce-404d-9e4d-dd0d4eacb410',
        port: '',
        url: getUrl('modules/history/index.html#/?query=headphones'),
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
    },
    {
      url: 'https://www.bestbuy.com/site/headphones/all-headphones/pcmcat144700050004.c?id=pcmcat144700050004',
      href: 'https://www.bestbuy.com/site/headphones/all-headphones/pcmcat144700050004.c?id=pcmcat144700050004',
      friendlyUrl: 'bestbuy.com/site/headphones/all-headphones/pcmcat144700050004.c?id=pcmcat144700050004',
      title: '> Title - All Headphones - Best Buy',
      description: 'Best Buy has low prices on a variety of headphones from Beats by Dre, Bose, Skullcandy & Sony. Free shipping on select items or pick up in store today.',
      kind: [
        'm'
      ],
      provider: 'cliqz',
      text: 'headphones',
      type: 'bm',
      meta: {
        level: 0,
        type: 'main',
        domain: 'bestbuy.com',
        host: 'bestbuy.com',
        hostAndPort: 'bestbuy.com',
        port: '',
        url: 'bestbuy.com/site/headphones/all-headphones/pcmcat144700050004.c?id=pcmcat144700050004',
        score: 0,
        subType: {},
        latency: 80,
        backendCountry: 'de',
        completion: '',
        logo: {},
        extraLogos: {},
        externalProvidersLogos: {
          kicker: {}
        }
      },
      data: {
        deepResults: [],
        extra: {
          alternatives: [
            'https://www.bestbuy.com/site/headphones/all-headphones/pcmcat144700050004.c?id=pcmcat144700050004'
          ],
          language: {
            en: 0.99
          }
        },
        kind: [
          'm'
        ]
      }
    },
    {
      url: 'https://www.amazon.com/Headphones-Accessories-Supplies/b?ie=UTF8&node=172541',
      href: 'https://www.amazon.com/Headphones-Accessories-Supplies/b?ie=UTF8&node=172541',
      friendlyUrl: 'amazon.com/Headphones-Accessories-Supplies/b?ie=UTF8&node=172541',
      title: '> Title - Amazon.com: Headphones: Electronics: Earbud Headphones, Over-Ear Headphones, On-Ear Headphones & More',
      description: 'Online shopping for Electronics from a great selection of Earbud Headphones, Over-Ear Headphones, On-Ear Headphones & more at everyday low prices.',
      kind: [
        'm'
      ],
      provider: 'cliqz',
      text: 'headphones',
      type: 'bm',
      meta: {
        level: 0,
        type: 'main',
        domain: 'amazon.com',
        host: 'amazon.com',
        hostAndPort: 'amazon.com',
        port: '',
        url: 'amazon.com/headphones-accessories-supplies/b?ie=utf8&node=172541',
        score: 242.40471,
        subType: {},
        latency: 80,
        backendCountry: 'de',
        completion: '',
        logo: {},
        extraLogos: {},
        externalProvidersLogos: {
          kicker: {}
        }
      },
      data: {
        deepResults: [],
        extra: {
          alternatives: [
            'https://www.amazon.com/Headphones-Accessories-Supplies/b?ie=UTF8&node=172541'
          ],
          language: {
            en: 0.99
          },
          og: {
            description: 'Online shopping for Electronics from a great selection of Earbud Headphones, Over-Ear Headphones, On-Ear Headphones & more at everyday low prices.',
            title: '> Title - Amazon.com: Headphones: Electronics: Earbud Headphones, Over-Ear Headphones, On-Ear Headphones & More'
          }
        },
        kind: [
          'm'
        ]
      }
    },
    {
      url: 'https://www.argos.co.uk/browse/technology/ipod-mp3-and-headphones/headphones-and-earphones/c:30128',
      href: 'https://www.argos.co.uk/browse/technology/ipod-mp3-and-headphones/headphones-and-earphones/c:30128',
      friendlyUrl: 'argos.co.uk/browse/technology/ipod-mp3-and-headphones/headphones-and-earphones/c:30128',
      title: '> Title - Headphones & Earphones | Argos',
      description: 'Headphones & earphones at Argos. Gear for all needs including wireless, in-ear & on-ear. Get it today. Same day delivery £3.95, or fast store collection.',
      kind: [
        'm'
      ],
      provider: 'cliqz',
      text: 'headphones',
      type: 'bm',
      meta: {
        level: 0,
        type: 'main',
        domain: 'argos.co.uk',
        host: 'argos.co.uk',
        hostAndPort: 'argos.co.uk',
        port: '',
        url: 'argos.co.uk/browse/technology/ipod-mp3-and-headphones/headphones-and-earphones/c:30128',
        score: 155.03477,
        subType: {},
        latency: 80,
        backendCountry: 'de',
        completion: '',
        logo: {},
        extraLogos: {},
        externalProvidersLogos: {
          kicker: {}
        }
      },
      data: {
        deepResults: [],
        extra: {
          alternatives: [
            'https://www.argos.co.uk/browse/technology/ipod-mp3-and-headphones/headphones-and-earphones/c:30128'
          ],
          language: {
            en: 0.99
          }
        },
        kind: [
          'm'
        ]
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
        searchEngineName: 'Google'
      },
      kind: [
        'default-search'
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
        title: '> Title - All Headphones - Best Buy'
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
            title: '> Title - Amazon.com: Headphones: Electronics: Earbud Headphones, Over-Ear Headphones, On-Ear Headphones & More'
          }
        },
        title: '> Title - Amazon.com: Headphones: Electronics: Earbud Headphones, Over-Ear Headphones, On-Ear Headphones & More'
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
        title: '> Title - Headphones & Earphones - Deals on Headphones | Currys'
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
        title: '> Title - Headphones & Earphones | Argos'
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
        title: '> Title - Best Buy International: Select your Country - Best Buy'
      },
      c_url: 'https://www.bestbuy.com/site/audio/headphones/abcat0204000.c?id=abcat0204000',
      type: 'bm'
    }
  ],
  history: [
    {
      style: 'favicon',
      value: 'https://www.currys.co.uk/gbuk/audio-and-headphones/headphones-291-c.html',
      image: 'page-icon:https://www.currys.co.uk/gbuk/audio-and-headphones/headphones-291-c.html',
      comment: '> Comment - Headphones & Earphones - Deals on Headphones | Currys',
      label: 'https://www.currys.co.uk/gbuk/audio-and-headphones/headphones-291-c.html'
    }
  ],
};

export const withoutHistoryView = { ...finalWithoutHistoryView, ...results };
export const withHistoryView = { ...finalWithHistoryView, ...results };
