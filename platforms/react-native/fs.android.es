import RNFS from 'react-native-fs';

const BASEDIR = RNFS.DocumentDirectoryPath;

function getFullPath(_filePath) {
  let filePath = _filePath;
  if (typeof filePath === 'string') {
    filePath = [filePath];
  }
  return filePath.join('_');
}

export function readFile(filePath) {
  const fileName = getFullPath(filePath);
  return RNFS.readFile(`${BASEDIR}/${fileName}`);
}

export function writeFile(filePath, data) {
  const fileName = getFullPath(filePath);
  return RNFS.writeFile(`${BASEDIR}/${fileName}`, data);
}

export function mkdir() {
  return Promise.resolve();
}
