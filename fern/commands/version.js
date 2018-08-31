/* eslint-disable strict, no-console */

'use strict';

const program = require('commander');
const gitDescribe = require('git-describe');
const common = require('./common');

const setConfigPath = common.setConfigPath;
const getExtensionVersion = common.getExtensionVersion;
const gitDescribeSync = gitDescribe.gitDescribeSync;

program.command(`version ${common.configParameter}`)
  .option('--environment <environment>', 'development')
  .option('--infix <infix>', '', '.1b')
  .option('--prefix <prefix>', '')
  .action((configPath, options) => {
    process.env.CLIQZ_ENVIRONMENT = options.environment;

    const cfg = setConfigPath(configPath, options.toSubdir);
    const config = cfg.CONFIG;
    const infix = config.versionInfix || options.infix;
    const prefix = config.versionPrefix || options.prefix;

    getExtensionVersion('package').then((version) => {
      if (prefix) {
        const versionParts = version.split('.');
        versionParts[0] = prefix;
        version = versionParts.join('.');
      }
      // config infix implies we want to have long version number
      if (!config.infix && options.environment === 'production') {
        console.log(version);
        return;
      }

      const gitInfo = gitDescribeSync();
      const betaVersion = [
        version,
        infix,
        gitInfo.distance || '0'
      ].join('');

      console.log(betaVersion);
    });
  });

program.command('addon-version')
  .action(() => {
    getExtensionVersion('package').then(version => console.log(version));
  });
