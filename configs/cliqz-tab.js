const urls = require('./common/urls-cliqz');
const base = require('./common/system');
const subprojects = require('./common/subprojects/bundles');

const id = 'khlmffibhhjkfjiflcmpiodjmkbkianc';

module.exports = {
  "platform": "webextension",
  "baseURL": "/modules/",
  "pack": "web-ext build -s build -a .",
  "publish": 'webstore upload --source cliqz_tab_nightly_-$VERSION.zip --extension-id ' + id + ' && webstore publish --extension-id ' + id,
  "key": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAv/H/u0CVZ3QL0zWfO5EVbeTlLs76Adp8PUh+teBSoE4iXRlextXu4+BRDtfmZOvDktUlioWNQkBjojY/3ByjNUpyZBK4PJ+SluG/ex/mOmlGHwlbC3HRB0iGagWg6G1/4p4kYQnJlxX3mJEWHGAD8GwU0bnvq20LAqBM9Di3Cte47qujvbHUR7T8pjdpiJDIlW7b2HeVnFwt51UUPk4pUWgE2LnmGgBv7bgLnI/cCmKmqDEBNDebyB5KH331dDlN5vnNjRXp0cWkO9V7neSSfMbO1HRKcjEHwVU0z1jb04fWxCyrx62W9rPAEtvb7MiW57wBU8xPdOWZdmcgqRCe7wIDAQAB",
  "versionInfix": ".",
  "versionPrefix": "9",
  "settings": Object.assign({}, urls, {
    "id": id,
    "name": "appNameNightly",
    "channel": "CT12", // Cliqz Tab Chrome Beta
    "MSGCHANNEL": "cliqz-tab",
    "freshTabNews": true,
    "disableControlCenterButton": true,
    "KEY_DS_PUBKEY": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwXo4hXvboKHCggNJ0UNFvZQfDWi0jNcF1kBHthxilMu6LB\/hFrSMQ+\/FgTqVE36cCezWE0K1UcwmYGVsuqxcvql82RfCmYUVBroJ3UFG8qnetYfU5FOk43C555p5l5HzlF8QilcCUBCO4SCj9lEZ3\/8FJboCupTqxEUq7nwUgaNZOiGKMdDUBZJO1tW4LSH4lj9IAZccEJ5HKVmJKopQ3hmzWgDqowxni4NQz+0DnsSfCGAupKaJDxjfajJosX5i674rgdHbZGtgHB3M9jhc6HFNPcmtUgLwgtUtRwMhSnya6q\/O06euouNi1h0m5eRrWeMRlJSdUnelLSU8QNy7LQIDAQAB",
    "KEY_SECURE_LOGGER_PUBKEY": "MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAh5HhcRAn6+6woXQXl\/NtZ+fOooNglZct\/HSpYuqkcmrPauHW7EuOSq5bvpBZRTDROjR\/kUPomqVZIzqhdCFPA8BwXSCz7hAel2Q157vtBvh9sngMMLXb5Fgzef5N4EuKO8pL5KrS+I9tfZac41vFJSdpgAirZYhh+tdcQQ1z0Qv\/Rw0zOXjfvddCz3gEv2gB9KsLMVnTS1J4YOOgfza2adg9Ebz1z99DiF4vtCwn0IUwH\/3ToTBwJLbMnC3Ol43yBNk8rgK2mkgCi614vOSD3hnVmio+iW6+AUklM8VPl6l7hEK9cljJY+9UsMVmTrvaFbMPwS6AdZCXKTmNdaMJcy3zSOXu5zvzihoQLwAu9LM3l2eVk0Mw0K7JXOP20fc8BtzWCOLYVP32r4R0BNuhTtvGqjHNZHPJN5OwaxkLpn2dujL9uDWGjRiOItKMVq\/nOqmNGghrbf8IOaKT7VQhqOU4cXRkB\/uF1UjYETBavwUZAxx9Wd\/cMcAGmKiDxighxxQ29jDufl+2WG065tmJz+zCxmgrPh6Zb3KFUxPTe6yksAhWJhmGShA9v20t84M5c6NpZXoUsFcVja6XxzHeSB8dWq9Uu5QcZ83Gz\/ronwdEjT2OGTtBgOFeTDqLYUgphC1gcUEHOCnTNXRMQOXqGwBfZHp+Mq61QcMq2rNS7xECAwEAAQ==",
    "HPN_CHANNEL": "cliqz",
    "ALLOWED_COUNTRY_CODES": ["de", "at", "ch", "es", "us", "fr", "nl", "gb", "it", "se"],
    "FRESHTAB_TITLE": "Cliqz Tab",
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
