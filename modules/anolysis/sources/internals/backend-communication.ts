/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import logger from './logger';
import { Config } from './config';
import { Signal } from './signal';

export default class Backend {
  constructor(private readonly config: Config) { }

  /**
   * Sends a behavioral signal to the backend.
   */
  async sendSignal(signal: Signal): Promise<void> {
    logger.debug('post signal to backend', signal);
    await this.config.backend.post(`${this.config.backend.url}/collect`, signal);
  }
}
