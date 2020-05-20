/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable global-require */
import { NativeModules } from 'react-native';
import console from './console';

let fs;

if (NativeModules.RNFSManager) {
  fs = require('./fs-native');
} else {
  console.debug('fs: Falling back to async storage implementation');
  fs = require('./fs-async-storage');
}

export const readFile = fs.readFile;
export const readFileAssets = fs.readFileAssets;
export const writeFile = fs.writeFile;
export const deleteFile = fs.deleteFile;
