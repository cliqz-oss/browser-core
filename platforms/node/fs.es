import fs from 'fs-extra';
import path from 'path';

const BASEDIR = path.join('tmp', 'storage');

function getFullPath(filePath) {
  if (typeof filePath === 'string') {
    filePath = [filePath];
  }
  return filePath.join('_');
}

export function readFile(filePath) {
  const fileName = getFullPath(filePath);
  return fs.readFile(BASEDIR + '/' + fileName);
}

export function writeFile(filePath, data) {
  const fileName = getFullPath(filePath);
  if ( typeof data !== 'string') {
    data = JSON.stringify(data);
  }
  // fs.writeFile(getFullPath(filePath), data);
  return fs.writeFile(BASEDIR + '/' + fileName, data);
}

export function mkdir(dirPath) {
  return Promise.resolve();
}
