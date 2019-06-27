'use strict';

const fs = require('fs');
const Funnel = require('broccoli-funnel');
const concat = require('broccoli-concat');
const MergeTrees = require('broccoli-merge-trees');
const broccoliHandlebars = require('broccoli-handlebars-precompiler');

const cliqzConfig = require('../config');
const useV6Build = cliqzConfig.use_v6_build;

module.exports = function getHandlebarsTree(modulesTree) {
  const trees = cliqzConfig.modules.filter( name => {
    let modulePath = `modules/${name}`;

    try {
      fs.statSync(modulePath+"/sources/templates"); // throws if not found
      return true;
    } catch (e) {
      return false;
    }
  }).map(name => {
    const tree = new Funnel(modulesTree, {
      include: ["**/*.hbs"],
      srcDir: `${name}/sources/templates`,
      destDir: `${name}/templates`
    });
    return {
      name: name,
      tree: broccoliHandlebars(tree, {
        srcDir: `${name}/templates`,
        namespace: 'templates'
      })
    };
  }).map(function (templatesTree) {
    return concat(templatesTree.tree, {
      outputFile: `${templatesTree.name}/templates.js`,
      inputFiles: [
        "**/*.js"
      ],
      header: useV6Build ? `'use strict'; import Handlebars from 'handlebars';` : `
        'use strict';
        System.register(['handlebars'], function (_export) {
        if (typeof Handlebars === 'undefined') { var Handlebars; }
        if (typeof templates === 'undefined') { var templates = {};}
        return {
            setters: [function (_handlebars) {
              Handlebars = _handlebars['default'];
            }],
            execute: function () {
      `,
      footer: useV6Build ? `export default templates;` : `
              _export('default', templates);
            }
          };
        });
      `
    });
  })

  return new MergeTrees(trees);
}
