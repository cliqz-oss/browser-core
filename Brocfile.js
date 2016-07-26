"use strict";
var Funnel = require('broccoli-funnel');
var MergeTrees = require('broccoli-merge-trees');
var compileSass = require('broccoli-sass-source-maps');
var concat = require('broccoli-sourcemap-concat');
var jade = require('broccoli-jade');
var fs = require('fs');
var path = require('path');
var Babel = require('broccoli-babel-transpiler');
var amdNameResolver = require('amd-name-resolver');
var AssetRev = require('broccoli-asset-rev');
var uglify = require('broccoli-uglify-sourcemap');
var writeFile = require('broccoli-file-creator');
var JSHinter = require('broccoli-jshint');
var ConfigReplace = require('broccoli-config-replace');

// build environment
var buildEnv = process.env.CLIQZ_BUILD_ENV || 'development';

// source maps
var sourceMaps = process.env.CLIQZ_SOURCE_MAPS == 'false' ? false : true;

// input trees
var bowerComponents = new Funnel('bower_components');
var nodeModules    = new Funnel('node_modules');
var firefoxSpecific = new Funnel('specific/firefox/cliqz@cliqz.com');
var firefoxPackage  = new Funnel('specific/firefox/package');
var mobileSpecific  = new Funnel('specific/mobile', { exclude: ['skin/sass/**/*', '*.py'] });
var webSpecific     = new Funnel('specific/web');
var generic         = new Funnel('generic');
var libs            = new Funnel(generic, { srcDir: 'modules/libs' });
var global          = new Funnel(generic, { srcDir: 'modules/global' });
var local           = new Funnel(generic, { srcDir: 'modules/local', exclude: ['views/**/*'] });
var staticViews     = new Funnel(generic, { srcDir: 'modules/local/views' });

// Build configuration
var configFilePath  = process.env['CLIQZ_CONFIG_PATH'];
var cliqzConfig     = JSON.parse(fs.readFileSync(configFilePath));

// start - setting up frameScript whitelist
cliqzConfig.settings.frameScriptWhitelist = cliqzConfig.settings.frameScriptWhitelist || [];
if (buildEnv === 'development') {
  // freshtab development server
  cliqzConfig.settings.frameScriptWhitelist.push('http://localhost:3000/');
}
// end


var platform = new Funnel('platforms/'+cliqzConfig.platform, {
  exclude: ['tests/**/*']
});
var platformTests = new Funnel('platforms/'+cliqzConfig.platform, {
  include: ['tests/**/*']
});
platform = Babel(platform, {
  sourceMaps: sourceMaps ? 'inline' : false,
  filterExtensions: ['es'],
  modules: 'system',
  moduleRoot: 'platform'
});

webSpecific = jade(webSpecific);

var mobileCss = compileSass(
  ['specific/mobile/skin/sass'],
  'style.sass',
  'style.css',
  { sourceMap: sourceMaps }
);


var babelOptions = {
  sourceMaps: sourceMaps ? 'inline' : false,
  filterExtensions: ['es'],
  modules: 'system',
  moduleIds: true,
  compact: false
};

// Attach subprojects
let transpilableModuleNames = [];
var requiredBowerComponents = new Set();

cliqzConfig.rawModules = [];
cliqzConfig.modules.slice(0).forEach(function (name) {
  let configJson = "{}";

  try {
    configJson = fs.readFileSync('modules/'+name+'/config.json');
  } catch(e) {
    // Existance of config.json is not required
  }

  let config = JSON.parse(configJson);

  (config.bower_components || []).forEach(Set.prototype.add.bind(requiredBowerComponents));

  if (config.transpile !== false ){
    transpilableModuleNames.push(name);
  } else {
    cliqzConfig.modules.splice(cliqzConfig.modules.indexOf(name), 1);
    cliqzConfig.rawModules.push(name);
  }
});

// cliqz.json should be saved after not transpiled modules are removed from configration
var config          = writeFile('cliqz.json', JSON.stringify(cliqzConfig));
console.log('Configuration file:', configFilePath);
console.log('Source maps:', sourceMaps);
console.log(cliqzConfig);
// cliqz.json is finalized

// START - ES TREE
let sources = new Funnel('modules', {
  include: transpilableModuleNames.map(name => `${name}/sources/**/*.es`),
  getDestinationPath(path) {
    return path.replace("/sources", "");
  }
});

const moduleTestsTree = new Funnel('modules', {
  include: transpilableModuleNames.map(name => `${name}/tests/**/*.es`),
  getDestinationPath(path) {
    return path.replace("/tests", "");
  }
});

let jsHinterTree = new JSHinter(sources, {
  jshintrcPath: process.cwd() + '/.jshintrc',
  disableTestGenerator: true
});
jsHinterTree.extensions = ['es']

let transpiledSources = Babel(sources, babelOptions);
let transpiledModuleTestsTree = Babel(
  new Funnel(moduleTestsTree, { destDir: 'tests' }),
  babelOptions
);

