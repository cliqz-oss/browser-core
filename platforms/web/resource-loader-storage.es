import { window } from './globals';

export default class Storage {
  constructor(filePath) {
    this.key = [
      'resource-loader',
      ...filePath,
    ].join(':');
  }

  async load() {
    return window.localStorage.getItem(this.key);
  }

  async save(data) {
    return window.localStorage.setItem(this.key, data);
  }
}
