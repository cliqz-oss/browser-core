// not available in older FF versions
try {
  Components.utils.import('resource://gre/modules/osfile.jsm');
} catch(e) { }

function getFullPath(filePath) {
  if ( typeof filePath === 'string' ) {
    filePath = [filePath];
  }
  return OS.Path.join(OS.Constants.Path.profileDir, ...filePath);
}

function encodeText(text) {
  return (new TextEncoder()).encode(text);
}

function decodeText(array) {
  return (new TextDecoder()).decode(array);
}

export function readFile(filePath, {isText}={}) {
  const path = getFullPath(filePath);
  const data = OS.File.read(path);

  return isText ? decodeText(data) : data;
}

export function writeFile(filePath, data, {isText}={}) {
  const path = getFullPath(filePath);

  return OS.File.writeAtomic(path, isText ? encodeText(data) : data);
}

export function mkdir(dirPath) {
  const path = getFullPath(dirPath);

  return OS.File.makeDir(path, { ignoreExisting: true });
}
