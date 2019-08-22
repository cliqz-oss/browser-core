/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export const data = {
  activeURL: 'http://www.spiegel.de/',
  friendlyURL: 'http://www.spiegel.de/',
  isSpecialUrl: false,
  domain: 'spiegel.de',
  extraUrl: '',
  hostname: 'www.spiegel.de',
  module: {
    antitracking: {
      visible: false,
    },
    search: {
      visible: true,
      state: [
        {
          name: 'Google',
          alias: '#go',
          default: true,
          code: 3
        },
        {
          name: 'Yahoo',
          alias: '#ya',
          default: false,
          code: 4
        },
        {
          name: 'Bing',
          alias: '#bi',
          default: false,
          code: 5
        },
        {
          name: 'Amazon.com',
          alias: '#am',
          default: false,
          code: 7
        },
        {
          name: 'DuckDuckGo',
          alias: '#du',
          default: false,
          code: 0
        },
        {
          name: 'Twitter',
          alias: '#tw',
          default: false,
          code: 0
        },
        {
          name: 'Wikipedia (en)',
          alias: '#wi',
          default: false,
          code: 6
        },
        {
          name: 'Google Images',
          alias: '#gi',
          default: false,
          code: 1
        },
        {
          name: 'Google Maps',
          alias: '#gm',
          default: false,
          code: 2
        },
        {
          name: 'YouTube',
          alias: '#yt',
          default: false,
          code: 10
        },
        {
          name: 'Ecosia',
          alias: '#ec',
          default: false,
          code: 11
        },
        {
          name: 'Start Page',
          alias: '#st',
          default: false,
          code: 0
        }
      ],
      supportedIndexCountries: {
        de: {
          selected: true,
          name: 'Germany'
        },
        fr: {
          selected: false,
          name: 'France'
        },
        us: {
          selected: false,
          name: 'United States'
        }
      }
    },
    geolocation: {
      visible: true,
      state: {
        yes: {
          name: 'Always',
          selected: true
        },
        ask: {
          name: 'Always ask',
          selected: false
        },
        no: {
          name: 'Never',
          selected: false
        }
      }
    },
    'human-web': {
      visible: true,
      state: true
    },
    hpnv2: {
      visible: true,
      state: false
    },
    'privacy-dashboard': {
      visible: true,
      url: 'about:transparency',
    },
    adult: {
      visible: true,
      state: {
        conservative: {
          name: 'Always',
          selected: false
        },
        moderate: {
          name: 'Always ask',
          selected: true
        },
        liberal: {
          name: 'Never',
          selected: false
        }
      }
    },
  },
  generalState: 'active',
  feedbackURL: 'https://cliqz.com/feedback/1.19.0.dev-40',
  locationSharingURL: 'https://cliqz.com/support/local-results',
  myoffrzURL: 'https://cliqz.com/myoffrz',
  reportSiteURL: 'https://cliqz.com/report-url',
  amo: false,
  isDesktopBrowser: true,
  compactView: false,
  showPoweredBy: true,
  showLearnMore: true,
};

