import { readFile, writeFile, mkdir } from './fs';

function makeDirRecursive(path, from = []) {
  const [first, ...rest] = path;

  if (!first) {
    return Promise.resolve();
  }

  return mkdir(from.concat(first)).then(() =>
    makeDirRecursive(rest, from.concat(first))
  );
}

export default class Storage {
  constructor(filePath) {
    this.filePath = filePath;
  }

  load() {
    return readFile(this.filePath);
  }

  save(data) {
    const dirPath = this.filePath.slice(0, -1);
    return makeDirRecursive(dirPath).then(() => {
      try {
        // If TextEncoder is not available just use `data`
        return (new TextEncoder()).encode(data);
      } catch (e) {
        return data;
      }
    }).then(encoded => writeFile(this.filePath, encoded));
  }
}
