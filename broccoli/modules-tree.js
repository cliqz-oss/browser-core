"use strict";
var fs = require('fs');
var path = require('path');
var Funnel = require('broccoli-funnel');
var MergeTrees = require('broccoli-merge-trees');
var Babel = require('broccoli-babel-transpiler');
var eslint = require('broccoli-lint-eslint');
var compileSass = require('broccoli-sass-source-maps');
var broccoliSource = require('broccoli-source');
var browserify = require('broccoli-fast-browserify');
var WatchedDir = broccoliSource.WatchedDir;
var UnwatchedDir = broccoliSource.UnwatchedDir;
var broccoliHandlebars = require('broccoli-handlebars-precompiler');
var concat = require('broccoli-sourcemap-concat');

var cliqzConfig = require('./config');

const bowerComponents = new UnwatchedDir('bower_components');
const modulesTree = new WatchedDir('modules');
const subprojectsTree = new UnwatchedDir('subprojects');

var babelOptions = {
  sourceMaps: cliqzConfig.sourceMaps ? 'inline' : false,
  filterExtensions: ['es'],
  modules: 'system',
  moduleIds: true,
  compact: false
};

function getPlatformTree() {
  let platform = new Funnel(new WatchedDir('platforms/'+cliqzConfig.platform), {
    exclude: ['tests/**/*']
  });
  platform = Babel(platform, Object.assign({}, babelOptions, {
    getModuleId(moduleId) {
      return "platform/"+moduleId;
    }
  }));
  return new Funnel(platform, { destDir: "platform" });
}

// Attach subprojects
var requiredBowerComponents = new Set();

const moduleConfigs = cliqzConfig.modules.map(name => {
  let configJson;

  try {
    configJson = fs.readFileSync('modules/'+name+'/config.json');
  } catch(e) {
    // Existance of config.json is not required
    configJson = "{}";
  }

  let config = JSON.parse(configJson);
  config.name = name;
  config.transpile = typeof config.transpile === "boolean" ? config.transpile : true;

  return config;
});

moduleConfigs.forEach( config => {
  (config.bower_components || []).forEach(Set.prototype.add.bind(requiredBowerComponents));
});

function getSourceTree() {
  let sources = new Funnel(modulesTree, {
    include: cliqzConfig.modules.map(name => `${name}/sources/**/*.es`),
    exclude: cliqzConfig.modules.map(name => `${name}/sources/**/*.browserify`),
    getDestinationPath(path) {
      return path.replace("/sources", "");
    }
  });

  let nodeModulesTree = new Funnel(modulesTree, {
    include: cliqzConfig.modules.map(name => `${name}/sources/**/*.browserify`),
    getDestinationPath(path) {
      return path.replace("/sources", "");
    }
  });

  let browserifyTree = browserify(nodeModulesTree)

  const moduleTestsTree = new Funnel(modulesTree, {
    include: cliqzConfig.modules.map(name =>  `${name}/tests/**/*.es`),
    getDestinationPath(path) {
      return path.replace("/tests", "");
    }
  });

  let esLinterTree = eslint(sources, {
    options: { configFile: process.cwd() + '/.eslintrc' }
  });
  esLinterTree.extensions = ['es'];

  let transpiledSources = Babel(
    esLinterTree,
    Object.assign({}, babelOptions, { filterExtensions: ['js']})
  );
  let transpiledModuleTestsTree = Babel(
    new Funnel(moduleTestsTree, { destDir: 'tests' }),
    babelOptions
  );

  let sourceTrees = [
    browserifyTree,
    transpiledSources,
  ];

  if ((cliqzConfig.buildEnv !== 'production') &&
      (cliqzConfig.testem_launchers || []).length) {
    sourceTrees.push(transpiledModuleTestsTree);
  }

  return new Funnel(
    new MergeTrees(sourceTrees), //, { overwrite: true }),
    {
      exclude: ["**/*.jshint.js"]
    }
  );
}

function getSassTree() {
  const sassTrees = [];
  cliqzConfig.modules.filter( name => {
    let modulePath = `modules/${name}`;

    try {
      fs.statSync(modulePath+"/sources/styles"); // throws if not found
      return true;
    } catch (e) {
      return false;
    }
  }).forEach(name => {
    let modulePath = `modules/${name}`;

    fs.readdirSync( modulePath+'/sources/styles').forEach(function (file) {
      var extName = path.extname(file);

      if ( (file.indexOf('_') === 0) ||
           ['.sass', '.scss'].indexOf(extName) === -1 ) {
        return;
      }

      var compiledCss = compileSass(
        [modulePath+'/sources/styles'],
        file,
        file.replace(/\.(sass|scss)+$/, '.css'),
        { sourceMap: cliqzConfig.sourceMaps }
      );

      sassTrees.push(new Funnel(compiledCss, { destDir: `${name}/styles` }));
    });
  });

  return new MergeTrees(sassTrees);
}

function getDistTree() {
  const distTrees = [
    new Funnel(modulesTree, {
      include: cliqzConfig.modules.map( name => `${name}/dist/**/*` ),
      getDestinationPath(path) {
        return path.replace("/dist", "");
      }
    })];
  if (cliqzConfig.subprojects) {
    distTrees.push(new Funnel(subprojectsTree, {
      include: cliqzConfig.subprojects.map( name => `${name}/dist/**/*` ),
      getDestinationPath(path) {
        return path.replace("/dist", "");
      }
    }));
  }
  return new MergeTrees(distTrees);
}

function getHandlebarsTree() {
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
        namespace: 'CLIQZ.templates'
      })
    };
  }).map(function (templatesTree) {
    return concat(templatesTree.tree, {
      outputFile: `${templatesTree.name}/templates.js`,
      inputFiles: [
        "**/*.js"
      ],
      header: `
        'use strict';
        CLIQZ = CLIQZ || {};
        CLIQZ.templates = CLIQZ.templates || {};
      `,
      footer: "Handlebars.partials = CLIQZ.templates"
    });
  })

  return new MergeTrees(trees);
}

const modules = new MergeTrees([
  getPlatformTree(),
  getDistTree(),
  getSassTree(),
  getSourceTree(),
  getHandlebarsTree()
]);
const bowerTree = new MergeTrees([
  new Funnel(bowerComponents, { include: Array.from(requiredBowerComponents) })
]);

module.exports = {
  modules,
  bowerComponents: bowerTree
}
