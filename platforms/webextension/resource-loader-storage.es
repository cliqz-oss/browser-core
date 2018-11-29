import KeyValueStore from './kv-store';


export default class Storage {
  constructor(filePath) {
    this.key = [
      'resource-loader',
      ...filePath,
    ].join(':');
  }

  load() {
    return KeyValueStore.get(this.key);
  }

  save(data) {
    return KeyValueStore.set(this.key, data);
  }
}
