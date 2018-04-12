/* eslint-disable */

'use strict';

const browserBase = require('../funnelcake');
const subprojects = require('../common/subprojects/bundles');

module.exports = Object.assign({}, browserBase, {
  settings: Object.assign({}, browserBase.settings, {
    channel: '99',
  }),
  modules: browserBase.modules.concat([
    'firefox-tests',
  ]),
  subprojects: browserBase.subprojects.concat(subprojects([
    'chai',
    'chai-dom',
    'mocha',
    'core-js',
  ])),
});
