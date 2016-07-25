// not available in older FF versions
try {
  Components.utils.import('resource://gre/modules/osfile.jsm');
} catch(e) { }

function getFullPath(filePath) {
  if ( typeof filePath === 'string' ) {
    filePath = [filePath];
  }
  CliqzUtils.log(JSON.stringify(filePath))
  return OS.Path.join(OS.Constants.Path.profileDir, ...filePath);
}

export function readFile(filePath) {
  let path = getFullPath(filePath);

  return OS.File.read(path);
}

export function writeFile(filePath, data) {
  let path = getFullPath(filePath);

  return OS.File.writeAtomic(path, data);
}

export function mkdir(dirPath) {
  let path = getFullPath(dirPath);

  return OS.File.makeDir(path, { ignoreExisting: true });
}
