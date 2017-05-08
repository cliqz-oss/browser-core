
export default class {
  constructor({ position } = { position: 0 }) {
  }

  init() {
  }

  /**
   * Disable all proxy rules provided by this instance
   * @method destroy
   */
  unload() {
  }

  // TODO: add documentation
  newProxy(...args) {
  }

  /**
   * Firefox proxy API entry point - called on new http(s) connection.
   * @method applyFilter
   * @param pps
   * @param url {string}
   * @param defaultProxy
   * @returns aProxy
   */
  applyFilter(pps, url, defaultProxy) {
  }
}
