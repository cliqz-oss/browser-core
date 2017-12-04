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
  },
  {
    url: 'google.de/maps',
    snippet: {
      description: 'Zoombare Straßen-, Land- und Satellitenkarten der ganzen Welt. Es ist eine Suchmöglichkeit nach Orten und Gewerben sowie ein Routenplaner vorhanden.',
      extra: {
        alternatives: [],
        language: {
          de: 1
        },
        og: {}
      },
      title: 'Google Maps'
    },
    c_url: 'https://www.google.de/maps',
    type: 'bm'
  },
  {
    url: 'mail.google.com',
    snippet: {
      description: 'Gmail ist ein intuitiver, effizienter und nützlicher E-Mail-Dienst mit 15 GB Speicherplatz, weniger Spam und mobilem Zugriff',
      extra: {
        alternatives: [
          'https://accounts.google.com/ServiceLogin?service=mail\u0026passive=true\u0026rm=false\u0026continue=https%3A%2F%2Fmail.google.com%2Fmail%2F\u0026ss=1\u0026scc=1\u0026ltmpl=googlemail\u0026emr=1\u0026osid=1'
        ],
        language: {
          qu: 1
        }
      },
      title: 'Gmail'
    },
    c_url: 'https://mail.google.com/',
    type: 'bm'
  },
  {
    url: 'translate.google.de',
    snippet: {
      description: 'Der kostenlose Online-Übersetzungsservice von Google übersetzt in Sekundenschnelle Text und Webseiten.',
      extra: {
        alternatives: [],
        language: {},
        og: {}
      },
      title: 'Google Übersetzter'
    },
    c_url: 'https://translate.google.de/',
    type: 'bm'
  }
];
