"use strict";

const program = require('commander');
const execa = require('execa');
const getLastCommit = require('last-commit');

const common = require('./common');
const setConfigPath = common.setConfigPath;
const getExtensionVersion = common.getExtensionVersion;

program.command('pack [file]')
  .action((configPath, options) => {
    const cfg = setConfigPath(configPath);
    const CONFIG = cfg.CONFIG;

    getLastCommit().then(id => {
      process.env.GIT_COMMIT = id;
      return getExtensionVersion('package')
    }).then(version => {
      process.env.VERSION = version;

      if (CONFIG.pack) {
        execa.shellSync(`bash -c "${CONFIG.pack}"`, {
          stdio: 'inherit',
        })
      } else {
        console.log('Pack not defined in config file');
      }
    });
  });

program.command('publish [file]')
  .action((configPath, options) => {
    const cfg = setConfigPath(configPath);
    const CONFIG = cfg.CONFIG;

    getLastCommit().then(id => {
      process.env.GIT_COMMIT = id;
      return getExtensionVersion('package')
    }).then(version => {
      process.env.VERSION = version;
      if (CONFIG.publish) {
        execa.shellSync(`bash -c "${CONFIG.publish}"`, {
          stdio: 'inherit',
        })
      } else {
        console.log('Publish not defined in config file');
      }
    });
  });
