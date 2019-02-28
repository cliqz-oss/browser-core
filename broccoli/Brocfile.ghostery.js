"use strict";
var Funnel = require('broccoli-funnel');
var build = require('./Brocfile.ghostery-mobile');

// Output
module.exports = new Funnel(build, {
  exclude: ['**/vendor/'],
});
