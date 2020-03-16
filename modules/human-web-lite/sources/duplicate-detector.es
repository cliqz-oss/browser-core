/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { truncatedHash } from '../core/helpers/md5';
import logger from './logger';
import random from '../core/crypto/random';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const KEY_COMPUTATION = {
  'hwlite.query': msg => truncatedHash(`query:${msg.ts}:${msg.payload.q}`),
};

/**
 * Well-behaving clients should not send the same message multiple times.
 * For example, if a user repeats a query, it should only be sent once.
 * (Note: Do not confuse it with duplicate detection on the server side!
 * That it a harder problem, as you cannot trust the clients.)
 *
 * The existance of false positives is acceptable (messages being dropped
 * even though they have not been sent). However, it should not have
 * a noticeable impact on the number of collected messages (on the server).
 */
export default class DuplicateDetector {
  constructor(persistedHashes) {
    this.persistedHashes = persistedHashes;
    this.unloaded = false;
  }

  unload() {
    if (!this.unloaded) {
      this.unloaded = true;
      this.persistedHashes.flush();
    }
  }

  /**
   * Checks whether a message should be sent.
   *
   * If you got permission to send but the actual send failed,
   * ensure to call the returned "rollback" callback. Otherwise, you
   * cannot retry, as all later attempts will be rejected as duplicates.
   */
  async trySend(message) {
    if (this.unloaded) {
      return {
        ok: false,
        rejectReason: 'Module is unloading'
      };
    }

    let key;
    try {
      key = this._computeKey(message);
    } catch (e) {
      return {
        ok: false,
        rejectReason: `Message must be well-formed (failed at: ${e})`,
      };
    }

    const expireAt = this._chooseExpiration(message);
    const wasAdded = await this.persistedHashes.add(key, expireAt);
    if (!wasAdded) {
      return {
        ok: false,
        rejectReason: `Key has been already seen (key: ${key})`,
      };
    }
    return {
      ok: true,
      rollback: async () => {
        try {
          await this.persistedHashes.delete(key);
        } catch (e) {
          logger.warn('Failed to rollback. Message cannot be resent.', e);
        }
      },
    };
  }

  _computeKey(message) {
    function notFound() {
      throw new Error(`Unknown message type: ${message.action}`);
    }
    return (KEY_COMPUTATION[message.action] || notFound)(message);
  }

  _chooseExpiration() {
    // conservative approach: remove entries after one or two days
    // (faster expiration should not make a functional difference,
    // as messages include the timestamp in their hashes).
    // Adding noise is done to make it harder to guess at what
    // time the hash was added.
    return Date.now() + Math.ceil((1.0 + random()) * DAY);
  }
}
