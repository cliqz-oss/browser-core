/**
 * Interface for a feature
 */
export default class Feature {
  constructor(name) {
    this.name = name;
  }

  getName() {
    return this.name;
  }

  // to be implemented by the inherited classes
  init() {
    throw new Error('This should be implemented by the inherited class');
  }

  unload() {
    throw new Error('This should be implemented by the inherited class');
  }

  isAvailable() {
    throw new Error('This should be implemented by the inherited class');
  }
}
