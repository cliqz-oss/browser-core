/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import RNFS from 'react-native-fs';

const BASEDIR = RNFS.DocumentDirectoryPath;

function getFullPath(_filePath) {
  let filePath = _filePath;
  if (typeof filePath === 'string') {
    filePath = [filePath];
  }
  return filePath.join('_');
}

export function readFile(filePath) {
  const fileName = getFullPath(filePath);
  return RNFS.readFile(`${BASEDIR}/${fileName}`);
}

export function writeFile(filePath, data) {
  const fileName = getFullPath(filePath);
  return RNFS.writeFile(`${BASEDIR}/${fileName}`, data);
}

export function deleteFile(filePath) {
  const fileName = getFullPath(filePath);
  return RNFS.unlink(`${BASEDIR}/${fileName}`);
}

export function mkdir() {
  return Promise.resolve();
}
