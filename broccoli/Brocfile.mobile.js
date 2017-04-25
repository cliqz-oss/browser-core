"use strict";
var Funnel = require('broccoli-funnel');
var MergeTrees = require('broccoli-merge-trees');
var concat = require('broccoli-sourcemap-concat');
var writeFile = require('broccoli-file-creator');

var util = require('./util');
var cliqzConfig = require('./config');
var modules = require('./modules-tree');

// input trees
var mobileSpecific  = new Funnel('specific/mobile', { exclude: ['skin/sass/**/*', '*.py'] });



// cliqz.json should be saved after not transpiled modules are removed from configration
var config          = writeFile('cliqz.json', JSON.stringify(cliqzConfig));
console.log('Source maps:', cliqzConfig.sourceMaps);
console.log(cliqzConfig);
// cliqz.json is finalized

const concatTrees = new MergeTrees([
  modules.modules,
  concat(
    new Funnel(mobileSpecific, { include: ['static/brands_database.json'] }), {
      outputFile: 'brands.js',
      inputFiles: ['**/*.json'],
      header: `
        System.register('mobile-ui/logo-db', [], function (_exports) {
          var db =
      `,
      footer: `

          _exports('default', db);
        });
      `
    }
  )
]);

const bundle = concat(concatTrees, {
      outputFile: 'app.js',
      inputFiles: [
        "**/*.js"
      ]
});

var bower = new Funnel(modules.bower, { destDir: 'bower_components' });

var mobileDev = new MergeTrees([
  mobileSpecific,
  new Funnel(config),
  bower,
  modules.modules
]);

var mobile = new MergeTrees([
  mobileSpecific,
  new Funnel(config),
  bower,
  modules.static,
  bundle
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

var configTree = util.injectConfig(mobile, config, 'cliqz.json', [
  'app.js'
]);

var outputTreeDev = new MergeTrees([
  mobileDev,
  configTree,
  new Funnel(testsTree, { destDir: 'tests'})
  ], { overwrite: true });


var outputList = [mobile, configTree];

if (process.env['CLIQZ_ENVIRONMENT'] !== 'production') {
  outputList.push(new Funnel(testsTree, { destDir: 'tests'}));
  outputList.push(new Funnel(outputTreeDev, { destDir: 'dev' }));
}

var outputTree = new MergeTrees(outputList, { overwrite: true });

// Output
module.exports = outputTree;
