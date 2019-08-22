/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { promises as fs } from 'fs';
import path from 'path';

const BASEDIR = path.join('tmp', 'storage');
const init = fs.mkdir(BASEDIR, { recursive: true });

function getFullPath(filePath) {
  const pathArr = typeof filePath === 'string' ? [filePath] : filePath;
  return pathArr.join('_');
}

export function readFile(filePath) {
  const fileName = getFullPath(filePath);
  return fs.readFile(`${BASEDIR}/${fileName}`, { encoding: 'utf8' });
}

export function writeFile(filePath, data) {
  const fileName = getFullPath(filePath);
  return init.then(() => fs.writeFile(`${BASEDIR}/${fileName}`, data, { encoding: 'utf8' }));
}

export function mkdir() {
  return Promise.resolve();
}
