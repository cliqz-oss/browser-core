/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default [
  {
    url: 'https://www.bing.com/',
    score: 299533,
    snippet: {
      deepResults: [
        {
          links: [
            {
              title: '> Title - Prämien',
              url: 'https://www.bing.com/rewards/dashboard'
            },
            {
              title: '> Title - Karten',
              url: 'https://www.bing.com/maps?FORM=Z9LH3'
            },
            {
              title: '> Title - News',
              url: 'https://www.bing.com/news?FORM=Z9LH4'
            }
          ],
          type: 'buttons'
        }
      ],
      description: 'Bing unterstützt Sie dabei, Informationen in Aktionen umzusetzen, sodass der Übergang vom Suchen zum Handeln schneller und einfacher erfolgen kann.',
      extra: {
        alternatives: [],
        language: {
          de: 0.9900000095367432
        }
      },
      friendlyUrl: 'bing.com',
      title: '> Title - Bing'
    },
    c_url: 'https://www.bing.com/',
    type: 'rh',
    subType: {
      class: 'EntityGeneric',
      id: '-6091247217066629038',
      name: 'bing.com'
    },
    template: 'generic',
    trigger: [
      'bing.com'
    ],
    trigger_method: 'url'
  },
];

export const bmWithButtons = [
  {
    url: 'https://www.google.de/',
    snippet: {
      deepResults: [
        {
          links: [
            {
              title: '> Title - Einstellungen',
              url: 'https://www.google.de/preferences?hl=de'
            },
            {
              title: '> Title - Datenschutzerklärung',
              url: 'https://www.google.de/intl/de/policies/privacy/?fg=1'
            },
            {
              title: '> Title - Erweiterte Suche',
              url: 'https://www.google.de/advanced_search?hl=de\u0026fg=1'
            },
            {
              title: '> Title - Unternehmen',
              url: 'https://www.google.de/services/?fg=1'
            },
            {
              title: '> Title - Nutzungsbedingungen',
              url: 'https://www.google.de/intl/de/policies/terms/?fg=1'
            },
            {
              title: '> Title - Werbeprogramme',
              url: 'https://www.google.de/intl/de/ads/?fg=1'
            }
          ],
          type: 'buttons'
        }
      ],
      description: 'Das Ziel von Google ist es, die Informationen der Welt zu organisieren und für alle zu jeder Zeit zugänglich und nutzbar zu machen.',
      extra: {
        alternatives: [],
        language: {
          de: 1
        },
        og: {
          description: 'Das Ziel von Google ist es, die Informationen der Welt zu organisieren und für alle zu jeder Zeit zugänglich und nutzbar zu machen.',
          type: ''
        }
      },
      friendlyUrl: 'google.de',
      title: '> Title - Google'
    },
    c_url: 'https://www.google.de/',
    type: 'rh',
    subType: {
      class: 'EntityGeneric',
      id: '-1236472982870230293',
      name: 'google.de'
    },
    template: 'generic',
    trigger: [
      'google.de'
    ],
    trigger_method: 'url'
  },
  {
    url: 'https://www.google.com/intl/de/gmail/about/',
    snippet: {
      extra: {
        language: {
          de: 1
        }
      },
      friendlyUrl: 'google.com/intl/de/gmail/about',
      title: '> Title - Gmail – kostenloser ...'
    },
    c_url: 'https://www.google.com/intl/de/gmail/about/',
    type: 'bm'
  }
];
