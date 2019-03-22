"use strict";
const Funnel = require('broccoli-funnel');
const MergeTrees = require('broccoli-merge-trees');
const writeFile = require('broccoli-file-creator');
const concat = require('broccoli-concat');

const cliqzConfig = require('./config');
const modules = require('./modules-tree');
const util = require('./util');

console.log('Source maps:', cliqzConfig.sourceMaps);
console.log(cliqzConfig);
const configFile = writeFile('cliqz.json', JSON.stringify(cliqzConfig));


const modulesTree = new MergeTrees([
  modules.static,
  modules.bundles,
]);

const otherModulesTree = new Funnel(modulesTree, {
  exclude: ['serp/**/*'],
});

let serpTree = new Funnel(modulesTree, {
  srcDir: 'serp',
});

const configTree = util.injectConfig(serpTree, configFile, 'cliqz.json', [
  'index.html'
]);

serpTree = new MergeTrees([
  serpTree,
  configTree,
], { overwrite: true });

const mobile = new MergeTrees([
  configFile,
  otherModulesTree,
  serpTree,
]);

const outputList = [
  mobile,
];

if (process.env['CLIQZ_ENVIRONMENT'] !== 'production') {
  const platformTests = new Funnel('platforms/'+cliqzConfig.platform, {
    include: ['tests/**/*']
  });
  const testsTree = concat(platformTests, {
    outputFile: 'tests.js',
    inputFiles: [
      "**/*.js"
    ],
    allowNone: true,
    sourceMapConfig: { enabled: cliqzConfig.sourceMaps },
  });
  const mobileDev = new MergeTrees([
    modules.modules,
    modules.styleTests,
  ]);
  const outputTreeDev = new MergeTrees([
    mobileDev,
    new Funnel(testsTree, { destDir: 'tests'})
  ]);
  outputList.push(new Funnel(testsTree, { destDir: 'tests'}));
  outputList.push(new Funnel(outputTreeDev, { destDir: 'dev' }));
}

module.exports = new MergeTrees(outputList);
