import { chrome } from './globals';


export default class Storage {
  constructor(filePath) {
    this.key = [
      'resource-loader',
      ...filePath,
    ].join(':');
  }

  load() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(this.key, (values) => {
        const key = Object.keys(values);
        const value = values[key];
        if (value) {
          resolve(value);
        } else {
          reject(`resource-loader: chrome storage has no value for key ${this.key}`);
        }
      });
    });
  }

  save(data) {
    return new Promise((resolve) => {
      chrome.storage.local.set({
        [this.key]: data,
      }, resolve);
    });
  }
}
