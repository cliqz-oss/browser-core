#!/usr/bin/env node

// cleans the repo for an easier AMO review
const config = require('./configs/amo-webextension.js');
const rimraf = require('rimraf');
const fs = require('fs');
const path = require('path');


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

cleanFolders('./', ['.github', 'bin', 'tests'], false);
cleanFolders('modules', fs.readdirSync('modules').filter(module => !amoModules.includes(module)), false);
cleanFolders('modules', ['tests'], true);
cleanFolders('modules', ['debug'], true);
cleanFolders('specific', ['cliqz-android', 'firefox', 'node','react-native', 'browser', 'cliqz-tab', 'ghostery-tab', 'offers', 'web'], false);
cleanFolders('platforms', ['node', 'react-native', 'web'], false);
cleanFolders('configs', ['ci', 'experiments', 'releases'], false);

cleanFolderWithExceptions('./', ['.eslintignore', '.eslintrc', '.gitignore', 'LICENSE', 'README.md', 'VERSION', 'amocleaner.js', 'amobuilder.sh', 'config.es', 'fern.js', 'package.json','package-lock.json', 'Brocfile.js'], false);
cleanFolderWithExceptions('broccoli', ['modules', 'Brocfile.webextension.js', 'modules-tree.js', 'cliqz-env.js', 'config.js', 'util.js', 'instrument.js', 'specific-tree.js'], false);
cleanFolderWithExceptions('configs', ['amo-webextension.js'], false);

cleanSpecificFilesFromFolder('modules', ['debug.html', 'debug0.html', 'debug.bundle.es', 'inspect.bundle.es']);
cleanSpecificFilesFromFolder('configs', ['ghostery-urls.js']);

