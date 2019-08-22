/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const FS = {
  dirs: new Set(),
  openFiles: [],
  files: new Map(),
};

// Cannot call require here, so caller must inject 'path' nodejs module
module.exports = function (NodeJSPathModule) {
  const Path = NodeJSPathModule;

  function getFullPath(filePath) {
    const path = Array.isArray(filePath) ? filePath : [filePath];
    return Path.join(...path);
  }

  const fs = {
    _checkDirFile: (path) => {
      const dir = Path.dirname(path);
      return FS.dirs.has(dir);
    },
    renameFile: (oldPath, newPath) =>
      new Promise((resolve, reject) => {
        const f = FS.files.get(getFullPath(oldPath));
        if (f && fs._checkDirFile(getFullPath(newPath))) {
          FS.files.delete(getFullPath(oldPath));
          FS.files.set(getFullPath(newPath), f);
          resolve();
        } else {
          reject(new Error('file not found'));
        }
      }),
    fileExists: path => Promise.resolve(FS.files.has(getFullPath(path))),
    readFile: path => new Promise((resolve, reject) => {
      const f = FS.files.get(getFullPath(path));
      if (f) {
        resolve(f.join(''));
      } else {
        reject(new Error('file not found'));
      }
    }),
    write: (path, data) => new Promise((resolve, reject) => {
      if (fs._checkDirFile(getFullPath(path))) {
        FS.files.set(getFullPath(path), [data]);
        resolve();
      } else {
        reject(new Error('file dir does not exist'));
      }
    }),
    removeFile: (path) => {
      FS.files.delete(getFullPath(path));
    },
    createFile: (path) => {
      if (!FS.files.has(getFullPath(path))) {
        if (fs._checkDirFile(getFullPath(path))) {
          FS.files.set(getFullPath(path), []);
          return Promise.resolve();
        }
        return Promise.reject(new Error('File dir does not exist'));
      }
      return Promise.reject(new Error('File already exists'));
    },
    pathJoin: Path.join,
    openForAppend: (path) => {
      let f = FS.files.get(getFullPath(path));
      if (!f) {
        if (fs._checkDirFile(getFullPath(path))) {
          f = [];
          FS.files.set(getFullPath(path), f);
        } else {
          return Promise.reject(new Error('File dir does not exist'));
        }
      }
      FS.openFiles.push(f);
      return Promise.resolve(FS.openFiles.length - 1);
    },
    closeFD: (file) => {
      if (FS.openFiles[file]) {
        FS.openFiles[file] = null;
        return Promise.resolve();
      }
      return Promise.reject(new Error('file not open'));
    },
    mkdir: (dirName) => {
      FS.dirs.add(getFullPath(dirName));
      return Promise.resolve();
    },
    writeFD: (file, data) => {
      // Assume its open in append mode...
      const f = FS.openFiles[file];
      if (f) {
        f.push(data);
        return Promise.resolve();
      }
      return Promise.reject(new Error('file not found'));
    },
  };
  return fs;
};
