/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * The real AsyncStorage API only accept strings as key/value, so we use this to
 * stick to the behavior as closely as possible.
 */
function assertIsString(value: any): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error(`AsyncStorage expected a string, got: ${value}`);
  }
}

/**
 * This class implements an in-memory AsyncStorage API.
 */
class AsyncStorage {
  private readonly storage: Map<string, string> = new Map();

  async getItem(key: string): Promise<null | string> {
    assertIsString(key);
    const value = this.storage.get(key);
    if (value === undefined) {
      return null;
    }
    return value;
  }

  async setItem(key: string, value: string): Promise<void> {
    assertIsString(key);
    assertIsString(value);
    this.storage.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    assertIsString(key);
    this.storage.delete(key);
  }

  async mergeItem(key: string, value: string): Promise<void> {
    assertIsString(key);
    assertIsString(value);

    const existingValue = this.storage.get(key);
    if (existingValue === undefined) {
      return this.setItem(key, value);
    }

    return this.setItem(
      key,
      JSON.stringify({
        ...JSON.parse(existingValue),
        ...JSON.parse(value),
      }),
    );
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }

  async getAllKeys(): Promise<string[]> {
    return [...this.storage.keys()];
  }

  async flushGetRequests() {
    throw new Error('Not implemented');
  }

  async multiGet(keys: string[]): Promise<Array<[string, string]>> {
    const results: Array<[string, string]> = [];

    for (const key of keys) {
      assertIsString(key);
      const value = this.storage.get(key);
      if (value !== undefined) {
        results.push([key, value]);
      }
    }

    return results;
  }

  async multiSet(items: Array<[string, string]>): Promise<void> {
    for (const [key, value] of items) {
      assertIsString(key);
      assertIsString(value);
      this.storage.set(key, value);
    }
  }

  async multiRemove(keys: string[]): Promise<void> {
    for (const key of keys) {
      assertIsString(key);
      this.storage.delete(key);
    }
  }

  async multiMerge() {
    throw new Error('Not implemented');
  }
}

export default new AsyncStorage();
