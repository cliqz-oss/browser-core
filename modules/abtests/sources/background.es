import background from '../core/base/background';
import getCoreVersion from './demographics';
import Client from './client';
import Manager from './manager';
import { ModuleStorage, SharedStorage } from './storage';
import { utils } from '../core/cliqz';

// half an hour
const UPDATE_INTERVAL = 30 * 60 * 1000;

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
      this.isRunning = true;
      this.updateTests();
    }
  },

  stop() {
    if (this.isRunning) {
      this.isRunning = false;
      utils.clearTimeout(this.runTimer);
    }
  },

  updateTests() {
    this.manager.updateTests();
    if (this.isRunning) {
      this.runTimer = utils.setTimeout(
        this.updateTests.bind(this), UPDATE_INTERVAL);
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
    isRunning() {
      return this.isRunning;
    },
    start() {
      return this.start();
    },
    stop() {
      return this.stop();
    },
    getCompletedTests() {
      return this.manager.completedTests;
    },
    getRunningTests() {
      return this.manager.runningTests;
    },
    getDemographics() {
      return this.manager.anolysis.action('getCurrentDemographics');
    },
    getCoreVersion() {
      return getCoreVersion();
    },
    getAvailableTests() {
      return this.manager.client.getAvailableTests();
    },
    loadTests() {
      return this.manager.loadTests();
    },
    saveTests() {
      return this.manager.saveTests();
    },
    updateTests() {
      return this.manager.updateTests();
    },
    startTest(test, group) {
      return this.manager.startTest({ ...test, group });
    },
    stopTest(test) {
      return this.manager.stopTest(test);
    },
    removeTest(test) {
      delete this.manager.completedTests[test.id];
    },
  },
});
