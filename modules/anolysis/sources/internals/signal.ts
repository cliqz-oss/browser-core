/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Demographics } from './demographics';

export type Behavior = any;

export interface Meta {
  demographics: Partial<Demographics>;
  version: number;
  date: string;

  // Indicate if the signal comes from a developer (e.g.: building locally or CI).
  dev: boolean;

  // Indicate if the signal comes from a user on 'beta' channel.
  beta: boolean;

  // Optionally set whenever a signal was sent without being first persisted in
  // the signal queue storage. This can happen exceptionally whenever the
  // storage is not working properly.
  forcePushed?: boolean;

  ephemerid?: string;
}

export interface Signal {
  type: string;
  behavior: Behavior;
  meta: Meta;
}
