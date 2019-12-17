/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import logger from './logger';
import DuplicateDetector from './duplicate-detector';
import { fetch } from '../core/http';

/**
 * Responsible for sending Human Web message to the servers.
 * Ideally in a way that is as anomous as possible, although
 * the choices are limited on Mobile.
 *
 * Note: We can start with https. There is no fundamental
 * reason why hpnv2 could not be used on Mobile as well,
 * but it is a project on its own to port it.
 */
export default class MessageSender {
  constructor(config) {
    this.endpoint = config.HUMAN_WEB_LITE_COLLECTOR;
    this.duplicateDetector = new DuplicateDetector();
  }

  async send(message) {
    if (!this.endpoint) {
      logger.info('Skip sending. No endpoint configured:', message);
      return;
    }

    const { ok, rollback, rejectReason } = await this.duplicateDetector.trySend(message);
    if (!ok) {
      logger.info('Rejected by duplicate detector:', rejectReason, message);
      return;
    }
    try {
      // TODO: handle timeouts
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'omit',
        cache: 'no-store',
        redirect: 'manual',
        body: JSON.stringify(message)
      });
      if (!response.ok) {
        throw new Error('Failed to sent data:', response.statusText);
      }
      logger.info('Successfully sent message:', message);
    } catch (e) {
      // rollback to allow future resending attempts
      await rollback();
      throw e;
    }
  }
}
