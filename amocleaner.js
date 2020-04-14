#!/usr/bin/env node

// cleans the repo for an easier AMO review

const fs = require('fs');
const path = require('path');

const COMMON_CONFIGS = ['urls.js', 'system.js', 'publish.js'];
const CONFIGS = {
  cliqz: {
    configs: [],
    'configs/common': [...COMMON_CONFIGS, 'urls-cliqz.js'],
    'configs/releases': ['amo-webextension.js'],
  },
  sparalarm: {
    configs: ['offers.js'],
    'configs/common': [...COMMON_CONFIGS, 'urls-myoffrz.js'],
    'configs/releases': ['offers-chip-firefox.js', 'offers-chip-chrome.js'],
  },
  myoffrz: {
    configs: ['offers.js'],
    'configs/common': [...COMMON_CONFIGS, 'urls-myoffrz.js'],
    'configs/releases': ['offers-chip-firefox.js', 'offers-chip-chrome.js'],
  },
  gt: {
    configs: ['ghostery-tab-base.js', 'ghostery-tab-firefox.js', 'ghostery-tab-chrome.js'],
    'configs/common': [...COMMON_CONFIGS, 'urls-ghostery.js'],
    'configs/releases': ['ghostery-tab-firefox.js', 'ghostery-tab-chrome.js'],
  }
}

const REQUIRED_CONFIG = CONFIGS[process.argv[2]];
if (REQUIRED_CONFIG === undefined) {
  console.log('Usage: node amocleaner.js product');
  console.log('* product one of |cliqz|, |sparalarm|, |myoffrz| or |gt|');
  console.log('\neg: node amocleaner.js cliqz');
  return;
}

const config = require('./configs/releases/' + REQUIRED_CONFIG['configs/releases'][0]);
const amoModules = config.modules;
const removeFolder = (folder) => {
  console.log(`removing folder: ${folder}`);
  fs.rmdirSync(folder, { recursive: true });
}

// remove all files from this folder with exceptions
const cleanFolderWithExceptions = (folder, exceptions, recursive) => {
  const files = fs.readdirSync(folder);
  files.forEach((file) => {
    if (exceptions.includes(file))
      return;

    const filePath = path.join(folder, file);
    if (fs.statSync(filePath).isFile()) {
      console.log(`removing file: ${filePath}`);
      fs.unlinkSync(filePath);
    } else {
      recursive && cleanFolderWithExceptions(filePath, exceptions, true)
    }
  });
}

// removes all folders with name 'name' from the target folder recursively
const cleanFolders = (folder, targets, recursive) => {
  const pointers = fs.readdirSync(folder);
  pointers
    .forEach((pointer) => {
      const fullPath = path.join(folder, pointer);
      if (!fs.statSync(fullPath).isDirectory())
        return;

      if (targets.includes(pointer)){
        removeFolder(fullPath);
      } else {
        recursive && cleanFolders(fullPath, targets, recursive)
      }
    });
}

// removes all files with a particular name from the target folder recursively
const cleanSpecificFilesFromFolder = (folder, files) => {
  const pointers = fs.readdirSync(folder);
  pointers
    .forEach((pointer) => {
      const fullPath = path.join(folder, pointer);
      if (fs.statSync(fullPath).isDirectory()) {
        cleanSpecificFilesFromFolder(fullPath, files)
      } else {
        if (fs.statSync(fullPath).isFile() && files.includes(pointer)){
          console.log(`removing file: ${fullPath}`);
          fs.unlinkSync(fullPath);
        }
      }
    });
}

cleanFolders('./', ['.github', 'bin', 'tests', 'benchmarks', 'guides'], false);
cleanFolders('modules', fs.readdirSync('modules').filter(module => !amoModules.includes(module)), false);
cleanFolders('modules', ['tests'], true);
cleanFolders('modules', ['debug'], true);
cleanFolders('modules', ['experimental-apis'], true);
cleanFolders('specific', fs.readdirSync('specific').filter(specific => config.specific != specific), false);
cleanFolders('platforms', ['node', 'react-native', 'web'], false);
cleanFolders('configs', ['ci', 'experiments', 'base'], false);

cleanFolderWithExceptions('./', ['.eslintignore', '.eslintrc', '.gitignore', 'LICENSE', 'README.md', 'VERSION', 'amocleaner.js', 'amobuilder.sh', 'config.es', 'fern.js', 'package.json','package-lock.json', 'Brocfile.js', 'Jenkinsfile.multibranch', 'Dockerfile.publish'], false);
cleanFolderWithExceptions('broccoli', ['modules', 'Brocfile.webextension.js', 'modules-tree.js', 'cliqz-env.js', 'config.js', 'util.js', 'instrument.js', 'specific-tree.js'], false);

Object.entries(REQUIRED_CONFIG).forEach(([path, exceptions]) => {
  cleanFolderWithExceptions(path, exceptions, false);
});

cleanSpecificFilesFromFolder('modules', ['debug.html', 'debug0.html', 'debug.bundle.es', 'inspect.bundle.es']);
cleanSpecificFilesFromFolder('configs', ['ghostery-urls.js']);
