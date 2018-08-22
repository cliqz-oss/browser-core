
const urls = require('./common/urls');
const base = require('./common/system');
const subprojects = require('./common/subprojects/bundles');
const publish = require('./common/publish');

module.exports = {
  "platform": "webextension",
  "baseURL": "/modules/",
  "pack": "web-ext build -s build -a .",
  "publish": publish.toEdge('cliqz', 'webextension', 'zip'),
  "settings": Object.assign({}, urls, {
    "id": "cliqz@cliqz.com",
    "name": "Cliqz",
    "channel": "CH50",
    "MSGCHANNEL": "web-extension",
    "freshTabNews": true,
    "KEY_DS_PUBKEY": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2YQdJOUx4/XT5uRlMl+9rCnyoPVcRLmbdd+DcUDPVYHxLl9bUorgfZHNnu/HPWj5vLRIF7mNnAFhZByZj/FvQHqfOptrFEJP5h9/2iAUBr2ZgRsWHhGGEBDRXI3FLvuqFCf8jcDRsVRXqiJ8ZMJgaF+a4j2Smt7XYDlG56L+MZCXgaR6mlevXMymee8Cf1Y28+mtV4Q8UZPCqARWNKeNu8HG0X39lWb/boqB2IiZHdclpmeYpuHHlcPZ2Qg/5ofi7KlZXA9SW3w3WguQnR/TKC+sZd49fI63H4lpIN/Mkk4tq4oYR9zrvGUP5944+ozLiY4+sXFXjYJ9Lq/jZdHlBQIDAQAB",
    "KEY_SECURE_LOGGER_PUBKEY": "MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA4m2KJ6BCQFZlQSAZHrh8Lx6wxYTUOaT6YZPl5oSISVPJHtL21ZrMzIL8NJLvVytgxpPqq7iFIzKnHJ1uQKrnVHAy0Tdv0FO6jZuNxb0UuBzZPbYNdO9dZHxKUb6beglD8WVsdLbH5rMx650eaAIsG6CgTkKUucCTxFXYcIgOgHKTzr67C/qpyNq5BInH2YpnblEvfAKWvqrzu2/c9a7BfYBTy46U93rI/XRfDgf6tRsF4DHTGPUQ6+s+RvNH8BaTD1o1MhdDgpq4ZOrwvkXmYbKJpYk5x2MJE1EvM8R7EP0zRXYC5M+OFc1p2i7CHd37gQqJRyDkke4iyzsIf8zjNrXnQBzrGxMTT1pyQmbg9e+5XMu0V95h/HQ5/WA+9P0GxTWgpLJlwK+0kWPFAmEp+LK5hNaW9T0pzoxeuRRjH7qDP478j1CK8ZtRUZ7DOXcCV6Xuh/tEXoQNJpuKmRym6nRKb0XQdnJolqVgSMN5Rn7F1B8Kvc5B+AGKnv+0gkzeKEtBtRIUkHBK8MPHlIXzJfxGxnuFjKBiXBJx/CL4EEj7ALkf04zLDstZhLrUQJ1PZLTzobNn7jjsu438oNW1COzzVNoApXaTi0Lgg1GRa8kaOUu1rIVzZoIukqstzg/26+HBR2u64gyS9YRqsLuTrmNfRecsNNlfulDwb30EcacCAwEAAQ==",
    "HPN_CHANNEL": "cliqz",
    "ALLOWED_COUNTRY_CODES": ["de", "at", "ch", "es", "us", "fr", "nl", "gb", "it", "se"],
    "antitrackingPlaceholder": "cliqz.com/tracking",
    "antitrackingHeader": "CLIQZ-AntiTracking",
    'ICONS': {
      'active': {
        'default': 'control-center/images/cc-active.svg',
        'dark': 'control-center/images/cc-active-dark.svg'
      },
      'inactive': {
        'default': 'control-center/images/cc-critical.svg',
        'dark': 'control-center/images/cc-critical-dark.svg'
      },
      'critical': {
        'default': 'control-center/images/cc-critical.svg',
        'dark': 'control-center/images/cc-critical-dark.svg'
      }
    },
    'BACKGROUNDS': {
      'active': '#471647',
      'inactive': '#471647',
      'critical': '#471647',
      'off': '#471647'
    },
    "ALLOWED_SEARCH_DOMAINS": {
      'normal': ["\\.google\\..*?[#?&;]q=[^$&]+",".search.yahoo\\..*?[#?&;]p=[^$&]+",".linkedin.*?\\/pub\\/dir+","\\.bing\\..*?[#?&;]q=[^$&]+","\\.amazon\\.[^/]+\\/s(?:/?[?]|/ref=).*[?&]field-keywords=[^$&]+"],
      'strict': ["\\.google\\..*?[#?&;]q=[^$&]+",".search.yahoo\\..*?[#?&;][pq]=[^$&]+",".linkedin.*?\\/pub\\/dir+","\\.bing\\..*?[#?&;]q=[^$&]+","\\.amazon\\.[^/]+\\/s/[?]?(?:ref=.*[?&])?field-keywords=[^$&]+"]
    }
  }),
  "default_prefs" : {
    "modules.anolysis.enabled": false,
    "freshtab.search.mode": "search",
    "telemetryNoSession": true,
  },
  "modules": [
    "core",
    "static",
    "geolocation",
    "search",
    "dropdown",
    "freshtab",
    "human-web",
    "hpn",
    "antitracking",
    "webrequest-pipeline",
    "webextension-specific",
    "anolysis",
    "anolysis-cc",
    "control-center",
  ],
  "subprojects": subprojects([
    '@cliqz-oss/pouchdb',
    'chai',
    'core-js',
    'handlebars',
    'jquery',
    'mathjs',
    'mocha',
    'react',
    'reactDom',
    'rxjs',
    'tooltipster-css',
    'tooltipster-js',
    'tooltipster-sideTip-theme',
  ]),
  "bundles": [
    "hpn/worker.bundle.js",
    "core/content-script.bundle.js",
    "webextension-specific/app.bundle.js",
    "freshtab/home.bundle.js",
    "dropdown/dropdown.bundle.js",
    "control-center/control-center.bundle.js",
  ],
  system: Object.assign({}, base.systemConfig, {
    map: Object.assign({}, base.systemConfig.map, {
      "@cliqz-oss/pouchdb": "node_modules/@cliqz-oss/pouchdb/dist/pouchdb.js",
      "@cliqz-oss/dexie": "node_modules/@cliqz-oss/dexie/dist/dexie.js",
      "ajv": "node_modules/ajv/dist/ajv.min.js",
    })
  }),
  /*
  "system": {
    "map": {
      "BigInt": "node_modules/BigInt/src/BigInt.js",
      "pako": "node_modules/pako/dist/pako.js",
      "@cliqz-oss/pouchdb": "node_modules/@cliqz-oss/pouchdb/dist/pouchdb.js",
      "@cliqz-oss/dexie": "node_modules/@cliqz-oss/dexie/dist/dexie.js"
    },
    "meta": {
      "BigInt": { "format": "cjs" }
    }
  },
  */
  builderDefault: base.builderConfig,
}