export const dataAmo = {
  activeURL: 'http://www.spiegel.de/',
  friendlyURL: 'http://www.spiegel.de/',
  isSpecialUrl: false,
  domain: 'spiegel.de',
  extraUrl: '',
  hostname: 'www.spiegel.de',
  module: {
    antitracking: {
      visible: false,
    },
    search: {
      visible: true,
      state: [
        {
          name: 'Google',
          alias: '#go',
          default: true,
          code: 3
        },
        {
          name: 'Yahoo',
          alias: '#ya',
          default: false,
          code: 4
        },
        {
          name: 'Bing',
          alias: '#bi',
          default: false,
          code: 5
        },
        {
          name: 'Amazon.com',
          alias: '#am',
          default: false,
          code: 7
        },
        {
          name: 'DuckDuckGo',
          alias: '#du',
          default: false,
          code: 0
        },
        {
          name: 'Twitter',
          alias: '#tw',
          default: false,
          code: 0
        },
        {
          name: 'Wikipedia (en)',
          alias: '#wi',
          default: false,
          code: 6
        },
        {
          name: 'Google Images',
          alias: '#gi',
          default: false,
          code: 1
        },
        {
          name: 'Google Maps',
          alias: '#gm',
          default: false,
          code: 2
        },
        {
          name: 'YouTube',
          alias: '#yt',
          default: false,
          code: 10
        },
        {
          name: 'Ecosia',
          alias: '#ec',
          default: false,
          code: 11
        },
        {
          name: 'Start Page',
          alias: '#st',
          default: false,
          code: 0
        }
      ],
      supportedIndexCountries: {
        de: {
          selected: true,
          name: 'Germany'
        },
        fr: {
          selected: false,
          name: 'France'
        },
        us: {
          selected: false,
          name: 'United States'
        }
      }
    },
    geolocation: {
      visible: true,
      state: {
        yes: {
          name: 'Always',
          selected: true
        },
        ask: {
          name: 'Always ask',
          selected: false
        },
        no: {
          name: 'Never',
          selected: false
        }
      }
    },
    'human-web': {
      visible: true,
      state: true
    },
    hpnv2: {
      visible: true,
      state: false
    },
    adult: {
      visible: true,
      state: {
        conservative: {
          name: 'Always',
          selected: false
        },
        moderate: {
          name: 'Always ask',
          selected: true
        },
        liberal: {
          name: 'Never',
          selected: false
        }
      }
    },
  },
  generalState: 'active',
  feedbackURL: 'https://cliqz.com/feedback/1.19.0.dev-40',
  locationSharingURL: 'https://cliqz.com/support/local-results',
  myoffrzURL: 'https://cliqz.com/myoffrz',
  reportSiteURL: 'https://cliqz.com/report-url',
  amo: true,
  compactView: false,
  showPoweredBy: true,
  showLearnMore: true,
};

export const dataFunnelCake = {
  activeURL: 'http://www.spiegel.de/',
  friendlyURL: 'http://www.spiegel.de/',
  isSpecialUrl: false,
  domain: 'spiegel.de',
  extraUrl: '',
  hostname: 'www.spiegel.de',
  module: {
    antitracking: {
      visible: false,
    },
    search: {
      visible: true,
      state: [
        {
          name: 'Google',
          alias: '#go',
          default: true,
          code: 3
        },
        {
          name: 'Yahoo',
          alias: '#ya',
          default: false,
          code: 4
        },
        {
          name: 'Bing',
          alias: '#bi',
          default: false,
          code: 5
        },
        {
          name: 'Amazon.com',
          alias: '#am',
          default: false,
          code: 7
        },
        {
          name: 'DuckDuckGo',
          alias: '#du',
          default: false,
          code: 0
        },
        {
          name: 'Twitter',
          alias: '#tw',
          default: false,
          code: 0
        },
        {
          name: 'Wikipedia (en)',
          alias: '#wi',
          default: false,
          code: 6
        },
        {
          name: 'Google Images',
          alias: '#gi',
          default: false,
          code: 1
        },
        {
          name: 'Google Maps',
          alias: '#gm',
          default: false,
          code: 2
        },
        {
          name: 'YouTube',
          alias: '#yt',
          default: false,
          code: 10
        },
        {
          name: 'Ecosia',
          alias: '#ec',
          default: false,
          code: 11
        },
        {
          name: 'Start Page',
          alias: '#st',
          default: false,
          code: 0
        }
      ],
      supportedIndexCountries: {
        de: {
          selected: true,
          name: 'Germany'
        },
        fr: {
          selected: false,
          name: 'France'
        },
        us: {
          selected: false,
          name: 'United States'
        }
      }
    },
    geolocation: {
      visible: true,
      state: {
        yes: {
          name: 'Always',
          selected: true
        },
        ask: {
          name: 'Always ask',
          selected: false
        },
        no: {
          name: 'Never',
          selected: false
        }
      }
    },
    'human-web': {
      visible: true,
      state: true
    },
    hpnv2: {
      visible: true,
      state: false
    },
    adult: {
      visible: true,
      state: {
        conservative: {
          name: 'Always',
          selected: false
        },
        moderate: {
          name: 'Always ask',
          selected: true
        },
        liberal: {
          name: 'Never',
          selected: false
        }
      }
    },
  },
  generalState: 'active',
  feedbackURL: 'https://cliqz.com/feedback/1.19.0.dev-40',
  locationSharingURL: 'https://cliqz.com/support/local-results',
  myoffrzURL: 'https://cliqz.com/myoffrz',
  reportSiteURL: 'https://cliqz.com/report-url',
  amo: false,
  compactView: true,
  showPoweredBy: true,
  showLearnMore: true,
};
