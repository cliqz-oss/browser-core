import { Promise } from './cliqz';

class ResourceManager {
  constructor() {
    this.loaders = [];
    this.initialised = false;
  }

  init() {
    const loadPromises = this.loaders.map(e => this._startLoader(e.loader, e.callback));
    this.initialised = true;
    return Promise.all(loadPromises);
  }

  unload() {
    this.loaders.forEach((e) => {
      e.loader.stop();
    });
    this.initialised = false;
  }

  addResourceLoader(resourceLoader, callback) {
    this.loaders.push({
      loader: resourceLoader,
      callback,
    });
    if (this.initialised) {
      // extension is already running, we can load this resource straight away
      this._startLoader(resourceLoader, callback);
    }
  }

  _startLoader(resourceLoader, callback) {
    resourceLoader.onUpdate(callback);
    return resourceLoader.load().then(callback);
  }
}

const manager = new ResourceManager();

export default manager;
