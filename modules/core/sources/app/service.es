/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Defer from '../helpers/defer';

export default class Service {
  constructor(initializer) {
    this._initializer = initializer;
  }

  /*
   * Service is initialized only once
   * Multiple calls to init return same promise
   */
  init(app, browser) {
    if (this._readyDefer) {
      return this._readyDefer.promise;
    }

    this._readyDefer = new Defer();
    const startLoading = Date.now();

    // wrap in promise to catch exceptions
    Promise.resolve()
      .then(() => this._initializer(app, browser))
      .then(
        (service) => {
          this.loadingTime = Date.now() - startLoading;
          this._readyDefer.resolve();

          this.api = service;
          this._moduleFactory = this._initializer.moduleFactory;
        },
        (e) => {
          this._readyDefer.reject(e);
        },
      );

    return this._readyDefer.promise;
  }

  async moduleFactory(moduleName) {
    if (!this._moduleFactory) {
      return this.api;
    }
    return this._moduleFactory(moduleName);
  }

  isReady() {
    return this._readyDefer.promise;
  }

  unload() {
    // if was initialised (_readyDefer exists), and has an unload method on the initializer
    if (this._readyDefer && this._initializer.unload) {
      this._initializer.unload();
    }
  }
}
