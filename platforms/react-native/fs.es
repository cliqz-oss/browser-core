import { utils } from '../core/cliqz';
import RNFS from 'react-native-fs';

const BASEDIR = RNFS.DocumentDirectoryPath;

function getFullPath(filePath) {
  if ( typeof filePath === 'string' ) {
    filePath = [filePath];
  }
  return filePath.join('_');
}

export function readFile(filePath) {
  const fileName = getFullPath(filePath);
  return RNFS.readFile(BASEDIR + '/' + fileName);
}

export function writeFile(filePath, data) {
  const fileName = getFullPath(filePath);
  if ( typeof data !== 'string') {
    data = JSON.stringify(data);
  }
  // fs.writeFile(getFullPath(filePath), data);
  return RNFS.writeFile(BASEDIR + '/' + fileName, data);
}

export function mkdir(dirPath) {
  return Promise.resolve();
}
