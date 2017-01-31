#!/usr/bin/env node

'use strict';

const assert = require('assert');
const childProcess = require('child_process');
const os = require('os');

if (process.argv[2] === "install") {
  let command = "npm";
  if (os.platform().indexOf('win') == 0) {
    command += ".cmd"
  }
  const npmInstall = childProcess.spawn(command, ['install'], { stdio: [0,1,2] });
  npmInstall.on('exit', function () { fern() });
} else {
  fern();
}

function fern() {
const program = require('commander');
const spaws = require('cross-spawn');
const fs = require('fs');
const wrench = require('wrench');
const walk = require('walk');
const colors = require('colors');
const broccoli = require('broccoli');
const Testem = require('testem')
const path = require('path')
const rimraf = require('rimraf');
const chalk = require('chalk');
const notifier = require('node-notifier');

let CONFIG;
let OUTPUT_PATH;

colors.setTheme({
  silly: 'rainbow',
  input: 'grey',
  verbose: 'cyan',
  prompt: 'grey',
  info: 'green',
  data: 'grey',
  help: 'cyan',
  warn: 'yellow',
  debug: 'blue',
  error: 'red'
});

// Install git hooks:
let hookInstaller = spaws('git-hooks/install-hooks.sh');
hookInstaller.stderr.on('data', data => console.log(data.toString()));
hookInstaller.stdout.on('data', data => console.log(data.toString()));

function setConfigPath(configPath, buildIntoSubdir) {
  configPath = configPath || process.env['CLIQZ_CONFIG_PATH'] || './configs/jenkins.json'
  process.env['CLIQZ_CONFIG_PATH'] = configPath;
  CONFIG = JSON.parse(fs.readFileSync(configPath));
  CONFIG.subprojects = CONFIG.subprojects || [];

  const configName = path.basename(configPath);
  let defaultBuildDir = path.resolve(__dirname, 'build');
  if (buildIntoSubdir)
      defaultBuildDir = path.join(defaultBuildDir, path.parse(configPath).name);
  OUTPUT_PATH = ('CLIQZ_OUTPUT_PATH' in process.env) ?
      path.resolve(process.env.CLIQZ_OUTPUT_PATH) :
      defaultBuildDir;
}

function buildFreshtabFrontEnd() {
  const configPath = process.env['CLIQZ_CONFIG_PATH'];
  var app = 'fresh-tab-frontend',
      appPath = 'subprojects/' + app,
      shouldBuild = function() {
        if(CONFIG.subprojects.indexOf('fresh-tab-frontend') === -1) {
          return false;
        }
        if(!fs.existsSync(path.join(appPath, 'dist'))) {
          return true;
        }
        if(process.env['CLIQZ_FRESHTAB'] !== 'undefined') {
          return true;
        }
        return false;
      };
  if(!shouldBuild()) {
    return
  }

  rimraf.sync(appPath + 'dist', []);
  console.log(`Building Ember app: ${app}`);
  var spawed = spaws.sync('./node_modules/ember-cli/bin/ember', ['build', '--output-path=dist', '--environment=production'], { stdio: 'inherit', stderr: 'inherit', cwd: appPath});
  if(spawed.status === 1) {
    console.log(chalk.red('*** RUN `./fern.js install` to install missing Freshtab ember dependencies'));
    process.exit(1);
  }
}

function buildChromeHumanWeb(mode) {
  const configPath = process.env['CLIQZ_CONFIG_PATH'];
  const chromeManifest = JSON.parse(fs.readFileSync('specific/chromium/manifest.json'));
  let finalManifest = {};
  finalManifest.key = chromeManifest.key;
  finalManifest.name = chromeManifest.name;
  finalManifest.version = chromeManifest.version;
  finalManifest.manifest_version = chromeManifest.manifest_version;
  finalManifest.description = chromeManifest.description;
  finalManifest.incognito = chromeManifest.incognito;
  finalManifest.permissions = chromeManifest.permissions;
  finalManifest.content_security_policy = chromeManifest.content_security_policy;
  finalManifest.version_name = "packaged";
  if(mode === "production"){
    finalManifest.chrome_url_overrides = chromeManifest.chrome_url_overrides;
  }
  var app = 'chrome-test-hw-hpn',
      appPath = 'subprojects/' + app,
      modulePath = appPath + '/hw/',
      manifestPath = modulePath + 'manifest.json',
      shouldBuild = function() {
        if(CONFIG.subprojects.indexOf('chrome-test-hw-hpn') === -1) {
          return false;
        }

        if(process.env['chrome-test-hw-hpn'] !== 'undefined') {
          return true;
        }
        return false;
      };

  if(!shouldBuild()) {
    return
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath));
  const newPath = "js/hw/";
  let newScript = [];
  let newPermission = [];
  manifest.background.scripts.forEach( e=> {
    newScript.push(`${newPath}${e}`);
  });
  finalManifest.background = {"scripts": newScript};

  manifest.permissions.forEach( e=> {
    finalManifest.permissions.push(e);
  });

  // Need version name, to map content.js to correct path.
  // manifest.version_name = "packaged";

  wrench.copyDirSyncRecursive(modulePath, path.join(OUTPUT_PATH, 'js', 'hw'), {
      forceDelete: true
  });

  var stream = fs.createWriteStream(path.join(OUTPUT_PATH, "manifest.json"));
  stream.once('open', function(fd) {
    stream.write(JSON.stringify(finalManifest, null, 2));
    stream.end();
  });

  rimraf.sync(path.join(OUTPUT_PATH, 'js', 'hw', 'manifest.json'));
}

