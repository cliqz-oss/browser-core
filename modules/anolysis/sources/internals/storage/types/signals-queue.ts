/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Signal } from '../../signal';
import SafeDate from '../../date';

export type Id = number;

export interface Entry {
  attempts: number;
  date: string;
  id: Id;
  signal: Signal;
}

/**
 * This storage is used to temporarily persist signals which are to be sent to
 * the backend. Ideally they should only stay there for a short time and this
 * is only needed to make sure we do not loose signals when extension is
 * disabled, which would happen if signals are only kept in memory.
 */
export interface Storage {
  push: (signal: Signal, attempts: number) => Promise<Id>;
  remove: (id: Id) => Promise<void>;
  getN: (n: number) => Promise<Entry[]>;
  deleteOlderThan: (date: SafeDate) => Promise<void>;

  // NOTE: this is only used for unit testing purposes.
  getAll: () => Promise<Entry[]>;
  getSize: () => Promise<number>;
}
