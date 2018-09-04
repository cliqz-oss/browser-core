'use strict';

const program = require('commander');
const execa = require('execa');
const git = require('ggit');

const common = require('./common');

const setConfigPath = common.setConfigPath;
const getExtensionVersion = common.getExtensionVersion;

function getCommit() {
  return git.lastCommitId().then((id) => {
    if (!id || id === 'unknown') {
      throw new Error('unknown commit id');
    }
    return id;
  });
}

/* eslint-disable quotes, no-control-regex */
// source: https://stackoverflow.com/questions/1986121/match-all-urls-in-string-and-return-in-array-in-javascript
const urlRegex = new RegExp(
  "(^|[ \t\r\n])((s3|ftp|http|https|gopher|mailto|news|nntp|telnet|wais|file|prospero|aim|webcal):(([A-Za-z0-9$_.+!*(),;/?:@&~=-])|%[A-Fa-f0-9]{2}){2,}(#([a-zA-Z0-9][a-zA-Z0-9$_.+!*(),;/?:@&~=%-]*))?([A-Za-z0-9$_+!*();/?:~-]))"
  , 'g'
);
/* eslint-enable quotes, no-control-regexp */

const rewrite = (url) => {
  const prefix = 's3://cdncliqz';

  if (url.indexOf(prefix) !== 0) {
    return url;
  }

  return [
    'http://cdn2.cliqz.com',
    url.slice(prefix.length),
  ].join('');
};

const noFileUrls = url => url.indexOf('file:') !== 0;

program.command(`pack ${common.configParameter}`)
  .action((configPath) => {
    const cfg = setConfigPath(configPath);
    const CONFIG = cfg.CONFIG;

    getCommit()
      .then((id) => { process.env.GIT_COMMIT = id; }, () => {})
      .then(() => getExtensionVersion('package'))
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
      .then(() => getExtensionVersion('package'))
      .then((version) => {
        process.env.PACKAGE_VERSION = version;

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
      .then(() => getExtensionVersion('package'))
      .then((version) => {
        process.env.PACKAGE_VERSION = version;

        if (!process.env.VERSION) {
          process.env.VERSION = version;
        }

        if (!CONFIG.publish) {
          throw new Error('Publish not defined in config file');
        }
        const output = execa.shellSync(CONFIG.publish, { shell: '/bin/bash' }).output;

        const urls = Array.from(new Set((output[1] || '').match(urlRegex)));
        urls.map(url => url.trim()).filter(noFileUrls).forEach(url => console.log(rewrite(url)));
      })
      .catch((e) => {
        console.error('Something went wrong', e);
        process.exit(1);
      });
  });
