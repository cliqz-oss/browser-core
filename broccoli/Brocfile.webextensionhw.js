
const funnel = require('broccoli-funnel');
const MergeTrees = require('broccoli-merge-trees');
const concat = require('broccoli-sourcemap-concat');
const replace = require('broccoli-string-replace');

const appRoot = 'subprojects/chrome-test-hw-hpn/hw/';
const moduleRoot = 'modules/hpn/dist/content';

// Configure end-points.
var writeFile = require('broccoli-file-creator');
var util = require('./util');
var cliqzConfig = require('./config');
const html = funnel(appRoot, {
  include   : ['**/*'],
  destDir : 'human-web/'
});

const mergeFolders = new MergeTrees([
	appRoot + '/hpn-worker/content',
	moduleRoot,
	'bower_components/bigint/'
], { overwrite: true });

const hwFiles = concat(mergeFolders, {
  outputFile: 'human-web/hpn-worker.js',
  inputFiles: [
    "**/*.js",
  ],
  allowNone: true
});

const outputList = [html, hwFiles];

var outputTree = new MergeTrees(outputList, { overwrite: true });
var config          = writeFile('cliqz.json', JSON.stringify(cliqzConfig));
console.log('Source maps:', cliqzConfig.sourceMaps);
console.log(cliqzConfig);

var configTree = util.injectConfig(outputTree, config, 'cliqz.json', [
	'human-web/hpn.js',
	'human-web/human-web.js',
	'human-web/hpn-worker.js'
]);

outputTree = new MergeTrees([
	outputTree,
	configTree
	], { overwrite: true }
)

module.exports = outputTree;