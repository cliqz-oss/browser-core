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
  init(app) {
    if (this._readyDefer) {
      return this._readyDefer.promise;
    }

    this._readyDefer = new Defer();

    // wrap in promise to catch exceptions
    Promise.resolve()
      .then(() => this._initializer(app))
      .then(
        (service) => {
          this._readyDefer.resolve();
          this.api = service;
        },
        (e) => {
          this._readyDefer.reject(e);
          throw e;
        },
      );

    return this._readyDefer.promise;
  }

  unload() {
    // if was initialised (_readyDefer exists), and has an unload method on the initializer
    if (this._readyDefer && this._initializer.unload) {
      this._initializer.unload();
    }
  }
}
