/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default class Defer {
  static PENDING = Symbol('PENDING');

  static RESOLVED = Symbol('RESOLVED');

  static REJECTED = Symbol('REJECTED');

  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = (...args) => {
        this.state = Defer.RESOLVED;
        return resolve(...args);
      };
      this.reject = (...args) => {
        this.state = Defer.REJECTED;
        return reject(...args); // eslint-disable-line prefer-promise-reject-errors
      };
      this.state = Defer.PENDING;
    });

    this.promise
      // This will silence error logs in case the defered promise
      // gets rejected before it is consumed
      .catch(() => {});
  }

  get isSettled() {
    return this.state !== Defer.PENDING;
  }
}
