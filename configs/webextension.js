
const urls = require('./common/urls');
const base = require('./common/system');
const subprojects = require('./common/subprojects/bundles');

module.exports = {
  "platform": "webextension",
  "baseURL": "/modules/",
  "pack": "cat build/manifest.json | jq '.version = \\\"$PACKAGE_VERSION\\\"' > manifest.json && mv manifest.json build/ && web-ext build -s build -a .",
  "publish": "aws s3 cp cliqz_search-$PACKAGE_VERSION.zip s3://cdncliqz/update/edge/webextension/$BRANCH_NAME/$VERSION.zip --acl public-read && aws s3 cp s3://cdncliqz/update/edge/webextension/$BRANCH_NAME/$VERSION.zip s3://cdncliqz/update/edge/webextension/$BRANCH_NAME/latest.zip --acl public-read",
  "settings": Object.assign({}, urls, {
    "channel": "CH50",
    "MSGCHANNEL": "web-extension",
    "freshTabNews": true,
    "KEY_DS_PUBKEY": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2YQdJOUx4/XT5uRlMl+9rCnyoPVcRLmbdd+DcUDPVYHxLl9bUorgfZHNnu/HPWj5vLRIF7mNnAFhZByZj/FvQHqfOptrFEJP5h9/2iAUBr2ZgRsWHhGGEBDRXI3FLvuqFCf8jcDRsVRXqiJ8ZMJgaF+a4j2Smt7XYDlG56L+MZCXgaR6mlevXMymee8Cf1Y28+mtV4Q8UZPCqARWNKeNu8HG0X39lWb/boqB2IiZHdclpmeYpuHHlcPZ2Qg/5ofi7KlZXA9SW3w3WguQnR/TKC+sZd49fI63H4lpIN/Mkk4tq4oYR9zrvGUP5944+ozLiY4+sXFXjYJ9Lq/jZdHlBQIDAQAB",
    "KEY_SECURE_LOGGER_PUBKEY": "MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA4m2KJ6BCQFZlQSAZHrh8Lx6wxYTUOaT6YZPl5oSISVPJHtL21ZrMzIL8NJLvVytgxpPqq7iFIzKnHJ1uQKrnVHAy0Tdv0FO6jZuNxb0UuBzZPbYNdO9dZHxKUb6beglD8WVsdLbH5rMx650eaAIsG6CgTkKUucCTxFXYcIgOgHKTzr67C/qpyNq5BInH2YpnblEvfAKWvqrzu2/c9a7BfYBTy46U93rI/XRfDgf6tRsF4DHTGPUQ6+s+RvNH8BaTD1o1MhdDgpq4ZOrwvkXmYbKJpYk5x2MJE1EvM8R7EP0zRXYC5M+OFc1p2i7CHd37gQqJRyDkke4iyzsIf8zjNrXnQBzrGxMTT1pyQmbg9e+5XMu0V95h/HQ5/WA+9P0GxTWgpLJlwK+0kWPFAmEp+LK5hNaW9T0pzoxeuRRjH7qDP478j1CK8ZtRUZ7DOXcCV6Xuh/tEXoQNJpuKmRym6nRKb0XQdnJolqVgSMN5Rn7F1B8Kvc5B+AGKnv+0gkzeKEtBtRIUkHBK8MPHlIXzJfxGxnuFjKBiXBJx/CL4EEj7ALkf04zLDstZhLrUQJ1PZLTzobNn7jjsu438oNW1COzzVNoApXaTi0Lgg1GRa8kaOUu1rIVzZoIukqstzg/26+HBR2u64gyS9YRqsLuTrmNfRecsNNlfulDwb30EcacCAwEAAQ==",
    "HPN_CHANNEL": "cliqz",
    "ALLOWED_COUNTRY_CODES": ["de", "at", "ch", "es", "us", "fr", "nl", "gb", "it", "se"],
    "antitrackingPlaceholder": "cliqz.com/tracking",
    "antitrackingHeader": "CLIQZ-AntiTracking",
  }),
  "default_prefs" : {
    "freshtab.search.mode": "search",
  },
  "modules": [
    "core",
    "static",
    "geolocation",
    "search",
    "dropdown",
    "freshtab",
    "hpn",
    "expansions-provider",
    "antitracking",
    "webrequest-pipeline",
    "webextension-specific",
  ],
  "subprojects": subprojects([
    '@cliqz-oss/pouchdb',
    'jquery',
    'rxjs',
    'mocha',
    'chai',
    'core-js',
    'react',
    'reactDom',
    'mathjs',
    'handlebars',
  ]),
  "bundles": [
    "hpn/worker.bundle.js",
    "core/content-script.bundle.js",
    "webextension-specific/app.bundle.js",
    "freshtab/home.bundle.js",
    "dropdown/dropdown.bundle.js",
  ],
  system: Object.assign({}, base.systemConfig, {
    map: Object.assign({}, base.systemConfig.map, {
      "@cliqz-oss/pouchdb": "node_modules/@cliqz-oss/pouchdb/dist/pouchdb.js",
      "@cliqz-oss/dexie": "node_modules/@cliqz-oss/dexie/dist/dexie.js"
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