function isPackageInstalled(pkg, options, msg) {
  var spawned = spaws.sync(pkg, [options], { stderr: 'inherit' });
  if(spawned.error !== null) {
    console.log(chalk.red(msg));
    process.exit(1);
  }
}

function getExtensionVersion(version) {
  return new Promise(resolve => {
    switch (version) {
      case 'tag':
        const git = require('git-rev');
        git.tag(resolve);
        break;
      case 'package':
        fs.readFile('package.json', (err, data) => resolve(JSON.parse(data).version));
        break;
      default:
        resolve(version);
    }
  });
}

program.command('install')
       .action(() => {
          isPackageInstalled('bower', '--silent', 'npm bower package missing, to install it run `npm install bower -g`');
          isPackageInstalled('broccoli', '-V', 'npm broccoli-cli package is missing, to install it run `npm install broccoli-cli -g`');

          console.log(chalk.green('Installing project dependencies'));
          spaws.sync('bower', ['install'], { stdio: 'inherit', stderr: 'inherit'});

          console.log(chalk.green('Installing ember freshtab dependencies'));
          spaws.sync('npm', ['install'], { stdio: 'inherit', stderr: 'inherit', cwd: 'subprojects/fresh-tab-frontend'});
          spaws.sync('bower', ['install'], { stdio: 'inherit', stderr: 'inherit', cwd: 'subprojects/fresh-tab-frontend'});
          console.log(chalk.green('DONE!'))
       });

program.command('build [file]')
       .option('--no-maps', 'disables source maps')
       .option('--version [version]', 'sets extension version', 'package')
       .option('--freshtab', 'enables ember fresh-tab-frontend build')
       .option('--environment <environment>', 'to generate comprehensive manifest.json')
       .option('--to-subdir', 'build into a subdirectory named after the config')
       .option('--instrument-functions [ms]', 'log all modules function calls which take more than given ms')
       .action((configPath, options) => {
          var buildStart = Date.now();
          setConfigPath(configPath, options.toSubdir);

          process.env['CLIQZ_ENVIRONMENT'] = options.environment || 'development';
          process.env['CLIQZ_SOURCE_MAPS'] = options.maps;
          process.env['CLIQZ_FRESHTAB'] = options.freshtab;
          if (options.instrumentFunctions !== undefined) {
            process.env['CLIQZ_INSTRUMENT_FUNCTIONS'] = options.instrumentFunctions;
          }

          console.log("Starting build");

          buildFreshtabFrontEnd();
          cleanupDefaultBuild();

          getExtensionVersion(options.version).then(tag => {
            process.env.EXTENSION_VERSION = tag;
            assert(OUTPUT_PATH);
            let child = spaws('broccoli', ['build', OUTPUT_PATH]);
            child.stderr.on('data', data => console.log(data.toString()));
            child.stdout.on('data', data => console.log(data.toString()));
            child.on('close', code => {
              buildChromeHumanWeb(options.environment || 'development');
              console.log(code === 0 ? 'done - ' + (Date.now() - buildStart) +'ms' : '');
            })
          });
       });

