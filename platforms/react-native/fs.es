/* eslint no-param-reassign: off */

// import RNFS from 'react-native-fs';
import { AsyncStorage } from 'react-native';

const PREFIX = '@fs:';

function getFullPath(filePath) {
  if (typeof filePath === 'string') {
    filePath = [filePath];
  }
  return filePath.join('_');
}

function getKey(filePath) {
  return `${PREFIX}${getFullPath(filePath)}`;
}

export function readFile(filePath) {
  const key = getKey(filePath);
  return AsyncStorage.getItem(key).then((value) => {
    if (value === null) {
      return Promise.reject();
    }
    return Promise.resolve(value);
  });
}

export function writeFile(filePath, data) {
  const key = getKey(filePath);
  if (typeof data !== 'string') {
    data = JSON.stringify(data);
  }
  return AsyncStorage.setItem(key, data);
}

export function mkdir() {
  return Promise.resolve();
}
