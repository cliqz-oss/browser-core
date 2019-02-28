import background from '../core/base/background';
import WorkerManager from './worker-manager';


/**
  @namespace <namespace>
  @class Background
 */
export default background({

  enabled() {
    return true;
  },

  /**
    @method init
    @param settings
  */
  init() {
    this.workerManager = new WorkerManager();
  },

  unload() {
    this.workerManager.unload();
  },

  beforeBrowserShutdown() {

  },

  events: {

  },

  actions: {
    search(query) {
      return new Promise((resolve) => {
        this.workerManager.searchFromHistory(query, resolve);
      });
    }
  }
});
