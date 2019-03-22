/* eslint-disable */
'use strict';

const urls = require('../common/urls-cliqz');

module.exports = {
  'platform': 'node',
  'format': 'common',
  'brocfile': "Brocfile.node.js",
  'baseURL': "/cliqz/",
  'settings': Object.assign({}, urls, {
    'id': 'cliqz@cliqz.com',
    'name': 'Cliqz',
    'channel': '99',
    // TODO: need to find a better way to include this in the config
    // default setting for the module may be okay
  }),
  'default_prefs' : {
  },
  'bundles': [
  ],
  "modules": [
    "core",
    "hpnv2",
    "antitracking",
    "webrequest-pipeline",
  ]
}
