import { readFile, writeFile } from './fs';

export default class Storage {
  constructor(filePath) {
    this.filePath = filePath;
  }

  load() {
    return readFile(this.filePath);
  }

  save(data) {
    return writeFile(this.filePath, data);
  }
}
