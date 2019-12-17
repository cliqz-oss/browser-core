#!/usr/bin/env node

// cleans the repo for an easier AMO review

const rimraf = require('rimraf');
const fs = require('fs');
const path = require('path');
let CONFIG;

switch(process.argv[2]) {
  case 'cliqz':
    CONFIG = 'amo-webextension.js';
    break;
  case 'sparalarm':
    CONFIG = 'offers-chip-firefox.js';
    break;
  case 'myoffrz':
    CONFIG = 'offers-firefox.js';
    break;
  default:
    console.log('Usage: node amocleaner.js product');
    console.log('* product one of |cliqz|, |sparalarm| or |myoffrz|');
    console.log('');
    console.log('eg: node amocleaner.js cliqz');
    return;
}

const config = require('./configs/releases/' + CONFIG);
const amoModules = config.modules;
const removeFolder = (folder) => rimraf(folder, () => console.log(`removing folder: ${folder}`));

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
cleanFolders('specific', fs.readdirSync('specific').filter(specific => config.specific != specific), false);
cleanFolders('platforms', ['node', 'react-native', 'web'], false);
cleanFolders('configs', ['ci', 'experiments'], false);

cleanFolderWithExceptions('./', ['.eslintignore', '.eslintrc', '.gitignore', 'LICENSE', 'README.md', 'VERSION', 'amocleaner.js', 'amobuilder.sh', 'config.es', 'fern.js', 'package.json','package-lock.json', 'Brocfile.js', 'Jenkinsfile.multibranch', 'Dockerfile.publish'], false);
cleanFolderWithExceptions('broccoli', ['modules', 'Brocfile.webextension.js', 'modules-tree.js', 'cliqz-env.js', 'config.js', 'util.js', 'instrument.js', 'specific-tree.js'], false);
cleanFolderWithExceptions('configs', ['offers.js'], false);
cleanFolderWithExceptions('configs/releases', ['offers-chip-firefox.js', 'offers-chip-chrome.js', 'amo-webextension.js', 'offers-firefox.js', 'offers-chrome.js'], false);

cleanSpecificFilesFromFolder('modules', ['debug.html', 'debug0.html', 'debug.bundle.es', 'inspect.bundle.es']);
cleanSpecificFilesFromFolder('configs', ['ghostery-urls.js']);

