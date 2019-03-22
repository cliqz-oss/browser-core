"use strict";

const Funnel = require('broccoli-funnel');

const outputTree = require('./Brocfile.webextension.js');

// Output
module.exports = new Funnel(outputTree, {
  exclude: ['**/vendor/!(dexie.min.js)'],
});
