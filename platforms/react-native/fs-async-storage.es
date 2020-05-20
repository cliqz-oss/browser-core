/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint no-param-reassign: off */

import { AsyncStorage } from 'react-native';

const PREFIX = '@fs:';

function getFullPath(filePath) {
  if (typeof filePath === 'string') {
    filePath = [filePath];
  }
  return filePath.join('_');
}

function getKey(filePath) {
  return `${PREFIX}${getFullPath(filePath)}`;
}

function getItem(key) {
  return AsyncStorage.getItem(key).then((value) => {
    if (value === null) {
      return Promise.reject();
    }
    return Promise.resolve(value);
  });
}

export function readFile(filePath) {
  const key = getKey(filePath);
  return getItem(key);
}

export function readFileAssets(filePath) {
  return getItem(filePath);
}

export function writeFile(filePath, data) {
  const key = getKey(filePath);
  if (typeof data !== 'string') {
    data = JSON.stringify(data);
  }
  return AsyncStorage.setItem(key, data);
}

export function deleteFile(filePath) {
  const key = getKey(filePath);

  return AsyncStorage.removeItem(key);
}

export function mkdir() {
  return Promise.resolve();
}
