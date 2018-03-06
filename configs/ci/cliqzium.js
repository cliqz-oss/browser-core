
const urls = require('../common/urls');

module.exports = {
  "platform": "chromium",
  "baseURL": "chrome-extension://ekfhhggnbajmjdmgihoageagkeklhema/modules/",
  "settings": Object.assign({
    "channel": "CH50",
    "MSGCHANNEL": "web-extension",
    "KEY_DS_PUBKEY": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2YQdJOUx4/XT5uRlMl+9rCnyoPVcRLmbdd+DcUDPVYHxLl9bUorgfZHNnu/HPWj5vLRIF7mNnAFhZByZj/FvQHqfOptrFEJP5h9/2iAUBr2ZgRsWHhGGEBDRXI3FLvuqFCf8jcDRsVRXqiJ8ZMJgaF+a4j2Smt7XYDlG56L+MZCXgaR6mlevXMymee8Cf1Y28+mtV4Q8UZPCqARWNKeNu8HG0X39lWb/boqB2IiZHdclpmeYpuHHlcPZ2Qg/5ofi7KlZXA9SW3w3WguQnR/TKC+sZd49fI63H4lpIN/Mkk4tq4oYR9zrvGUP5944+ozLiY4+sXFXjYJ9Lq/jZdHlBQIDAQAB",
    "KEY_SECURE_LOGGER_PUBKEY": "MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA4m2KJ6BCQFZlQSAZHrh8Lx6wxYTUOaT6YZPl5oSISVPJHtL21ZrMzIL8NJLvVytgxpPqq7iFIzKnHJ1uQKrnVHAy0Tdv0FO6jZuNxb0UuBzZPbYNdO9dZHxKUb6beglD8WVsdLbH5rMx650eaAIsG6CgTkKUucCTxFXYcIgOgHKTzr67C/qpyNq5BInH2YpnblEvfAKWvqrzu2/c9a7BfYBTy46U93rI/XRfDgf6tRsF4DHTGPUQ6+s+RvNH8BaTD1o1MhdDgpq4ZOrwvkXmYbKJpYk5x2MJE1EvM8R7EP0zRXYC5M+OFc1p2i7CHd37gQqJRyDkke4iyzsIf8zjNrXnQBzrGxMTT1pyQmbg9e+5XMu0V95h/HQ5/WA+9P0GxTWgpLJlwK+0kWPFAmEp+LK5hNaW9T0pzoxeuRRjH7qDP478j1CK8ZtRUZ7DOXcCV6Xuh/tEXoQNJpuKmRym6nRKb0XQdnJolqVgSMN5Rn7F1B8Kvc5B+AGKnv+0gkzeKEtBtRIUkHBK8MPHlIXzJfxGxnuFjKBiXBJx/CL4EEj7ALkf04zLDstZhLrUQJ1PZLTzobNn7jjsu438oNW1COzzVNoApXaTi0Lgg1GRa8kaOUu1rIVzZoIukqstzg/26+HBR2u64gyS9YRqsLuTrmNfRecsNNlfulDwb30EcacCAwEAAQ==",
    "HPN_CHANNEL": "cliqz",
    "ALLOWED_COUNTRY_CODES": ["de", "at", "ch", "es", "us", "fr", "nl", "gb", "it", "se"],
  }, urls),
  "default_prefs": {
    "showConsoleLogs": true
  },
  "modules": [
    "core",
    "autocomplete",
    "static",
    "geolocation",
    "ui",
    "hpn",
    "expansions-provider",
    "antitracking",
    "webrequest-pipeline",
    "chromium-tests"
  ],
    "subprojects": [
    {
      "src":"node_modules/jquery/dist",
      "include": ["jquery.min.js"],
      "dest": "vendor"
    },
    {
      "src":"node_modules/mocha",
      "include": ["mocha.css", "mocha.js"],
      "dest": "vendor"
    },
    {
      "src":"node_modules/chai",
      "include": ["chai.js"],
      "dest": "vendor"
    },
    {
      "src": "node_modules/rxjs/bundles",
      "include": ["Rx.min.js"],
      "dest": "vendor"
    },
    {
      "src":"node_modules/core-js/client",
      "include": ["core.js"],
      "dest": "vendor"
    }
  ],
  "bundles": [
    "hpn/worker.bundle.js",
    "chromium-tests/antitracking-attrack.bundle.js",
    "chromium-tests/antitracking-bloomfilter.bundle.js",
    "chromium-tests/antitracking-qswhitelist.bundle.js",
    "chromium-tests/antitracking-test.bundle.js",
    "chromium-tests/core-utils.bundle.js",
    "chromium-tests/webrequest-leak.bundle.js",
    "chromium-tests/webrequest-page.bundle.js",
    "chromium-tests/webrequest-test.bundle.js"
  ],
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
  }
}
