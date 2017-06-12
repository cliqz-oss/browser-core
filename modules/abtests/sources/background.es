import background from '../core/base/background';
import Client from './client';
import Manager from './manager';
import { ModuleStorage, SharedStorage } from './storage';
import { utils } from '../core/cliqz';

// one hour
const UPDATE_INTERVAL = 60 * 60 * 1000;

/**
  @namespace abtests
  @class Background
 */
export default background({
  init() {
    const client = new Client();

    const moduleStorage = new ModuleStorage();
    const sharedStorage = new SharedStorage();

    this.isRunning = false;
    this.manager = new Manager(client, moduleStorage, sharedStorage);
    return this.manager.loadTests()
      .then(() => this.start());
  },

  start() {
    if (!this.isRunning) {
      this.runTimer = utils.setInterval(
        () => this.manager.updateTests(), UPDATE_INTERVAL);
      this.isRunning = true;
    }
  },

  stop() {
    if (this.isRunning) {
      this.clearInterval(this.runTimer);
      this.isRunning = false;
    }
  },

  unload() {
    this.stop();
  },

  beforeBrowserShutdown() {

  },

  events: {

  },

  actions: {

  },
});
