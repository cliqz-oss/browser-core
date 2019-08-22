/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default function maybe(object, methodName, ...args) {
  return new Promise((resolve, reject) => {
    const method = object[methodName];
    const returnedValue = method.call(object, args);

    if (returnedValue) {
      resolve(returnedValue);
    } else {
      reject(new Error(`${methodName} returned falsy value`));
    }
  });
}
