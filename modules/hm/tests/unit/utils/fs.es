const FS = {
  dirs: new Set(),
  openFiles: [],
  files: new Map(),
};

// Cannot call require here, so caller must inject 'path' nodejs module
function FSBuilder(NodeJSPathModule) {
  const Path = NodeJSPathModule;
  const fs = {
    _checkDirFile: (path) => {
      const dir = Path.dirname(path);
      return FS.dirs.has(dir);
    },
    renameFile: (oldPath, newPath) => {
      return new Promise((resolve, reject) => {
        const f = FS.files.get(oldPath);
        if (f && fs._checkDirFile(newPath)) {
          FS.files.delete(oldPath);
          FS.files.set(newPath, f);
          resolve();
        } else {
          reject(new Error('file not found'));
        }
      });
    },
    fileExists: (path) => {
      return Promise.resolve(FS.files.has(path));
    },
    readFile: (path) => {
      return new Promise((resolve, reject) => {
        const f = FS.files.get(path);
        if (f) {
          resolve(f.join(''));
        } else {
          reject(new Error('file not found'));
        }
      });
    },
    write: (path, data) => {
      return new Promise((resolve, reject) => {
        if (fs._checkDirFile(path)) {
          FS.files.set(path, [data]);
          resolve();
        } else {
          reject('file dir does not exist');
        }
      });
    },
    removeFile: (path) => {
      FS.files.delete(path);
    },
    createFile: (path) => {
      if (!FS.files.has(path)) {
        if (fs._checkDirFile(path)) {
          FS.files.set(path, []);
          return Promise.resolve();
        }
        return Promise.reject(new Error('File dir does not exist'));
      }
      return Promise.reject(new Error('File already exists'));
    },
    pathJoin: Path.join,
    openForAppend: (path) => {
      let f = FS.files.get(path);
      if (!f) {
        if (fs._checkDirFile(path)) {
          f = [];
          FS.files.set(path, f);
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
      FS.dirs.add(dirName);
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
}

export default FSBuilder;
