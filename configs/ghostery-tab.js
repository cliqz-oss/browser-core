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
    name: 'ghosteryTabAppNameNightly',
    channel: 'GT12', // Ghostery Tab Chrome Beta
    MSGCHANNEL: 'ghostery-tab',
    freshTabNews: true,
    freshTabStats: true,
    disableControlCenterButton: true,
    browserAction: 'quicksearch',
    OFFERS_CHANNEL: 'ghostery-tab',
    ALLOWED_COUNTRY_CODES: ['de', 'at', 'ch', 'es', 'us', 'fr', 'nl', 'gb', 'it', 'se'],
    DEFAULT_SEARCH_ENGINE: 'DuckDuckGo',
    FRESHTAB_TITLE: 'Ghostery Tab',
  }),
  default_prefs: {
    'modules.human-web.enabled': false,
    'modules.hpnv2.enabled': false,
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
    'hpnv2',
    'webrequest-pipeline',
    'webextension-specific',
    'anolysis',
    'anolysis-cc',
    'overlay',
    'control-center',
    'message-center'
  ],
  bundles: [
    'hpnv2/worker.wasm.bundle.js',
    'hpnv2/worker.asmjs.bundle.js',
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
    externals: base.builderConfig.externals.concat('@cliqz-oss/dexie', 'rxjs'),
    globalDeps: Object.assign({}, base.builderConfig.globalDeps, {
      '@cliqz-oss/dexie': 'Dexie',
      rxjs: 'Rx',
      'rxjs/Rx.js': 'Rx',
    }),
  }),
};
