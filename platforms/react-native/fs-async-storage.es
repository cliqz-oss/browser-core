/* eslint no-param-reassign: off */

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

function getItem(key) {
  return AsyncStorage.getItem(key).then((value) => {
    if (value === null) {
      return Promise.reject();
    }
    return Promise.resolve(value);
  });
}

export function readFile(filePath) {
  const key = getKey(filePath);
  return getItem(key);
}

export function readFileAssets(filePath) {
  return getItem(filePath);
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
