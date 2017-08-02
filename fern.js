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

  // Install npm packages
  const npmInstall = childProcess.spawn(command, ['install'], { stdio: [0,1,2] });
  npmInstall.on('exit', function () {
    const publicSuffixListUpdate = childProcess.spawn(command, ['run', 'tldjs-update-rules'], { stdio: [0,1,2] });
    publicSuffixListUpdate.on('exit', function () {
      fern();
    });
  });
} else {
  fern();
}

function fern() {
const program = require('commander');
const execa = require('execa');
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
const copyDereferenceSync = require('copy-dereference').sync

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

// Try to install git hooks:
try {
  execa.sync(
    path.join('git-hooks', 'install-hooks.sh'),
    [],
    { stdio: 'inherit' }
  );
} catch(e) {
  console.error('Cound not install git-hook', e);
}

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
      appPath = path.join('subprojects', app),
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
  var spawed = execa.sync(
    'ember',
    ['build', '--output-path=dist', '--environment=production'],
    { stdio: 'inherit', cwd: appPath}
  );
  if(spawed.status === 1) {
    console.log(chalk.red('*** RUN `./fern.js install` to install missing Freshtab ember dependencies'));
    process.exit(1);
  }
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

          console.log(chalk.green('Installing project dependencies'));
          spaws.sync('bower', ['install'], { stdio: 'inherit', stderr: 'inherit'});

          console.log(chalk.green('Installing ember freshtab dependencies'));
          spaws.sync('npm', ['install'], { stdio: 'inherit', stderr: 'inherit', cwd: 'subprojects/fresh-tab-frontend'});
          spaws.sync('bower', ['install'], { stdio: 'inherit', stderr: 'inherit', cwd: 'subprojects/fresh-tab-frontend'});
          console.log(chalk.green('DONE!'))
       });

program.command('addon-version')
       .action(() => {
          getExtensionVersion('package').then(version => {
            console.log(version)
          });
        });

program.command('addon-id [file]')
       .action((configPath) => {
          setConfigPath(configPath);
          console.log(CONFIG.settings.id || 'cliqz@cliqz.com')
        });

