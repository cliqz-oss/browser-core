/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const execa = require('execa');
const git = require('ggit');
const child = require('child_process');

const { setConfigPath, getExtensionVersion, configParameter } = require('../common');

function getCommit() {
  return git.lastCommitId().then((id) => {
    if (!id || id === 'unknown') {
      throw new Error('unknown commit id');
    }
    return id;
  });
}

module.exports = (program) => {
  program.command(`pack ${configParameter}`)
    .action((configPath) => {
      const cfg = setConfigPath(configPath);
      const CONFIG = cfg.CONFIG;

      getCommit()
        .then((id) => { process.env.GIT_COMMIT = id; }, () => {})
        .then(() => getExtensionVersion('package', CONFIG))
        .then((version) => {
          process.env.PACKAGE_VERSION = version;
          process.env.EXTENSION_VERSION = version;

          if (!process.env.VERSION) {
            process.env.VERSION = version;
          }

          if (!CONFIG.pack) {
            throw new Error('Pack not defined in config file');
          }

          const output = execa.shellSync(`bash -c "${CONFIG.pack}"`).output[1] || '';
          console.log(output);
        })
        .catch((e) => {
          console.error('Something went wrong', e);
          process.exit(1);
        });
    });

  program.command('sign [file]')
    .action((configPath) => {
      const cfg = setConfigPath(configPath);
      const CONFIG = cfg.CONFIG;

      getCommit()
        .then((id) => { process.env.GIT_COMMIT = id; }, () => {})
        .then(() => getExtensionVersion('package', CONFIG))
        .then((version) => {
          process.env.PACKAGE_VERSION = version;
          process.env.EXTENSION_VERSION = version;


          if (!process.env.VERSION) {
            process.env.VERSION = version;
          }

          if (!CONFIG.sign) {
            console.log('Sign not defined if config file - doing nothing');
            return;
          }

          const output = execa.shellSync(`bash -c "${CONFIG.sign}"`).output[1] || '';
          console.log(output);
        })
        .catch((e) => {
          console.error('Something went wrong', e);
          process.exit(1);
        });
    });

  program.command('publish [file]')
    .action((configPath) => {
      const cfg = setConfigPath(configPath);
      const CONFIG = cfg.CONFIG;

      getCommit()
        .then((id) => { process.env.GIT_COMMIT = id; }, () => {})
        .then(() => getExtensionVersion('package', CONFIG))
        .then((version) => {
          process.env.PACKAGE_VERSION = version;
          process.env.EXTENSION_VERSION = version;

          if (!process.env.VERSION) {
            process.env.VERSION = version;
          }

          if (!CONFIG.publish) {
            throw new Error('Publish not defined in config file');
          }

          const output = child.spawn(`set -x; export PATH=$PATH:\`npm bin\`; ${CONFIG.publish}`, { shell: '/bin/bash' });
          output.stdout.on('data', (buf) => {
            console.log('[STR] stdout %s', String(buf));
          });
          output.stderr.on('data', (buf) => {
            console.log('[STR] stderr %s', String(buf));
          });
          output.on('close', (code) => {
            console.log('[END] code', code);
            if (code !== 0) {
              process.exit(code);
            }
          });
        });
    });
};
