export default [
  {
    url: 'https://google.de/',
    snippet: {
      deepResults: [
        {
          links: [
            {
              title: 'Übersetzer',
              url: 'https://translate.google.de/?hl=de\u0026tab=wT'
            },
            {
              title: 'Datenschutzerklärung',
              url: 'https://www.google.de/intl/de/policies/privacy/'
            },
            {
              title: 'Bilder',
              url: 'https://www.google.de/imghp?hl=de\u0026tab=wi'
            },
            {
              title: 'Suche',
              url: 'https://www.google.de/webhp?tab=ww'
            },
            {
              title: 'Maps',
              url: 'https://maps.google.de/maps?hl=de\u0026tab=wl'
            },
            {
              title: 'Sucheinstellungen',
              url: 'https://www.google.de/preferences?hl=de\u0026fg=1'
            },
            {
              title: 'News',
              url: 'https://news.google.de/nwshp?hl=de\u0026tab=wn'
            }
          ],
          type: 'buttons'
        }
      ],
      description: 'Das Ziel von Google ist es, die Informationen der Welt zu organisieren und für alle zu jeder Zeit zugänglich und nutzbar zu machen.',
      extra: {
        alternatives: [],
        language: {}
      },
      friendlyUrl: 'google.de',
      title: 'Google'
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
  }
];

export const bmWithButtons = [
  {
    url: 'https://www.google.de/',
    snippet: {
      deepResults: [
        {
          links: [
            {
              title: 'Einstellungen',
              url: 'https://www.google.de/preferences?hl=de'
            },
            {
              title: 'Datenschutzerklärung',
              url: 'https://www.google.de/intl/de/policies/privacy/?fg=1'
            },
            {
              title: 'Erweiterte Suche',
              url: 'https://www.google.de/advanced_search?hl=de\u0026fg=1'
            },
            {
              title: 'Unternehmen',
              url: 'https://www.google.de/services/?fg=1'
            },
            {
              title: 'Nutzungsbedingungen',
              url: 'https://www.google.de/intl/de/policies/terms/?fg=1'
            },
            {
              title: 'Werbeprogramme',
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
      title: 'Google'
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
      title: 'Gmail – kostenloser ...'
    },
    c_url: 'https://www.google.com/intl/de/gmail/about/',
    type: 'bm'
  }
];
