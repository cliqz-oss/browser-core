const urls = require('./common/urls-ghostery');
const base = require('./common/system');

const id = 'ifnpgdmcliingpambkkihjlhikmbbjid';

module.exports = {
  platform: 'webextension',
  specific: 'ghostery-tab',
  baseURL: '/modules/',
  pack: 'web-ext build -s build -a .',
  versionInfix: '.',
  versionPrefix: '10',
  settings: Object.assign({}, urls, {
    id: id,
    appName: "Ghostery",
    name: 'ghosteryTabAppNameNightly',
    channel: 'GT12', // Ghostery Tab Chrome Beta
    MSGCHANNEL: 'ghostery-tab',
    freshTabNews: true,
    freshTabStats: true,
    browserAction: 'quicksearch',
    OFFERS_CHANNEL: 'ghostery-tab',
    ALLOWED_COUNTRY_CODES: ['de', 'at', 'ch', 'es', 'us', 'fr', 'nl', 'gb', 'it', 'se'],
    DEFAULT_SEARCH_ENGINE: 'DuckDuckGo',
    FRESHTAB_TITLE: 'Ghostery Tab',
    offboardingURLs: {
      "en": "https://www.surveymonkey.de/r/StartTabEng",
      "de": "https://www.surveymonkey.de/r/StartTabDE",
    },
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
    'abtests-legacy',
    'geolocation',
    'search',
    'dropdown',
    'freshtab',
    'offers-v2',
    'human-web',
    'insights',
    'hpnv2',
    'webrequest-pipeline',
    'webextension-specific',
    'anolysis',
    'anolysis-cc',
    'overlay',
    'control-center',
    'message-center',
    'toolbox'
  ],
  bundles: [
    'hpnv2/worker.wasm.bundle.js',
    'hpnv2/worker.asmjs.bundle.js',
    'core/content-script.bundle.js',
    'webextension-specific/app.bundle.js',
    'freshtab/home.bundle.js',
    'dropdown/dropdown.bundle.js',
    'control-center/control-center.bundle.js',
    'human-web/rusha.bundle.js',
    "toolbox/toolbox.bundle.js",
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
