/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import RNFS from 'react-native-fs';
import { toBase64, fromBase64 } from '../core/encoding';

const BASEDIR = RNFS.DocumentDirectoryPath;

export default class PersistentMap {
  constructor(dbName) {
    this.dbName = dbName;
    this._mapDir = `${BASEDIR}/pmap/${dbName}`;
  }

  async init() {
    await RNFS.mkdir(this._mapDir);
    return Promise.resolve();
  }

  unload() {
  }

  destroy() {
    try {
      return RNFS.unlink(this._mapDir);
    } catch (e) {
      return Promise.resolve();
    }
  }

  async _getFileForKey(key) {
    const dir = await RNFS.readdir(this._mapDir);
    return dir.find(v => v.startsWith(`${key}.`));
  }

  async get(key) {
    const file = await this._getFileForKey(key);
    if (!file) {
      return Promise.resolve(undefined);
    }
    if (file.endsWith('.bin')) {
      const contents = await RNFS.readFile(`${this._mapDir}/${file}`, 'base64');
      return fromBase64(contents);
    }
    return JSON.parse(await RNFS.readFile(`${this._mapDir}/${file}`));
  }

  set(key, value) {
    if (value.buffer) {
      const b64Enc = toBase64(value.buffer);
      return RNFS.writeFile(`${this._mapDir}/${key}.bin`, b64Enc, 'base64');
    }
    return RNFS.writeFile(`${this._mapDir}/${key}.str`, JSON.stringify(value));
  }

  async has(key) {
    return !!(await this._getFileForKey(key));
  }

  async delete(key) {
    const file = await this._getFileForKey(key);
    if (file) {
      return RNFS.unlink(`${this._mapDir}/${file}`);
    }
    return Promise.resolve();
  }

  clear() {
    return this.destroy();
  }

  async size() {
    return (await RNFS.readdir(this._mapDir)).length;
  }

  async keys() {
    return (await RNFS.readdir(this._mapDir)).map(fileName => fileName.split('.', 2)[0]);
  }

  values() {
    throw new Error('not implemented');
  }

  entries() {
    throw new Error('not implemented');
  }

  bulkDelete() {
    throw new Error('not implemented');
  }

  bulkSetFromMap() {
    throw new Error('not implemented');
  }
}
