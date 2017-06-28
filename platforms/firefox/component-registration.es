import { Components } from './globals';

// https://developer.mozilla.org/en-US/docs/Custom_about:_URLs
export default class {
  constructor(component) {
    this.Component = component;

    // enables factory registrations eg: Components.manager.registerFactory
    Components.manager.QueryInterface(Ci.nsIComponentRegistrar);
  }

  createInstance(outer, iid) {
    if (outer) {
      throw Components.results.NS_ERROR_NO_AGGREGATION;
    }
    /* eslint-disable */
    return new this.Component().QueryInterface(iid);
    /* eslint-enable */
  }

  register() {
    Components.manager.registerFactory(
      this.Component.prototype.classID,
      this.Component.prototype.classDescription,
      this.Component.prototype.contractID,
      this);
  }

  unregister() {
    Components.manager.unregisterFactory(this.Component.prototype.classID, this);
  }
}
