"use strict";
var cliqzConfig = require('./broccoli/config');

// start - setting up frameScript whitelist
cliqzConfig.settings.frameScriptWhitelist = cliqzConfig.settings.frameScriptWhitelist || [];
if (cliqzConfig.environment === 'development') {
  // freshtab development server
  cliqzConfig.settings.frameScriptWhitelist.push('http://localhost:3000/');
}
// end

var brocfile = cliqzConfig.brocfile || ('Brocfile.' + cliqzConfig.platform);
var platformBrocfile = require('./broccoli/' + brocfile);
module.exports = platformBrocfile;
