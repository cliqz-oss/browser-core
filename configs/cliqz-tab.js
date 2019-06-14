const urls = require('./common/urls-cliqz');
const base = require('./common/system');

const id = 'khlmffibhhjkfjiflcmpiodjmkbkianc';

module.exports = {
  "platform": "webextension",
  "specific": "cliqz-tab",
  "baseURL": "/modules/",
  "pack": "web-ext build -s build -a .",
  "key": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAv/H/u0CVZ3QL0zWfO5EVbeTlLs76Adp8PUh+teBSoE4iXRlextXu4+BRDtfmZOvDktUlioWNQkBjojY/3ByjNUpyZBK4PJ+SluG/ex/mOmlGHwlbC3HRB0iGagWg6G1/4p4kYQnJlxX3mJEWHGAD8GwU0bnvq20LAqBM9Di3Cte47qujvbHUR7T8pjdpiJDIlW7b2HeVnFwt51UUPk4pUWgE2LnmGgBv7bgLnI/cCmKmqDEBNDebyB5KH331dDlN5vnNjRXp0cWkO9V7neSSfMbO1HRKcjEHwVU0z1jb04fWxCyrx62W9rPAEtvb7MiW57wBU8xPdOWZdmcgqRCe7wIDAQAB",
  "versionInfix": ".",
  "versionPrefix": "9",
  "settings": Object.assign({}, urls, {
    "id": id,
    "appName": "Cliqz",
    "name": "appNameNightly",
    "channel": "CT12", // Cliqz Tab Chrome Beta
    "MSGCHANNEL": "cliqz-tab",
    "freshTabNews": true,
    "browserAction": 'quicksearch',
    "ALLOWED_COUNTRY_CODES": ["de", "at", "ch", "es", "us", "fr", "nl", "gb", "it", "se"],
    "FRESHTAB_TITLE": "Cliqz Tab",
  }),
  default_prefs: {
    'modules.human-web.enabled': false,
    'modules.hpnv2.enabled': true,
    'freshtab.search.mode': 'search',
    showConsoleLogs: true,
    developer: true,
    offers2FeatureEnabled: true,
  },
  modules: [
    'core',
    'telemetry',
    'core-cliqz',
    'geolocation',
    'search',
    'dropdown',
    'abtests-legacy',
    'freshtab',
    'offers-v2',
    'human-web',
    'hpnv2',
    'webrequest-pipeline',
    'webextension-specific',
    'anolysis',
    'anolysis-cc',
    'overlay',
    'control-center',
    'message-center',
  ],
  bundles: [
    'hpnv2/worker.wasm.bundle.js',
    'hpnv2/worker.asmjs.bundle.js',
    'core/content-script.bundle.js',
    'webextension-specific/app.bundle.js',
    'freshtab/home.bundle.js',
    'dropdown/dropdown.bundle.js',
    'control-center/control-center.bundle.js',
    "human-web/page.bundle.js",
    'human-web/rusha.bundle.js',
  ],
  system: Object.assign({}, base.systemConfig, {
    map: Object.assign({}, base.systemConfig.map, {
      ajv: 'node_modules/ajv/dist/ajv.min.js',
      jsep: 'modules/vendor/jsep.min.js',
    })
  }),
  builderDefault: Object.assign({}, base.builderConfig, {
    externals: base.builderConfig.externals.concat('@cliqz-oss/dexie'),
    globalDeps: Object.assign({}, base.builderConfig.globalDeps, {
      '@cliqz-oss/dexie': 'Dexie',
    }),
  }),
};
