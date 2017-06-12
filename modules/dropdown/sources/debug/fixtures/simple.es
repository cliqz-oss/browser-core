export default {
  'simple-results': {
    query: 'cliqz',
    results: [
      {
        template: 'result',
        title: 'test',
        url: 'https://sdsds.com',
        data: {},
      }
    ]
  },
  'two-simple-results': {
    query: 'cliqz',
    results: [
      {
        template: 'result',
        title: 'test',
        description: 'sdsdsd ',
        url: 'https://cliqz.com',
        data: {},
      },
      {
        template: 'result',
        title: 'test',
        url: 'https://cliqz.com',
        data: {},
      }
    ]
  },
  'multi-random': {
    query: 'cliqz',
    results: [
      {
        "title": "Nightly Start Page",
        "url": "about:home",
        "description": "",
        "originalUrl": "about:home",
        "type": "favicon",
        "text": "about:h",
        "data": {
          "kind": [
            "H"
          ],
          "title": "Nightly Start Page",
          "debug": "(history generic)!",
          "localSource": "bookmark",
          "template": "generic"
        },
        "maxNumberOfSlots": 3
      }
    ]
  }
};
