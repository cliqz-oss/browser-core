const urls = require('./common/urls-ghostery');
const base = require('./common/system');
const subprojects = require('./common/subprojects/bundles');

const id = 'ifnpgdmcliingpambkkihjlhikmbbjid';

module.exports = {
  platform: 'webextension',
  specific: 'ghostery-tab',
  baseURL: '/modules/',
  pack: 'web-ext build -s build -a .',
  publish: 'webstore upload --source ghostery_tab_suche_anonym_beta_-$VERSION.zip --extension-id ' + id + ' && webstore publish --extension-id ' + id,
  versionInfix: '.',
  versionPrefix: '10',
  settings: Object.assign({}, urls, {
    id: id,
    channel: 'GT12', // Ghostery Tab Chrome Beta
    MSGCHANNEL: 'ghostery-tab',
    freshTabNews: true,
    KEY_DS_PUBKEY: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2YQdJOUx4/XT5uRlMl+9rCnyoPVcRLmbdd+DcUDPVYHxLl9bUorgfZHNnu/HPWj5vLRIF7mNnAFhZByZj/FvQHqfOptrFEJP5h9/2iAUBr2ZgRsWHhGGEBDRXI3FLvuqFCf8jcDRsVRXqiJ8ZMJgaF+a4j2Smt7XYDlG56L+MZCXgaR6mlevXMymee8Cf1Y28+mtV4Q8UZPCqARWNKeNu8HG0X39lWb/boqB2IiZHdclpmeYpuHHlcPZ2Qg/5ofi7KlZXA9SW3w3WguQnR/TKC+sZd49fI63H4lpIN/Mkk4tq4oYR9zrvGUP5944+ozLiY4+sXFXjYJ9Lq/jZdHlBQIDAQAB',
    KEY_SECURE_LOGGER_PUBKEY: 'MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA4m2KJ6BCQFZlQSAZHrh8Lx6wxYTUOaT6YZPl5oSISVPJHtL21ZrMzIL8NJLvVytgxpPqq7iFIzKnHJ1uQKrnVHAy0Tdv0FO6jZuNxb0UuBzZPbYNdO9dZHxKUb6beglD8WVsdLbH5rMx650eaAIsG6CgTkKUucCTxFXYcIgOgHKTzr67C/qpyNq5BInH2YpnblEvfAKWvqrzu2/c9a7BfYBTy46U93rI/XRfDgf6tRsF4DHTGPUQ6+s+RvNH8BaTD1o1MhdDgpq4ZOrwvkXmYbKJpYk5x2MJE1EvM8R7EP0zRXYC5M+OFc1p2i7CHd37gQqJRyDkke4iyzsIf8zjNrXnQBzrGxMTT1pyQmbg9e+5XMu0V95h/HQ5/WA+9P0GxTWgpLJlwK+0kWPFAmEp+LK5hNaW9T0pzoxeuRRjH7qDP478j1CK8ZtRUZ7DOXcCV6Xuh/tEXoQNJpuKmRym6nRKb0XQdnJolqVgSMN5Rn7F1B8Kvc5B+AGKnv+0gkzeKEtBtRIUkHBK8MPHlIXzJfxGxnuFjKBiXBJx/CL4EEj7ALkf04zLDstZhLrUQJ1PZLTzobNn7jjsu438oNW1COzzVNoApXaTi0Lgg1GRa8kaOUu1rIVzZoIukqstzg/26+HBR2u64gyS9YRqsLuTrmNfRecsNNlfulDwb30EcacCAwEAAQ==',
    HPN_CHANNEL: 'ghostery',
    ALLOWED_COUNTRY_CODES: ['de', 'at', 'ch', 'es', 'us', 'fr', 'nl', 'gb', 'it', 'se'],
    DEFAULT_SEARCH_ENGINE: 'DuckDuckGo',
    FRESHTAB_TITLE: 'Ghostery Tab',
  }),
  default_prefs: {
    'modules.human-web.enabled': false,
    'modules.hpn.enabled': false,
    'freshtab.search.mode': 'search',
    showConsoleLogs: true,
    developer: true,
    offers2FeatureEnabled: true,
  },
  modules: [
    'core',
    'core-cliqz',
    'static',
    'geolocation',
    'search',
    'dropdown',
    'freshtab',
    'offers-v2',
    'human-web',
    'hpn',
    'webrequest-pipeline',
    'webextension-specific',
    'anolysis',
    'anolysis-cc',
    'overlay',
    'control-center',
    'message-center'
  ],
  subprojects: subprojects([
    'pouchdb',
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
  bundles: [
    'hpn/worker.bundle.js',
    'core/content-script.bundle.js',
    'webextension-specific/app.bundle.js',
    'freshtab/home.bundle.js',
    'dropdown/dropdown.bundle.js',
    'control-center/control-center.bundle.js',
  ],
  system: Object.assign({}, base.systemConfig, {
    map: Object.assign({}, base.systemConfig.map, {
      ajv: 'node_modules/ajv/dist/ajv.min.js',
      jsep: 'modules/vendor/jsep.min.js',
    })
  }),
  builderDefault: Object.assign({}, base.builderConfig, {
    externals: base.builderConfig.externals.concat('@cliqz-oss/dexie', 'pouchdb', 'rxjs'),
    globalDeps: Object.assign({}, base.builderConfig.globalDeps, {
      '@cliqz-oss/dexie': 'Dexie',
      'pouchdb': 'PouchDB',
      'pouchdb/lib/index.js': 'PouchDB',
      rxjs: 'Rx',
      'rxjs/Rx.js': 'Rx',
    }),
  }),
};
