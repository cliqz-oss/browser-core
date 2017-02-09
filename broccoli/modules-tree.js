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

var Instrument = require('./instrument');

const bowerComponents = new UnwatchedDir('bower_components');
const modulesTree = new WatchedDir('modules');
const subprojectsTree = new UnwatchedDir('subprojects');

var babelOptions = {
  sourceMaps: cliqzConfig.sourceMaps ? 'inline' : false,
  filterExtensions: ['es'],
  modules: 'system',
  moduleIds: true,
  compact: false,
  blacklist: ['regenerator'],
};


const eslintOptions = {
  configFile: process.cwd() + '/.eslintrc',
};


function getPlatformFunnel() {
  return new Funnel(new WatchedDir('platforms/'), {
    exclude: ['**/tests/**/*'],
  });
}


function getPlatformTree() {
  let platform = getPlatformFunnel();

  platform = Babel(platform, Object.assign({}, babelOptions, {
    getModuleId(moduleId) {
      const moduleName = moduleId.split('/');
      moduleName.shift();
      return `platform/${moduleName.join('/')}`;
    },
  }));

  return new Funnel(platform, {
    srcDir: cliqzConfig.platform,
    destDir: 'platform',
  });
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


function getSourceFunnel() {
  return new Funnel(modulesTree, {
    include: cliqzConfig.modules.map(name => `${name}/sources/**/*.es`),
    exclude: cliqzConfig.modules.map(name => `${name}/sources/**/*.browserify`),
    getDestinationPath(path) {
      return path.replace("/sources", "");
    }
  });
}



function testGenerator(relativePath, errors) {
  return `
  System.register("tests/${relativePath.replace('.es', '.lint-test.js')}", [], function (_export) {
  "use strict";

  return {
    setters: [],
    execute: function () {
      _export("default", describeModule("core/lint", function () { return {}; }, function () {
        describe("Check eslint on ${relativePath}", function () {
          it('should have no style error', function () {
            chai.expect(${errors.length}).to.equal(0);
          });
        });
      }));
      }
  };
});
  `;
}


function getLintTestsTree() {
  // Load .eslintignore
  let eslintIgnore;
  try {
    const lines = fs.readFileSync(process.cwd() + '/.eslintignore', 'utf8').split('\n');
    eslintIgnore = new Set(lines);
  } catch (e) {
    eslintIgnore = new Set();
  }

  // Checks if the given path is in .eslintignore file
  const shouldNotLint = (filePath, srcDir) => {
    const isPlatform = srcDir !== undefined;
    let fullPath;
    if (isPlatform) {
      fullPath = `platforms/${srcDir}/${filePath}`;
    } else {
      fullPath = `modules/${filePath}`;
    }

    return eslintIgnore.has(fullPath);
  };

  // Generate tree of test files for eslint
  const generateTestTree = (tree, destDir, srcDir) => {
    const treeToLint = new Funnel(tree, {
      srcDir,
      exclude: [filePath => shouldNotLint(filePath, srcDir)],
    });
    const esLinterTree = eslint(treeToLint, {
      options: eslintOptions,
      testGenerator,
    });
    esLinterTree.extensions = ['es'];

    return new Funnel(esLinterTree, { destDir });
  };

  const platform = getPlatformFunnel();
  const sources = getSourceFunnel();

  return new MergeTrees([
    generateTestTree(platform, 'tests/platform', cliqzConfig.platform),
    generateTestTree(sources, 'tests'),
  ]);
}


function getSourceTree() {
  let sources = getSourceFunnel();

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

  if (cliqzConfig.instrumentFunctions !== undefined) {
    let threshold = parseInt(cliqzConfig.instrumentFunctions)||0;
    sources = new Instrument(sources, {threshold:threshold});
  }
  const transpiledSources = Babel(
    sources,
    babelOptions
  );
  let transpiledModuleTestsTree = Babel(
    new Funnel(moduleTestsTree, { destDir: 'tests' }),
    babelOptions
  );

  let sourceTrees = [
    browserifyTree,
    transpiledSources,
  ];
  if ((cliqzConfig.environment !== 'production') &&
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
        namespace: 'templates'
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
        System.register('${templatesTree.name}/templates', [], function (_export) {
        if (typeof templates === 'undefined') { var templates = {};}
      `,
      footer: `
          _export('default', templates);
        });
      `
    });
  })

  return new MergeTrees(trees);
}

const esTree = new MergeTrees([
  getPlatformTree(),
  getSourceTree(),
  getHandlebarsTree(),
]);

const staticTree = new MergeTrees([
  getDistTree(),
  getSassTree(),
]);

const bowerTree = new MergeTrees([
  new Funnel(bowerComponents, { include: Array.from(requiredBowerComponents) }),
]);

const styleCheckTestsTree = getLintTestsTree();


module.exports = {
  static: staticTree,
  modules: esTree,
  bower: bowerTree,
  styleTests: styleCheckTestsTree,
};
