
const funnel = require('broccoli-funnel');
const MergeTrees = require('broccoli-merge-trees');
const concat = require('broccoli-sourcemap-concat');
const replace = require('broccoli-string-replace');

const appRoot = 'subprojects/chrome-test-hw-hpn/hw/';
const moduleRoot = 'modules/hpn/dist/content';
var modules = require('./modules-tree');

// Configure end-points.
var writeFile = require('broccoli-file-creator');
var util = require('./util');
var cliqzConfig = require('./config');
const html = funnel(appRoot, {
  include   : ['**/*'],
  destDir : 'human-web/'
});

const manifestPath = '../'+appRoot+'manifest.json';
const originalManifest = require(manifestPath);
const manifest = Object.assign(originalManifest, {
  background: {
    scripts: [
      'hpn/index.bundle.js',
      ...(originalManifest.background.scripts).map(
        p => 'human-web/'+p
      )
    ]
  }
});
const manifestFile = writeFile('manifest.json', JSON.stringify(manifest, null, 2));

const outputList = [html];

var outputTree = new MergeTrees(outputList, { overwrite: true });
var config          = writeFile('cliqz.json', JSON.stringify(cliqzConfig));
console.log('Source maps:', cliqzConfig.sourceMaps);
console.log(cliqzConfig);

var configTree = util.injectConfig(outputTree, config, 'cliqz.json', [
	'human-web/human-web.js',
  'human-web/cl-utils.js',
]);

outputTree = new MergeTrees([
  modules.modules,
  modules.bundles,
	outputTree,
	configTree,
  manifestFile,
	], { overwrite: true }
)

module.exports = outputTree;
