#!/usr/bin/env node

'use strict';

const childProcess = require('child_process');

fern();

function fern() {
const program = require('commander');
const spaws = require('cross-spawn');
const fs = require('fs');
const wrench = require('wrench');
const glob = require('glob');
const colors = require('colors');
const path = require('path')
const notifier = require('node-notifier');

const common = require('./fern/commands/common');
require('./fern/commands/build');
require('./fern/commands/serve');
require('./fern/commands/test');
require('./fern/commands/pack');
require('./fern/commands/version');
require('./fern/commands/lint');

const setConfigPath = common.setConfigPath;
const getExtensionVersion = common.getExtensionVersion;
const createBuildWatcher = common.createBuildWatcher;
const cleanupDefaultBuild = common.cleanupDefaultBuild;

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

program.command('addon-id [file]')
       .action((configPath) => {
          setConfigPath(configPath);
          console.log(CONFIG.settings.id || 'cliqz@cliqz.com')
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
         glob.sync(modulePath+'/**/*').forEach(path => console.log('  created'.info, path));
       });

program.command('react-dev [config]')
      .description('run the react-native dev server')
      .action((config) => {
        const cfg = setConfigPath(config || 'configs/react-native.js');
        const CONFIG = cfg.CONFIG;
        const OUTPUT_PATH = cfg.OUTPUT_PATH;
        const projectRoots = [OUTPUT_PATH, path.resolve(process.cwd(), 'node_modules')]
        const options = ['./node_modules/react-native/local-cli/cli.js', 'start',
                         '--projectRoots', projectRoots.join(',')]
        spaws.sync('node', options, { stdio: 'inherit', stderr: 'inherit'});
      });

program.parse(process.argv);
}