function cleanupDefaultBuild() {
  assert(OUTPUT_PATH);
  const outDirInsideRepo = OUTPUT_PATH.indexOf(__dirname) === 0;
  console.log(OUTPUT_PATH, __dirname, outDirInsideRepo);
  if (outDirInsideRepo)
    rimraf.sync(OUTPUT_PATH);
  else
    console.log("Won't remove output directory because it's outside of the repo.");
}

function createBuildWatcher() {
  cleanupDefaultBuild();
  const node = broccoli.loadBrocfile();
  const builder = new broccoli.Builder(node, {
    outputDir: OUTPUT_PATH
  });
  // maybe we can run watcher without server
  // but then we will have to copy build artifacts to 'output' folder
  const server = broccoli.server.serve(builder, {
    port: 4300,
    host: 'localhost'
  });
  return server.watcher;
}
program.command('serve [file]')
       .option('--no-maps', 'disables source maps')
       .option('--version [version]', 'sets extension version', 'package')
       .option('--environment <environment>', 'to generate comprehensive manifest.json')
       .option('--freshtab', 'disables ember fresh-tab-frontend build')
       .option('--instrument-functions [ms]', 'log all modules function calls which take more than given ms')
       .action((configPath, options) => {
          setConfigPath(configPath);
          process.env['CLIQZ_ENVIRONMENT'] = options.environment || 'development';
          process.env['CLIQZ_SOURCE_MAPS'] = options.maps;
          process.env['CLIQZ_FRESHTAB'] = options.freshtab;
          if (options.instrumentFunctions !== undefined) {
            process.env['CLIQZ_INSTRUMENT_FUNCTIONS'] = options.instrumentFunctions;
          }
          buildFreshtabFrontEnd();

          getExtensionVersion(options.version).then(tag => {
            process.env.EXTENSION_VERSION = tag;

            const watcher = createBuildWatcher();

            watcher.on('change', function() {
              notifier.notify({
                title: "Fern",
                message: "Build complete",
                time: 1500
              });
            });
          });
       });

program.command('test [file]')
       .option('--ci [output]', 'Starts Testem in CI mode')
       .option('--grep [pattern]', 'only run tests matching <pattern>')
       .action( (configPath, options) => {
          "use strict";
          setConfigPath(configPath);
          const watcher = createBuildWatcher();

          if (options.grep) {
            process.env["MOCHA_GREP"] = options.grep;
          }

          if (options.ci) {
            watcher.on('change', function() {
              const Testem = require('testem');
              const testem = new Testem();

              // TODO: Find a way to fix testem with too many tests

              testem.startCI({
                debug: true,
                host: 'localhost',
                port: '4200',
                launch_in_ci: CONFIG['testem_launchers'],
                reporter: 'xunit',
                report_file: options.ci
              });
            });
          } else {
            let server;
            watcher.on('change', function() {
              notifier.notify({
                title: "Fern",
                message: "Build complete",
                time: 1500
              });
              if (!server) {
                server = childProcess.fork(path.join(__dirname, 'fern/testemProcess.js'));
                server.send({
                  cmd: 'start',
                  options: {
                    host: 'localhost',
                    port: '4200',
                    launch_in_dev: CONFIG["testem_launchers"],
                  }
                });
                server.on('exit', function() {
                  process.emit('SIGINT')
                });
              } else {
                server.send({cmd: 'restart'});
              }
            });
          }
       });

program.command('generate <type> <moduleName>')
       .description('available types: module')
       .action((type, moduleName) => {
         if(type !== 'module') {
           console.error(`Error: generate does not support type - '${type}'`);
           return;
         }

        const modulePath = `modules/${moduleName}`;

        try {
          fs.lstatSync(modulePath);

          // lstatSync throws error if Directory does not exist, which is
          // the only situation that generator can work.
          console.log(e);
          console.error(`Error: module '${moduleName}' already exists`);
          return;
        } catch (e) {
        }

        wrench.copyDirSyncRecursive('fern/templates/module', modulePath);

        console.log('installing module');
        walk.walk(modulePath).on('file', (root, stat, next) => {
          console.log('  create'.info, `${root}/${stat.name}`);
          next();
        });
       });

program.parse(process.argv);
}
