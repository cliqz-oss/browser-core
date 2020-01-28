/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export const results = [
  {
    url: 'https://www.youtube.com/watch?v=07YebMv391g',
    score: 0,
    snippet: {
      deepResults: [
        {
          links: [],
          type: 'videos'
        },
        {
          links: [],
          type: 'buttons'
        }
      ],
      description: 'Zeige deine Videos deinen Freunden, Familienmitgliedern und der ganzen Welt.',
      extra: {
        alternatives: [],
        image: {
          src: 'http://localhost:3000/static/images/default.jpg'
        },
        language: {},
        m_url: 'https://m.youtube.com/watch?v=07YebMv391g',
        rich_data: {
          duration: 235,
          thumbnail: 'http://localhost:3000/static/images/mqdefault.jpg',
          views: '1895311',
          expected_views: '1,895,311'
        }
      },
      friendlyUrl: 'youtube.com/watch',
      title: 'Dieses Video zeigt, dass Melania Donald Trump hasst!'
    },
    c_url: 'https://www.youtube.com/watch?v=07YebMv391g',
    type: 'rh',
    subType: {
      class: 'EntityVideo',
      id: '6410147109143353900',
      name: 'YoutubeVideo'
    },
    template: 'single-video',
    test_name: 'single-video-normal',
    trigger_method: 'url'
  },
];

export const resultsNullViews = [
  {
    url: 'https://www.youtube.com/watch?v=07YebMv391g',
    score: 0,
    snippet: {
      deepResults: [
        {
          links: [],
          type: 'videos'
        },
        {
          links: [],
          type: 'buttons'
        }
      ],
      description: 'Zeige deine Videos deinen Freunden, Familienmitgliedern und der ganzen Welt.',
      extra: {
        alternatives: [],
        image: {
          src: 'http://localhost:3000/static/images/default.jpg'
        },
        language: {},
        m_url: 'https://m.youtube.com/watch?v=07YebMv391g',
        rich_data: {
          duration: 235,
          thumbnail: 'http://localhost:3000/static/images/mqdefault.jpg',
          views: null
        }
      },
      friendlyUrl: 'youtube.com/watch',
      title: 'Dieses Video zeigt, dass Melania Donald Trump hasst!'
    },
    c_url: 'https://www.youtube.com/watch?v=07YebMv391g',
    type: 'rh',
    subType: {
      class: 'EntityVideo',
      id: '6410147109143353900',
      name: 'YoutubeVideo'
    },
    template: 'single-video',
    test_name: 'single-video-null-views',
    trigger_method: 'url'
  },
];

export const resultsZeroViews = [
  {
    url: 'https://www.youtube.com/watch?v=07YebMv391g',
    score: 0,
    snippet: {
      deepResults: [
        {
          links: [],
          type: 'videos'
        },
        {
          links: [],
          type: 'buttons'
        }
      ],
      description: 'Zeige deine Videos deinen Freunden, Familienmitgliedern und der ganzen Welt.',
      extra: {
        alternatives: [],
        image: {
          src: 'http://localhost:3000/static/images/default.jpg'
        },
        language: {},
        m_url: 'https://m.youtube.com/watch?v=07YebMv391g',
        rich_data: {
          duration: 235,
          thumbnail: 'http://localhost:3000/static/images/mqdefault.jpg',
          views: 0
        }
      },
      friendlyUrl: 'youtube.com/watch',
      title: 'Dieses Video zeigt, dass Melania Donald Trump hasst!'
    },
    c_url: 'https://www.youtube.com/watch?v=07YebMv391g',
    type: 'rh',
    subType: {
      class: 'EntityVideo',
      id: '6410147109143353900',
      name: 'YoutubeVideo'
    },
    template: 'single-video',
    test_name: 'single-video-zero-views',
    trigger_method: 'url'
  },
];

export const resultsUndefinedViews = [
  {
    url: 'https://www.youtube.com/watch?v=07YebMv391g',
    score: 0,
    snippet: {
      deepResults: [
        {
          links: [],
          type: 'videos'
        },
        {
          links: [],
          type: 'buttons'
        }
      ],
      description: 'Zeige deine Videos deinen Freunden, Familienmitgliedern und der ganzen Welt.',
      extra: {
        alternatives: [],
        image: {
          src: 'http://localhost:3000/static/images/default.jpg'
        },
        language: {},
        m_url: 'https://m.youtube.com/watch?v=07YebMv391g',
        rich_data: {
          duration: 235,
          thumbnail: 'http://localhost:3000/static/images/mqdefault.jpg',
          views: null
        }
      },
      friendlyUrl: 'youtube.com/watch',
      title: 'Dieses Video zeigt, dass Melania Donald Trump hasst!'
    },
    c_url: 'https://www.youtube.com/watch?v=07YebMv391g',
    type: 'rh',
    subType: {
      class: 'EntityVideo',
      id: '6410147109143353900',
      name: 'YoutubeVideo'
    },
    template: 'single-video',
    test_name: 'single-video-undefined-views',
    trigger_method: 'url'
  },
];
