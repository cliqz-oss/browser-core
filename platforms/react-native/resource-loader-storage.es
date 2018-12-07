/* eslint no-param-reassign: off */

import { readFile, writeFile } from './fs';
import resources from '../../resources';
import console from './console';

function getBundlePath(filePath) {
  if (typeof filePath === 'string') {
    filePath = [filePath];
  }
  return filePath.join('/').replace('cliqz/', '');
}

export function getBundle(path) {
  // if resources are lazy loaded, a getter will exist
  if (resources.get) {
    return resources.get(path);
  }
  // otherwise, we just have a dictionary of resources
  if (path in resources) {
    return Promise.resolve(JSON.stringify(resources[path]));
  }
  return Promise.reject();
}

export default class Storage {
  constructor(filePath) {
    this.filePath = filePath;
  }

  load() {
    return readFile(this.filePath).catch(() => {
      console.log('resource loader', this.filePath, 'file not found, try assets');
      return getBundle(getBundlePath(this.filePath)).then((ret) => {
        console.log('resource loader', this.filePath, 'found in assets');
        return ret;
      });
    });
  }

  save(data) {
    return writeFile(this.filePath, data);
  }
}
