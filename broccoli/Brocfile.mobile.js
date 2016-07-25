"use strict";
var Funnel = require('broccoli-funnel');
var MergeTrees = require('broccoli-merge-trees');
var compileSass = require('broccoli-sass-source-maps');
var concat = require('broccoli-sourcemap-concat');
var AssetRev = require('broccoli-asset-rev');
var writeFile = require('broccoli-file-creator');

var util = require('./util');
var cliqzConfig = require('./config');
var modules = require('./modules-tree');

// input trees
var mobileSpecific  = new Funnel('specific/mobile', { exclude: ['skin/sass/**/*', '*.py'] });
var generic         = new Funnel('generic');
var libs            = new Funnel(generic, { srcDir: 'modules/libs' });
var global          = new Funnel(generic, { srcDir: 'modules/global' });
var local           = new Funnel(generic, { srcDir: 'modules/local', exclude: ['views/**/*'] });

var mobileCss = compileSass(
  ['specific/mobile/skin/sass'],
  'style.sass',
  'style.css',
  { sourceMap: cliqzConfig.sourceMaps }
);

// cliqz.json should be saved after not transpiled modules are removed from configration
var config          = writeFile('cliqz.json', JSON.stringify(cliqzConfig));
console.log('Source maps:', cliqzConfig.sourceMaps);
console.log(cliqzConfig);
// cliqz.json is finalized

var globalConcated = concat(global, {
  outputFile: 'global.js',
  header: "'use strict';\n\nvar CLIQZ = {};\n\n",
  headerFiles: [
    'CliqzUtils.jsm',
  ],
  inputFiles: [
    '*.jsm',
  ],
  footer: "\n",
  sourceMapConfig: { enabled: cliqzConfig.sourceMaps },
  process: function (src,filepath) {
    var modulename = filepath.match(/[^\/]+$/)[0].split(".")[0]
    return "// start module " + modulename + "\n"
           + "(function(ctx,Q,E){\n"
           + src
           + "; ctx[EXPORTED_SYMBOLS[0]] = " + modulename + ";\n"
           + "})(this, CLIQZ,CLIQZEnvironment);\n"
           + "// end module " + modulename + "\n\n"
  }
});

var localConcated = concat(local, {
  outputFile: 'local.js',
  header: "'use strict';\n\n",
  inputFiles: [
    "ContextMenu.js",
  ],
  sourceMapConfig: { enabled: cliqzConfig.sourceMaps },
});

var libsConcated = concat(libs, {
  outputFile: 'libs.js',
  inputFiles: [
    "*.js",
  ],
  sourceMapConfig: { enabled: false },
});

var mobile = new MergeTrees([
  mobileSpecific,
  new Funnel(config),
  new Funnel(libsConcated,   { destDir: 'js' }),
  new Funnel(globalConcated, { destDir: 'js' }),
  new Funnel(mobileCss,      { destDir: 'skin/css' }),
  new Funnel(modules.bowerComponents, { destDir: 'bower_components' }),
  new Funnel(modules.modules,         { destDir: 'modules' })
]);

var platformTests = new Funnel('platforms/'+cliqzConfig.platform, {
  include: ['tests/**/*']
});
var testsTree = concat(platformTests, {
  outputFile: 'tests.js',
  inputFiles: [
    "**/*.js"
  ],
  allowNone: true,
  sourceMapConfig: { enabled: cliqzConfig.sourceMaps },
});

if (cliqzConfig.buildEnv === 'production' ) {
  mobile = new AssetRev(mobile, {
    extensions: ['js', 'css'],
    replaceExtensions: ['html', 'css', 'js'],
    generateAssetMap: true
  });
}

var configTree = util.injectConfig(mobile, config, 'cliqz.json', [
  'modules/core/config.js'
]);

var outputTree = new MergeTrees([
  mobile,
  configTree,
  new Funnel(testsTree, { destDir: 'modules/tests'})
], { overwrite: true });

// Output
module.exports = outputTree;
