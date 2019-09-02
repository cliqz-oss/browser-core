/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const fs = require('fs');
const path = require('path');

function walk(p, filter) {
  let list = [];
  fs.readdirSync(p)
    .forEach((file) => {
      const fullPath = path.join(p, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        list = list.concat(walk(fullPath, filter));
      } else if (!filter || filter(fullPath)) {
        list.push(fullPath);
      }
    });
  return list;
}

module.exports = {
  walk,
};
