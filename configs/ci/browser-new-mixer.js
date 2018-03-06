/* eslint-disable */

'use strict';

const base = require('./browser');

module.exports = Object.assign({}, base, {
  default_prefs: Object.assign({}, base.default_prefs, {
    searchMode: 'search',
  }),
});
