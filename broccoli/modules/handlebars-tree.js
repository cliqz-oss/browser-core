const fs = require('fs');
const Funnel = require('broccoli-funnel');
const concat = require('broccoli-concat');
const MergeTrees = require('broccoli-merge-trees');
const broccoliHandlebars = require('broccoli-handlebars-precompiler');

const cliqzConfig = require('../config');

module.exports = function getHandlebarsTree(modulesTree) {
  const trees = cliqzConfig.modules.filter((name) => {
    const modulePath = `modules/${name}`;

    try {
      fs.statSync(`${modulePath}/sources/templates`); // throws if not found
      return true;
    } catch (e) {
      return false;
    }
  }).map((name) => {
    const tree = new Funnel(modulesTree, {
      include: ['**/*.hbs'],
      srcDir: `${name}/sources/templates`,
      destDir: `${name}/templates`
    });
    return {
      name,
      tree: broccoliHandlebars(tree, {
        srcDir: `${name}/templates`,
        namespace: 'templates'
      })
    };
  }).map(templatesTree => concat(templatesTree.tree, {
    outputFile: `${templatesTree.name}/templates.js`,
    inputFiles: [
      '**/*.js'
    ],
    header: "'use strict'; import Handlebars from 'handlebars';",
    footer: 'export default templates;'
  }));

  return new MergeTrees(trees);
};
