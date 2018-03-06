/* eslint-disable */

'use strict';

const browserBase = require('../browser');
const subprojects = require('../common/subprojects/bundles');

module.exports = Object.assign({}, browserBase, {
  settings: Object.assign({}, browserBase.settings, {
    channel: '99',
  }),
  modules: browserBase.modules
    .filter(m => m !== 'onboarding-v3')
    .concat([
      'firefox-tests',
    ]),
  subprojects: browserBase.subprojects.concat(subprojects([
    'chai',
    'chai-dom',
    'mocha',
    'core-js',
  ])),
});
