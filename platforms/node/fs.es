import fs from 'fs-extra';
import path from 'path';

const BASEDIR = path.join('tmp', 'storage');
const init = fs.ensureDir(BASEDIR);

function getFullPath(filePath) {
  const pathArr = typeof filePath === 'string' ? [filePath] : filePath;
  return pathArr.join('_');
}

export function readFile(filePath) {
  const fileName = getFullPath(filePath);
  return fs.readFile(`${BASEDIR}/${fileName}`, 'utf8');
}

export function writeFile(filePath, data) {
  const fileName = getFullPath(filePath);
  return init.then(() => fs.writeFile(`${BASEDIR}/${fileName}`, data));
}

export function mkdir() {
  return Promise.resolve();
}
