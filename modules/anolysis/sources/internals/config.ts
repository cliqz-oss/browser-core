/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Storage } from './storage/types/storage';
import { Meta } from './signal';

export interface Config {
  session?: string;
  backend: {
    url: string;
    post: (url: string, payload: object) => Promise<object>;
  };
  queue: {
    batchSize: number;
    sendInterval: number;
    maxAttempts: number;
  };
  storage: Storage;
  signals: {
    meta: Partial<Meta>;
  };
}
