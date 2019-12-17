/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { truncatedHash } from '../core/helpers/md5';

const KEY_COMPUTATION = {
  query(msg) {
    // TODO: dummy implementation
    return truncatedHash(`query:${msg.ts}:${msg.payload.q}`);
  },
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
 *
 * TODO: This is a stub implementation, which keeps all state
 * in memory. It should be replaced by a proper implementation
 * with persistance. Ideally, something that does not allow
 * retrieve the history of the queries (e.g., hashing, bloom filters).
 *
 * TODO: in this stub implementation, nothing gets cleaned up.
 * A proper implementation should clean up daily.
 */
export default class DuplicateDetector {
  constructor() {
    this.sentKeys = new Set();
  }

  /**
   * Checks whether a message should be sent.
   *
   * If you got permission to send but the actual send failed,
   * ensure to call the returned "rollback" callback. Otherwise, you
   * cannot retry, as all later attempts will be rejected as duplicates.
   */
  async trySend(message) {
    let key;
    try {
      key = this._computeKey(message);
    } catch (e) {
      return {
        ok: false,
        rejectReason: `Message must be well-formed (failed at: ${e})`,
      };
    }

    if (this.sentKeys.has(key)) {
      return {
        ok: false,
        rejectReason: `Key has been already seen (key: ${key})`,
      };
    }

    this.sentKeys.add(key);
    return {
      ok: true,
      rollback: async () => {
        this.sentKeys.delete(key);
      },
    };
  }

  _computeKey(message) {
    function notFound() {
      throw new Error(`Unknown message type: ${message.action}`);
    }
    return (KEY_COMPUTATION[message.action] || notFound)(message);
  }
}
