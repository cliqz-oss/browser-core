
const urls = require('./common/urls');
const base = require('./common/system');
const subprojects = require('./common/subprojects/bundles');

const id = 'khlmffibhhjkfjiflcmpiodjmkbkianc';

module.exports = {
  "platform": "webextension",
  "baseURL": "/modules/",
  "pack": "web-ext build -s build -a .",
  "publish": 'webstore upload --source cliqz_tab_suche_anonym_beta_-$VERSION.zip --extension-id ' + id + ' && webstore publish --extension-id ' + id,
  "key": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAv/H/u0CVZ3QL0zWfO5EVbeTlLs76Adp8PUh+teBSoE4iXRlextXu4+BRDtfmZOvDktUlioWNQkBjojY/3ByjNUpyZBK4PJ+SluG/ex/mOmlGHwlbC3HRB0iGagWg6G1/4p4kYQnJlxX3mJEWHGAD8GwU0bnvq20LAqBM9Di3Cte47qujvbHUR7T8pjdpiJDIlW7b2HeVnFwt51UUPk4pUWgE2LnmGgBv7bgLnI/cCmKmqDEBNDebyB5KH331dDlN5vnNjRXp0cWkO9V7neSSfMbO1HRKcjEHwVU0z1jb04fWxCyrx62W9rPAEtvb7MiW57wBU8xPdOWZdmcgqRCe7wIDAQAB",
  "versionInfix": ".",
  "versionPrefix": "9",
  "settings": Object.assign({}, urls, {
    "id": id,
    "name": "Cliqz Beta",
    "description": "For internal testers use only.",
    "channel": "CT12", // Cliqz Tab Chrome Beta
    "MSGCHANNEL": "cliqz-tab",
    "freshTabNews": true,
    "KEY_DS_PUBKEY": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2YQdJOUx4/XT5uRlMl+9rCnyoPVcRLmbdd+DcUDPVYHxLl9bUorgfZHNnu/HPWj5vLRIF7mNnAFhZByZj/FvQHqfOptrFEJP5h9/2iAUBr2ZgRsWHhGGEBDRXI3FLvuqFCf8jcDRsVRXqiJ8ZMJgaF+a4j2Smt7XYDlG56L+MZCXgaR6mlevXMymee8Cf1Y28+mtV4Q8UZPCqARWNKeNu8HG0X39lWb/boqB2IiZHdclpmeYpuHHlcPZ2Qg/5ofi7KlZXA9SW3w3WguQnR/TKC+sZd49fI63H4lpIN/Mkk4tq4oYR9zrvGUP5944+ozLiY4+sXFXjYJ9Lq/jZdHlBQIDAQAB",
    "KEY_SECURE_LOGGER_PUBKEY": "MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA4m2KJ6BCQFZlQSAZHrh8Lx6wxYTUOaT6YZPl5oSISVPJHtL21ZrMzIL8NJLvVytgxpPqq7iFIzKnHJ1uQKrnVHAy0Tdv0FO6jZuNxb0UuBzZPbYNdO9dZHxKUb6beglD8WVsdLbH5rMx650eaAIsG6CgTkKUucCTxFXYcIgOgHKTzr67C/qpyNq5BInH2YpnblEvfAKWvqrzu2/c9a7BfYBTy46U93rI/XRfDgf6tRsF4DHTGPUQ6+s+RvNH8BaTD1o1MhdDgpq4ZOrwvkXmYbKJpYk5x2MJE1EvM8R7EP0zRXYC5M+OFc1p2i7CHd37gQqJRyDkke4iyzsIf8zjNrXnQBzrGxMTT1pyQmbg9e+5XMu0V95h/HQ5/WA+9P0GxTWgpLJlwK+0kWPFAmEp+LK5hNaW9T0pzoxeuRRjH7qDP478j1CK8ZtRUZ7DOXcCV6Xuh/tEXoQNJpuKmRym6nRKb0XQdnJolqVgSMN5Rn7F1B8Kvc5B+AGKnv+0gkzeKEtBtRIUkHBK8MPHlIXzJfxGxnuFjKBiXBJx/CL4EEj7ALkf04zLDstZhLrUQJ1PZLTzobNn7jjsu438oNW1COzzVNoApXaTi0Lgg1GRa8kaOUu1rIVzZoIukqstzg/26+HBR2u64gyS9YRqsLuTrmNfRecsNNlfulDwb30EcacCAwEAAQ==",
    "HPN_CHANNEL": "cliqz",
    "ALLOWED_COUNTRY_CODES": ["de", "at", "ch", "es", "us", "fr", "nl", "gb", "it", "se"],
  }),
  'default_prefs' : {
    'modules.human-web.enabled': false,
    'modules.hpn.enabled': false,
    'freshtab.search.mode': 'search',
    'showConsoleLogs': true,
    'developer': true,
    'offers2FeatureEnabled': true,
  },
  "modules": [
    "core",
    "static",
    "geolocation",
    "search",
    "dropdown",
    "freshtab",
    "offers-v2",
    "human-web",
    "hpn",
    "webrequest-pipeline",
    "webextension-specific",
    "anolysis",
    "anolysis-cc",
    "overlay",
    "control-center",
    "message-center"
  ],
  "subprojects": subprojects([
    '@cliqz-oss/pouchdb',
    '@cliqz-oss/dexie',
    'core-js',
    'handlebars',
    'jquery',
    'mathjs',
    'react',
    'reactDom',
    'rxjs',
    'tooltipster-css',
    'tooltipster-js',
    'tooltipster-sideTip-theme',
    'jsep',
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
      "ajv": "node_modules/ajv/dist/ajv.min.js",
      "jsep": "modules/vendor/jsep.min.js",
    })
  }),
  builderDefault: Object.assign({}, base.builderConfig, {
    externals: base.builderConfig.externals.concat('@cliqz-oss/dexie', '@cliqz-oss/pouchdb', 'rxjs'),
    globalDeps: Object.assign({}, base.builderConfig.globalDeps, {
      '@cliqz-oss/dexie': 'Dexie',
      '@cliqz-oss/pouchdb': 'PouchDB',
      '@cliqz-oss/pouchdb/lib/index.js': 'PouchDB',
      'rxjs': 'Rx',
      'rxjs/Rx.js': 'Rx',
    }),
  }),
}
