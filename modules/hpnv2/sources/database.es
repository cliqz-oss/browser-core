/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import getDexie from '../platform/lib/dexie';
import crypto from '../platform/crypto';
import md5 from '../core/helpers/md5';
import logger from './logger';
import { MsgQuotaError } from './errors';
import { formatHoursAsYYYYMMDD } from './utils';
import { fromHex, toHex } from '../core/encoding';
import { randomInt } from '../core/crypto/random';

// TODO: should make this more generic (just key-value), and separate custom logic
// (consumeFreshCounter...)
export default class Database {
  constructor() {
    this.isInit = false;
    this.groupPubKeys = {};
    this.userPK = null;
    this.sourceMap = {};
    this.tags = new Map();
  }

  getUserPK() {
    return this.userPK;
  }

  async setUserPK(value) {
    logger.info('DB: setUserPK');
    this.userPK = value;
    return this.db ? this.db.meta.put({ key: 'userPK', value }) : Promise.resolve();
  }

  getGroupPubKey(date) {
    return this.groupPubKeys[date];
  }

  async setGroupPubKey(date, { groupPubKey, pubKey, credentials, gsk, joinmsg, banned }) {
    logger.info('DB: setGroupPubKey:', date);
    this.groupPubKeys[date] = {
      groupPubKey,
      credentials,
      date,
      gsk,
      joinmsg,
      banned,
      pubKey,
    };
    return this.db ? this.db.meta.put({ key: 'groupPubKeys', value: this.groupPubKeys }) : Promise.resolve();
  }

  async setSourceMapAction(action, value) {
    this.sourceMap[action] = value;
    return this.db ? this.db.meta.put({ key: 'sourceMap', value: this.sourceMap }) : Promise.resolve();
  }

  async init() {
    if (this.isInit) {
      return;
    }

    try {
      const Dexie = await getDexie();
      this.db = new Dexie('hpnv2');
      this.db.version(1).stores({
        meta: 'key',
        tags: 'tag,expireat',
      });
      const [groupPubKeys, userPK, sourceMap] = await Promise.all([
        this.db.meta.get('groupPubKeys'),
        this.db.meta.get('userPK'),
        this.db.meta.get('sourceMap'),
      ]);
      this.groupPubKeys = (groupPubKeys && groupPubKeys.value) || this.groupPubKeys;
      this.userPK = (userPK && userPK.value) || this.userPK;
      this.sourceMap = (sourceMap && sourceMap.value) || this.sourceMap;
      this.isInit = true;
    } catch (e) {
      // Assuming if there is an error here it's because indexedDB corruption
      // In that case, fall back to memory only database
      this.db = null;
      this.isInit = true;
      throw e;
    }
  }

  /**
   * Tag is some hash value, and we want to find an integer x such that 0 <= x < limit
   * and such that the value [tag, x] still has not been seen. If no such integer exists,
   * we raise a message limit exceeded error. Also, we should choose this integer randomly
   * from the non yet used integers, so that we minimize the information that can be deduced
   * by looking at the sequence of integers for a given tag.
   *
   * So, if we repeatedly call this function several times with the same tag we will
   * end up getting a random permutation of 0..(limit - 1).
   *
   * Right now for every tag we save a random seed, the limit and the number of generated numbers
   * for it so far. This way, we can know which is the next number of the permutation when we need
   * it. Not efficient if limit is high, since every call is linear. But for now this is not used,
   * limit is always 1 or 0 (unlimited). A constant-time solution is Format-preserving encryption,
   * or the tweakable Hasty Pudding cipher, but seems too much effort for something that is not used
   * now.
   *
   * It is safe to remove the tag from the database after 'expireat' hours, since we will
   * never use the same tag again (in practice).
   *
   * If limit <= 0, it means unlimited, we just return a random integer < 2^53
   * @param {Uint8Array} tag
   * @param {Number} expireat - timestamp in hours at which the tag can be forgotten
   * @param {Number} limit - How many counters we can return for this tag
   */
  async consumeFreshCounter(tag, expireat, limit) {
    if (limit <= 0) {
      return Promise.resolve(randomInt());
    }

    const doTransaction = () => this.getTag(tag).then((value) => {
      let obj = value;
      if (!obj) {
        const seed = crypto.getRandomValues(new Uint8Array(12));
        obj = { tag, expireat, seed, n: 0 };
      }
      if (obj.n >= limit) {
        throw new MsgQuotaError('Message limit exceeded');
      }
      const num = Database.getPermutationElem(obj.seed, obj.n, limit);
      obj.n += 1;
      return this.putTag(obj).then(() => num);
    });

    if (!this.db) {
      return doTransaction();
    }
    return this.db.transaction('rw', this.db.tags, doTransaction);
  }

  async getTag(tag) {
    if (!this.db) {
      return Promise.resolve(this.tags.get(tag));
    }
    return this.db.tags.get(tag);
  }

  async putTag(obj) {
    if (!this.db) {
      this.tags.set(obj.tag, obj);
      return Promise.resolve();
    }
    return this.db.tags.put(obj);
  }

  // linear time, but okayish for maximum < 256
  static getPermutationElem(seed, n, maximum) {
    let rand = md5(toHex(seed));
    const map = {};
    for (let i = maximum - 1; i > maximum - n - 2; i -= 1) {
      const j = (new Uint32Array(fromHex(rand).buffer))[0] % (i + 1);
      rand = md5(rand);
      if (map[i] === undefined) {
        map[i] = i;
      }
      if (j !== i) {
        if (map[j] === undefined) {
          map[j] = j;
        }
        const aux = map[j];
        map[j] = map[i];
        map[i] = aux;
      }
    }
    return map[maximum - 1 - n] || 0;
  }

  async clearTags() {
    if (!this.db) {
      this.tags.clear();
      return Promise.resolve();
    }
    return this.db.tags.clear();
  }

  /**
   * Removes old public keys.
   *
   * In general, keys from yesterday could be immediately deleted. However,
   * to avoid races in the very first seconds after midnight, only purge
   * them after some cooldown period.
   */
  async purgeOldPubKeys(currentHours) {
    // Give the servers some time to agree on which keys are active.
    // Normally, it takes a few minutes until all have updated to the
    // latest keys, so two hours should be more than enough.
    const ttlInHours = 2;
    const expireDate = formatHoursAsYYYYMMDD(currentHours - ttlInHours);
    logger.debug('DB: purgeOldPubKeys: looking for keys older than', expireDate);

    function isSafeToDelete(dateAsYYYYMMDD) {
      // Lexicographical order preserves time order.
      return dateAsYYYYMMDD < expireDate;
    }

    Object.keys(this.groupPubKeys).filter(isSafeToDelete).forEach((x) => {
      logger.info('DB: purgeOldPubKeys: remove old key', x);
      delete this.groupPubKeys[x];
    });
    return this.db ? this.db.meta.put({ key: 'groupPubKeys', value: this.groupPubKeys }) : Promise.resolve();
  }

  async purgeTags(currentHours) {
    this.tags.forEach((value, key) => {
      if (value.expireat < currentHours) {
        this.tags.delete(key);
      }
    });
    return this.db ? this.db.tags.where('expireat').below(currentHours).delete() : Promise.resolve();
  }
}
