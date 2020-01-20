/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Behavior } from './signal';

export class Records {
  constructor(private map: Map<string, Behavior[]> = new Map()) {}

  get size() {
    return this.map.size;
  }

  toObj() {
    const obj: {
      [key: string]: Behavior[];
    } = {};
    for (const [k, v] of this.map) {
      obj[k] = v;
    }
    return obj;
  }

  entries() {
    return this.map.entries();
  }

  get(key: string): Behavior[] {
    return this.map.get(key) || [];
  }

  has(key: string): boolean {
    return this.map.has(key);
  }

  keys() {
    return this.map.keys();
  }

  values() {
    return this.map.values();
  }
}
