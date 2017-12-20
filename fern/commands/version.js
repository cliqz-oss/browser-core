/* eslint-disable strict, no-console */

'use strict';

const program = require('commander');
const gitDescribe = require('git-describe');
const common = require('./common');

const getExtensionVersion = common.getExtensionVersion;
const gitDescribeSync = gitDescribe.gitDescribeSync;

program.command('version')
  .option('--environment <environment>', 'development')
  .action((options) => {
    process.env.CLIQZ_ENVIRONMENT = options.environment;

    getExtensionVersion('package').then((version) => {
      if (options.environment === 'production') {
        console.log(version);
        return;
      }

      const gitInfo = gitDescribeSync();
      const betaVersion = [
        version,
        '.1b',
        gitInfo.distance || '0'
      ].join('');

      console.log(betaVersion);
    });
  });

program.command('addon-version')
  .action(() => {
    getExtensionVersion('package').then(version => console.log(version));
  });