program.command('build [file]')
       .option('--no-maps', 'disables source maps')
       .option('--version [version]', 'sets extension version', 'package')
       .option('--freshtab', 'enables ember fresh-tab-frontend build')
       .option('--environment <environment>')
       .option('--to-subdir', 'build into a subdirectory named after the config')
       .option('--instrument-functions', 'enable function instrumentation for profiling')
       .action((configPath, options) => {
          var buildStart = Date.now();
          setConfigPath(configPath, options.toSubdir);

          process.env['CLIQZ_ENVIRONMENT'] = options.environment || 'development';
          process.env['CLIQZ_SOURCE_MAPS'] = options.maps;
          process.env['CLIQZ_FRESHTAB'] = options.freshtab;
          process.env['CLIQZ_INSTRUMENT_FUNCTIONS'] = options.instrumentFunctions || '';

          console.log("Starting build");
          buildFreshtabFrontEnd();
          cleanupDefaultBuild();

          getExtensionVersion(options.version).then(tag => {
            process.env.EXTENSION_VERSION = tag;
            assert(OUTPUT_PATH);

            cleanupDefaultBuild();
            const node = broccoli.loadBrocfile();
            const builder = new broccoli.Builder(node, {
              outputDir: OUTPUT_PATH
            });
            builder.build()
              .then(() => {
                copyDereferenceSync(builder.outputPath, OUTPUT_PATH);
                console.log('Build successful');
                process.exit(0);
              })
              .catch(err => {
                console.error('Build error', err)
                process.exit(1);
              });
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

function createBuildWatcher(port) {
  cleanupDefaultBuild();
  const node = broccoli.loadBrocfile();
  const builder = new broccoli.Builder(node, {
    outputDir: OUTPUT_PATH
  });

  const watcher = new broccoli.Watcher(builder);

  // maybe we can run watcher without server
  // but then we will have to copy build artifacts to 'output' folder
  const server = broccoli.server.serve(watcher, 'localhost', port || 4300);

  return server.watcher;
}

program.command('serve [file]')
       .option('--no-maps', 'disables source maps')
       .option('--version [version]', 'sets extension version', 'package')
       .option('--environment <environment>')
       .option('--freshtab', 'disables ember fresh-tab-frontend build')
       .option('--instrument-functions', 'enable function instrumentation for profiling')
       .option('--port [port]', 'dev server port', 4300)
       .action((configPath, options) => {
          setConfigPath(configPath);
          process.env['CLIQZ_ENVIRONMENT'] = options.environment || 'development';
          process.env['CLIQZ_SOURCE_MAPS'] = options.maps;
          process.env['CLIQZ_FRESHTAB'] = options.freshtab;
          process.env['CLIQZ_INSTRUMENT_FUNCTIONS'] = options.instrumentFunctions || '';
          buildFreshtabFrontEnd();

          getExtensionVersion(options.version).then(tag => {
            process.env.EXTENSION_VERSION = tag;

            const watcher = createBuildWatcher(Number(options.port));

            watcher.on('buildSuccess', function () {
              rimraf.sync(OUTPUT_PATH);
              copyDereferenceSync(watcher.builder.outputPath, OUTPUT_PATH);
              notifier.notify({
                title: "Fern",
                message: "Build complete",
                time: 1500
              });
            });

            watcher.on('buildFailure', function (err) {
              notifier.notify({
                title: "Fern",
                message: "Build error - "+err,
                type: 'warn',
                time: 3000
              });
            });

          }).catch(console.error);
       });

program.command('test [file]')
       .option('--ci [output]', 'Starts Testem in CI mode')
       .option('--grep [pattern]', 'only run tests matching <pattern>')
       .option('--fgrep [pattern]', 'only run tests with file names matching <pattern>')
       .action( (configPath, options) => {
          "use strict";
          setConfigPath(configPath);
          const watcher = createBuildWatcher();

          if (options.grep) {
            process.env["MOCHA_GREP"] = options.grep;
          }

          if (options.fgrep) {
            process.env["MOCHA_FGREP"] = options.fgrep;
          }

          if (options.ci) {
            watcher.on('buildSuccess', function() {
              rimraf.sync(OUTPUT_PATH);
              copyDereferenceSync(watcher.builder.outputPath, OUTPUT_PATH);
              const Testem = require('testem');
              const testem = new Testem();

              // TODO: Find a way to fix testem with too many tests

              testem.startCI({
                debug: true,
                host: 'localhost',
                port: '4200',
                launch: (CONFIG['testem_launchers_ci'] || []).join(','),
                reporter: 'xunit',
                report_file: options.ci
              });
            });
          } else {
            let server;
            watcher.on('buildSuccess', function() {
              rimraf.sync(OUTPUT_PATH);
              copyDereferenceSync(watcher.builder.outputPath, OUTPUT_PATH);
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

program.command('react-dev [config]')
      .description('run the react-native dev server')
      .action((config) => {
        setConfigPath(config || 'configs/react-native.json');
        const projectRoots = [OUTPUT_PATH, path.resolve(__dirname, 'node_modules')]
        const options = ['./node_modules/react-native/local-cli/cli.js', 'start',
                         '--projectRoots', projectRoots.join(',')]
        spaws.sync('node', options, { stdio: 'inherit', stderr: 'inherit'});
      });

program.command('react-bundle <platform> [config] [dest]')
      .description('create a react-native jsbundle')
      .option('--no-dev', 'disables warning and error messages')
      .action((platform, config, dest, cmdOptions) => {
        setConfigPath(config || 'configs/react-native.json');
        const shellOpts = { stdio: 'inherit', stderr: 'inherit'};
        const bundleName = dest || 'jsengine.bundle.js';
        var options = [
          './node_modules/react-native/local-cli/cli.js','bundle',
          '--platform', platform,
          '--entry-file', `${OUTPUT_PATH}/index.${platform}.js`,
          '--bundle-output', bundleName,
          '--assets-dest', './',
        ];
        spaws.sync('node', options, shellOpts);
        if (!cmdOptions.dev) {
          // unset __DEV__ flag
          spaws.sync('sed', ['-i', '', "s/\\(global.__DEV__ = \\)true/\\1false/", bundleName], shellOpts);
        }
      });

program.command('react-release <platform> <tag> [config]')
      .description('deploy a react bundle to the CDN')
      .action((platform, tag, config) => {
        setConfigPath(config || 'configs/react-native.json');
        const shellOpts = { stdio: 'inherit', stderr: 'inherit'};
        const bundleDir = `jsengine-${platform}-${tag}`;
        const bundleName = 'jsengine.bundle.js';
        const bundlePath = `${bundleDir}/${bundleName}`;
        const archiveName = `jsengine.${platform}.${tag}.tar.gz`

        spaws.sync('mkdir', [bundleDir]);
        // create bundle
        var options = ['./node_modules/react-native/local-cli/cli.js', 'bundle',
          '--platform', platform, '--entry-file', `${OUTPUT_PATH}/index.${platform}.js`,
          '--bundle-output', bundlePath, '--assets-dest', bundleDir];
        spaws.sync('node', options, shellOpts);
        // unset __DEV__ flag
        spaws.sync('sed', ['-i', '', "s/\\(global.__DEV__ = \\)true/\\1false/", bundlePath], shellOpts);
        // prepare package.json
        spaws.sync('cp', ['package.json', `${bundleDir}/package.json`], shellOpts);
        // create archive of bundle files
        spaws.sync('tar', ['-C', bundleDir, '-czf', archiveName, './']);
        // push to s3
        const s3Bucket = 's3://cdn.cliqz.com/mobile/jsengine/';
        spaws.sync('aws', ['s3', 'cp', archiveName, s3Bucket], shellOpts);
        // cleanup
        // spaws.sync('rm', ['-R', archiveName, bundleDir], shellOpts);
      });

program.parse(process.argv);
}
