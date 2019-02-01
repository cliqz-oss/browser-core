'use strict';
const Funnel = require('broccoli-funnel');
const MergeTrees = require('broccoli-merge-trees');
const specificTree = require('./specific-tree');
const uglify = require('broccoli-uglify-sourcemap');

const modules = require('./modules-tree');

const localesTree = new Funnel(modules.static, {
  srcDir: 'static/locale',
  include: [
    '**/*',
  ],
  exclude: [
    '__*/**/*',
  ],
  destDir: '_locales',
});

let sourceTree = modules.bundles;

if (process.env.CLIQZ_ENVIRONMENT === 'production') {
  sourceTree = uglify(sourceTree, {
    uglify: {
      mangle: false,    // defaults to true
      compress: true,  // defaults to true
      sourceMap: false, // defaults to true
    },
  })
}

const modulesTree = new Funnel(
  new MergeTrees([
    modules.static,
    sourceTree,
    modules.styleTests,
  ]), {
    destDir: 'modules'
  }
);

module.exports = new MergeTrees([
  modulesTree,
  specificTree,
  localesTree,
]);
