// not available in older FF versions

/* global OS */

try {
  Components.utils.import('resource://gre/modules/osfile.jsm');
} catch (e) {
  // Nothing
}

function getFullPath(filePath) {
  const path = Array.isArray(filePath) ? filePath : [filePath];
  return OS.Path.join(OS.Constants.Path.profileDir, ...path);
}

function encodeText(text) {
  return (new TextEncoder()).encode(text);
}

function decodeText(array) {
  return (new TextDecoder()).decode(array);
}

export function readFile(filePath, { isText } = {}) {
  return OS.File.read(getFullPath(filePath))
    .then(data => (isText ? decodeText(data) : data));
}

export function writeFile(filePath, data, { isText } = {}) {
  return OS.File.writeAtomic(getFullPath(filePath), isText ? encodeText(data) : data);
}

// Not atomic truncating write
export function write(path, data, { isText } = {}) {
  // Under Unix, you'll have to specify your own unixFlags for Gecko < 27 to avoid append mode.
  const options = {};
  if (OS.Constants.libc) {
    // Own flags omitting O_APPEND, e.g.
    options.unixFlags = OS.Constants.libc.O_CREAT | OS.Constants.libc.O_WRONLY;
  }
  return OS.File.open(getFullPath(path), { write: true, append: false, truncate: true }, options)
    .then(f =>
      f.write(isText ? encodeText(data) : data)
        .then(() => f.close())
    );
}

export function mkdir(dirPath) {
  return OS.File.makeDir(getFullPath(dirPath), { ignoreExisting: true });
}

export function renameFile(oldPath, newPath) {
  return OS.File.move(getFullPath(oldPath), getFullPath(newPath));
}

export function fileExists(path) {
  return OS.File.exists(getFullPath(path));
}

export function truncateFile(path) {
  return OS.File.open(getFullPath(path), { truncate: true })
    .then(f => f.close());
}

// Opens given path file for appending, and resolves to file descriptor object,
// which can be used as input for writeStringFile and close functions
export function openForAppend(path) {
  return OS.File.open(getFullPath(path), { write: true, append: true });
}

// Writes to open file
export function writeFD(file, data, { isText } = {}) {
  return file.write(isText ? encodeText(data) : data);
}

// Closes open file
export function closeFD(file) {
  return file.close();
}

export function removeFile(path) {
  return OS.File.remove(getFullPath(path), { ignoreAbsent: true });
}

export function createFile(path) {
  return OS.File.open(getFullPath(path), { write: true, create: true })
    .then(f => f.close());
}

export function getFileSize(path) {
  return OS.File.stat(getFullPath(path))
    .then(info => info.size);
}

export function pathJoin(...args) {
  return OS.Path.join(...args);
}