let sourceTrees = [
  jsHinterTree,
  transpiledSources,
];

if (buildEnv !== 'production') {
  sourceTrees.push(transpiledModuleTestsTree);
}

let sourceTree = new Funnel(
  new MergeTrees(sourceTrees),
  {
    exclude: ["**/*.jshint.js"]
  }
);
// END - ES TREE

// START - CSS TREE
let sassTrees = [];
transpilableModuleNames.forEach( name => {
  let modulePath = `modules/${name}`,
      hasStyles = false;

  try {
    fs.statSync(modulePath+"/sources/styles"); // throws if not found
    hasStyles = true;
  } catch (e) { }

  if (hasStyles) {
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
        { sourceMap: sourceMaps }
      );

      sassTrees.push(new Funnel(compiledCss, { destDir: `${name}/styles` }));
    });
  }
});
let sassTree = new MergeTrees(sassTrees);
// END - CSS TREE

// START - DIST TREE
let distTree = new Funnel("modules", {
  include: (cliqzConfig.modules.concat(cliqzConfig.rawModules)).map( name => `${name}/dist/**/*` ),
  getDestinationPath(path) {
    return path.replace("/dist", "");
  }
});
// END - DIST TREE

let modules = new MergeTrees([
  new Funnel(platform, { destDir: "platform" }),
  distTree,
  sassTree,
  sourceTree,
]);

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
  sourceMapConfig: { enabled: sourceMaps },
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
  sourceMapConfig: { enabled: sourceMaps },
});

var libsConcated = concat(libs, {
  outputFile: 'libs.js',
  inputFiles: [
    "*.js",
  ],
  sourceMapConfig: { enabled: false },
});

var bowerTree = new MergeTrees([
  new Funnel(bowerComponents, { include: Array.from(requiredBowerComponents) })
]);

var firefoxLibs = new MergeTrees([
  libs,
  new Funnel(nodeModules, { srcDir: 'es6-micro-loader/dist', include: ['system-polyfill.js'] }),
]);


var firefoxTree = new MergeTrees([
  firefoxSpecific,
  new Funnel(config,      { destDir: 'chrome/content'}),
  new Funnel(firefoxLibs, { destDir: 'modules/extern' }),
  new Funnel(global,      { destDir: 'modules' }),
  new Funnel(local,       { destDir: 'chrome/content'}),
  new Funnel(bowerTree,   { destDir: 'chrome/content/bower_components' }),
  new Funnel(modules,     { destDir: 'chrome/content' }),
], { overwrite: true } );

var firefox = new MergeTrees([
  new Funnel(firefoxTree, { destDir: 'cliqz@cliqz.com' }),
  firefoxPackage,
]);

var web = new MergeTrees([
  webSpecific,
  modules,
  new Funnel(globalConcated, { destDir: 'js' }),
  new Funnel(localConcated,  { destDir: 'js' }),
  new Funnel(libsConcated,   { destDir: 'js' }),
]);

var mobile = new MergeTrees([
  mobileSpecific,
  new Funnel(libsConcated,   { destDir: 'js' }),
  new Funnel(globalConcated, { destDir: 'js' }),
  new Funnel(mobileCss,      { destDir: 'skin/css' }),
  new Funnel(bowerTree,      { destDir: 'bower_components' }),
  new Funnel(modules,        { destDir: 'modules' })
]);

var testsTree = concat(platformTests, {
  outputFile: 'tests.js',
  inputFiles: [
    "**/*.js"
  ],
  allowNone: true,
  sourceMapConfig: { enabled: sourceMaps },
});

if (buildEnv === 'production' ) {
  mobile = new AssetRev(mobile, {
    extensions: ['js', 'css'],
    replaceExtensions: ['html', 'css', 'js'],
    generateAssetMap: true
  });
}

var trees = [
  new Funnel(firefox,  { destDir: 'firefox'       }),
  new Funnel(web,      { destDir: 'web'           }),
  new Funnel(mobile,   { destDir: 'mobile/search' }),
];

if (buildEnv !== 'production') {
  trees.push(new Funnel(new MergeTrees([
    testsTree,
  ]), { destDir: 'tests' }));
}

var outputTree = new MergeTrees(trees);

var configTree = new ConfigReplace(
  outputTree,
  config,
  {
    configPath: 'cliqz.json',
    files: [
      'firefox/cliqz@cliqz.com/modules/Extension.jsm',
      'firefox/cliqz@cliqz.com/chrome/content/core/processScript.js',
      'firefox/cliqz@cliqz.com/chrome/content/core/config.js',
      'mobile/search/modules/core/config.js'
    ],
    patterns: [{
      match: /\{\{CONFIG\}\}/g,
      replacement: config => JSON.stringify(config)
    },{
      match: /\_\_CONFIG\_\_/g,
      replacement: config => JSON.stringify(config)
    }]
  }
);

outputTree = new MergeTrees([
  outputTree,
  configTree
], { overwrite: true });

// Output
module.exports = outputTree;
