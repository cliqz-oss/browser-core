/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

Promise.hash = function hash(obj) {
  const keys = [];
  const promises = [];

  Object.keys(obj).forEach((key) => {
    keys.push(key);
    promises.push(obj[key]);
  });

  return Promise.all(promises)
    .then((results) => {
      const result = Object.create(null);
      for (let i = 0; i < results.length; i += 1) {
        result[keys[i]] = results[i];
      }
      return result;
    });
};

export default Promise;
