/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable no-return-assign */

import crypto from '../platform/crypto';
import { importRSAKey, signRSA, generateRSAKeypair, sha256 } from '../core/crypto/utils';
import { exportPublicKey } from '../core/crypto/pkcs-conversion';
import { fromBase64, toBase64, toUTF8, fromHex } from '../core/encoding';
import Database from './database';
import GroupSigner from './group-signer';
import Endpoints from './endpoints';
import TrustedClock from './trusted-clock';
import ConfigLoader from './config-loader';
import MessageThrottler from './message-throttler';
import md5 from '../core/helpers/md5';
import { digest } from './digest';
import { MsgQuotaError, NotReadyError, InvalidMsgError, NoCredentialsError, BadCredentialsError,
  SignMsgError, InitSignerError, OldVersionError,
  ClockOutOfSyncWhileJoining } from './errors';
import { formatDate, formatHoursAsYYYYMMDD, reflectPromise, encodeWithPadding } from './utils';
import logger from './logger';
import MessageQueue from '../core/message-queue';
import { decompress } from '../core/gzip';
import { VERSION } from './constants';
import prefs from '../core/prefs';
import pacemaker from '../core/services/pacemaker';

const MSG_SIGNED = 0x03;

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

const JOIN_STATE = {
  PENDING_JOINS: 0,
  JOINED: 1,
  WAITING_FOR_CLOCK_SYNC: 2,
};

function ppState(state) {
  return ['READY', 'UNINITIALIZED', 'INIT_PENDING', 'DESTROYED'][state] || '<??>';
}

/**
 * Helper class to encapsulate the different phases of the
 * initialization and allows to wait for them to complete.
 *
 * Normally, you will expect these transitions:
 *
 * Startup: UNINITIALIZED -> INIT_PENDING -> READY
 * Shutdown: READY -> DESTROYED
 *
 * (visible for testing)
 */
export class InitState {
  // The default state:
  // The module is fully initialized and is ready to send messages.
  static get READY() {
    return 0;
  }

  // Initial state after construction.
  static get UNINITIALIZED() {
    return 1;
  }

  // Initialization has been started. As it involves network
  // requests, it normally takes a few seconds to complete.
  // However, if there are network issues, it can stay in this
  // state for longer.
  static get INIT_PENDING() {
    return 2;
  }

  // Final state:
  // Once that state is reached, all processing should stop as it is likely
  // that you will otherwise operate on dangling objects, or even worse
  // on new ones which do not match the expected state.
  static get DESTROYED() {
    return 3;
  }

  constructor() {
    this.state = InitState.UNINITIALIZED;
    this._pendingInit = new Promise((resolve, reject) => {
      this._onReady = resolve;
      this._onDestroy = reject;
    });
  }

  isReady() {
    return this.state === InitState.READY;
  }

  isUnloaded() {
    return this.state === InitState.UNINITIALIZED || this.state === InitState.DESTROYED;
  }

  isUninitialized() {
    return this.state === InitState.UNINITIALIZED;
  }

  updateState(state_) {
    if (state_ === this.state) {
      // nothing to do
      return;
    }
    if (this.state_ === InitState.DESTROYED) {
      throw new Error(`Internal error: already dead (cannot change to ${ppState(state_)})`);
    }

    switch (state_) {
      case InitState.UNINITIALIZED:
        throw new Error(`Internal error: Cannot go back to uninitialized state (${ppState(this.state)})`);

      case InitState.INIT_PENDING:
        if (this.state !== InitState.UNINITIALIZED) {
          throw new Error(`Internal error: expected INIT_PENDING, but came from state=${ppState(this.state)}`);
        }
        this.state = state_;
        break;

      case InitState.READY:
        if (this.state !== InitState.INIT_PENDING) {
          throw new Error(`Internal error: expected INIT_PENDING (current=${ppState(this.state)})`);
        }
        this.state = state_;
        this._onReady();
        break;

      case InitState.DESTROYED:
        this.state = state_;
        this._onDestroy();
        break;

      default:
        throw new Error(`Unexpected state: new=${state_} (current=${ppState(this.state)})`);
    }

    logger.info(`Changing state to ${ppState(this.state)}`);
  }

  /**
   * @param timeoutInMs  0 means wait forever
   */
  async waitUntilReady(timeoutInMs) {
    if (this.state === InitState.READY) {
      return;
    }

    if (this.state === InitState.DESTROYED) {
      logger.warn('Trying to wait to initialization, but the object is already dead.');
      throw new NotReadyError();
    }

    if (timeoutInMs && timeoutInMs > 0) {
      let timer;
      const timeout = new Promise((_, reject) => {
        timer = pacemaker.setTimeout(() => {
          reject(new NotReadyError());
        }, timeoutInMs);
      });
      try {
        await Promise.race([this._pendingInit, timeout]);
      } finally {
        pacemaker.clearTimeout(timer);
      }
    } else {
      await this._pendingInit;
    }

    if (this.state === InitState.DESTROYED) {
      logger.info('Give up. After waking up, the module was unloaded.');
      throw new NotReadyError();
    }

    if (this.state !== InitState.READY) {
      logger.error('Still not ready after waking up. Unexpected state:', ppState(this.state));
      throw new NotReadyError();
    }
  }
}

/**
 * There are constraints to signing messages. Duplicated messages can only
 * be sent once, and each sign operation also contributes to the rate limit.
 * That is intentional, as messages would otherwise be rejected on the server.
 * It can become an issue when we retry to send failing messages.
 * In that case, we have to avoid creating new signatures for each attempt.
 *
 * As we are using a random pseudo-random sequence to generate counters
 * (see Database#consumeFreshCounter), rolling back after errors once
 * signing was completed only works for the last message. To make retrying
 * previously signed messages possible, keep the pending, signed messages
 * in memory.
 *
 * The disadvantage is that the state will be lost on extension restarts.
 * On the other hand, resending messages with identical content is less likely
 * after restarts. If that assumption is wrong, the alternative would be to
 * change it at the database level (either make it possible to undo the operation
 * or persist the signatures of unsent messages).
 *
 * Note that "noverify"-messages are not signed, so they can be retried without
 * being rejected by rate limits. In contrast, "noverify=false" types of messages
 * (including all messages generated by Human Web) are signed and rate limits
 * will be enforced.
 */
class UnsentSignedMessages {
  constructor({ maxSize, ttlInMs }) {
    this.maxSize = maxSize;
    this.ttlInMs = ttlInMs;
    this.signatures = new Map();
  }

  get(msg) {
    this._purgeExpired();
    const result = this.signatures.get(msg);
    return result ? result.signature : undefined;
  }

  set(msg, signature) {
    this.signatures.delete(msg);
    const expireAt = Date.now() + this.ttlInMs;
    this.signatures.set(msg, { signature, expireAt });
    this._purgeExpired();

    if (this.signatures.maxSize > this.maxSize) {
      this._deleteOldestEntry();
    }
  }

  delete(msg) {
    this.signatures.delete(msg);
    this._purgeExpired();
  }

  _deleteOldestEntry() {
    for (const [key] of this.signatures) {
      this.signatures.delete(key);
      break;
    }
  }

  _purgeExpired() {
    const now = Date.now();
    for (const [msg, { expireAt }] of this.signatures) {
      if (now >= expireAt) {
        this.signatures.delete(msg);
      } else {
        break;
      }
    }
  }
}

export default class Manager {
  _initDefaults() {
    if (this.initState) {
      this.initState.updateState(InitState.DESTROYED);
    }
    this.initState = new InitState();
    this.signerInitialized = false;

    if (this.throttler) {
      this.throttler.cancelPendingTimers();
    }
    this.throttler = new MessageThrottler();

    this.db = new Database();
    this.endpoints = new Endpoints();
    this.loadedCredentialsDate = null;
    this.msgQueue = MessageQueue('hpnv2', this._send.bind(this));
    this.isOldVersion = false;
    this.configLoader = null;
    this.signer = null;
    this.ecdhPubKey = {};

    this.unsentSignedMessages = new UnsentSignedMessages({
      maxSize: 1000,
      ttlInMs: 4 * HOUR,
    });

    // local state to coordinate join attempts:
    this._joinScheduler = {
      state: JOIN_STATE.PENDING_JOINS,
      nextJoinTimer: null,

      // protection against races:
      // do not allow multiple overlapping join requests
      pending: 0,

      // Normally, it is safe to immediately join all groups. However, a
      // special case is when a new key has just been published. In that
      // situation, it is preferable that clients do not all try to join
      // immediately, but instead wait for a randomized duration.
      cooldowns: new Map(),
    };

    this.logError = logger.error;
    this.log = logger.log;
    this.logDebug = logger.debug;

    // There is a mutual dependence between clock and config-loader:
    this.trustedClock = new TrustedClock();
    this.configLoader = new ConfigLoader(this.endpoints);

    // 1) When fetching the configuration, the config loader
    //    has access to the server timestamp, which is then
    //    used to synchronize the trusted clock.
    this.trustedClock.onClockOutOfSync = async () => {
      try {
        await this.configLoader.synchronizeClocks();

        // react on a hint: if the last, we failed to join because of the clock,
        // we can now bypass the timer and immediately try to join again
        if (this._joinScheduler.state === JOIN_STATE.WAITING_FOR_CLOCK_SYNC) {
          this._joinScheduler.state = JOIN_STATE.PENDING_JOINS;
          this.scheduleJoinGroup();
        }
      } catch (e) {
        logger.info('onClockOutOfSync handler failed', e);
      }
    };

    // 2) When the trusted clock gets out of sync with the system
    //    time, it requires a current time stamp from the server
    //    to get in sync again.
    this.configLoader.onServerTimestampRefresh = (serverTs) => {
      this.trustedClock.syncWithServerTimestamp(serverTs);
    };
    this.configLoader.onConfigUpdate = async (config) => {
      this.isOldVersion = VERSION < config.minVersion;
      if (this.isOldVersion) {
        return;
      }

      try {
        await this.updateConfig(config);
        this.initState.updateState(InitState.READY);
      } catch (e) {
        // this should not be reached unless the server sends garbage
        logger.error('Failed to update config', e);
        return;
      }
      logger.log('Configuration successfully updated.');

      // Join groups if not already done.
      this.scheduleJoinGroup();
    };
  }

  constructor() {
    this._initDefaults();
  }

  async init() {
    if (!this.initState.isUninitialized()) {
      return;
    }
    this.initState.updateState(InitState.INIT_PENDING);

    this.trustedClock.init();

    // Wait for signer, db (Dexie or memory fallback) and user long-lived private key
    // initialization.
    try {
      await this.initSigner();
    } catch (e) {
      // This should never happen
      throw new InitSignerError(e.message);
    }
    try {
      await this.db.init();
    } catch (e) {
      this.logError('Could not init (indexed)DB, will switch to memory-only DB');
    }
    await this.initUserPK();
    this.configLoader.init();

    // hpnv2 will only be able to send messages once the clock has been synchronized
    // with the server and once the configuration has been fetched.
    //
    // We can perform the initialization in the background, as hpnv2 will buffer
    // messages from other modules until the initialization is completed.
    // Also there are situations where the initialization will have to be delayed,
    // e.g. if no internet connection is available.
    //
    // The system needs to be error tolerant, i.e. it will be able to recover from
    // any starting state. Still, it is recommended to wait for the the clock
    // synchronization first, as otherwise "join" operations are expected to fail
    // (harmless, but leading to noisy warnings).
    (async () => {
      let errors = false;
      try {
        await this.configLoader.synchronizeClocks();
      } catch (e) {
        logger.warn('Failed to synchronize clocks with the server. Continue with the initialization. '
                    + 'Errors are expected now, but the system should eventually arrive at a consistent state.');
        errors = true;
      }

      try {
        await this.configLoader.fetchConfig();
      } catch (e) {
        logger.warn('Failed to fetch the config from the server. '
                    + 'Errors are expected now, but the system should eventually arrive at a consistent state.');
        errors = true;
      }
      if (errors) {
        logger.warn('Background initialization finished with errors, '
                    + 'but the failed operations will be retried automatically.');
      } else {
        logger.info('Background initialization finished without errors.');
      }
    })();
  }

  unload() {
    this.initState.updateState(InitState.DESTROYED);
    if (this.signer) {
      this.signer.unload();
    }
    pacemaker.clearTimeout(this._joinScheduler.nextJoinTimer);
    this.endpoints.unload();
    this.configLoader.unload();
    this.trustedClock.unload();

    this._initDefaults();
  }

  async punish() {
    // This bans all stored credentials, temporarily stopping data collection.
    return Promise.all(Object.keys(this.groupPubKeys).map((shortDate) => {
      this.groupPubKeys[shortDate].banned = true;
      return this.db.setGroupPubKey(shortDate, this.groupPubKeys[shortDate]);
    }));
  }

  // This loads sourceMap and group public keys that were fetched from the server,
  // and joins groups if needed. Only will add sourceMap actions and public keys we
  // do not already have. Therefore, server should never change an action, always
  // add a new one (append-only).
  // For group public keys we could add a protection: if we find out that
  // the server is changing the group public key for a day, we do not send any data.
  async updateConfig({ groupPubKeys, pubKeys, sourceMap, minVersion, trafficHints }) {
    if (VERSION < minVersion) {
      this.logError(`We are running an old version of the protocol, which is no longer supported by the server. All communication will be stopped. Our version: ${VERSION} does not meet the minimum version required by the server: ${minVersion}`);
      this.isOldVersion = true;
      return;
    }

    const ok = Manager.checkGroupPublicKeys(groupPubKeys, pubKeys, this.groupPubKeys);
    if (!ok) {
      await this.punish();
    } else {
      let newGroupPubKeys = Object.keys(groupPubKeys);

      // Filter for new keys (ignoring all keys that we already know
      // or that are older than the oldest key that we remember):
      const oldGroupKeys = Object.keys(this.groupPubKeys);
      if (oldGroupKeys.length > 0) {
        const oldestKnownKey = Object.keys(this.groupPubKeys).sort()[0];
        newGroupPubKeys = newGroupPubKeys
          .filter(x => x > oldestKnownKey)
          .filter(x => !oldGroupKeys.includes(x));

        // Special case: if a new key is published, not all clients should immediately
        // attempt to join the group, for two reasons:
        // 1) It leads to a sudden spike of join requests
        // 2) (worse) not all servers might yet have synchronized and are aware of that key
        if (newGroupPubKeys.length === 1) {
          const latestKey = newGroupPubKeys[0];
          const randomDelayInMs = 30 * MINUTE + Math.random() * 2 * HOUR;
          this.log('Delay joining the latest group', latestKey, 'by', randomDelayInMs / MINUTE, 'minutes');
          this._joinScheduler.cooldowns.set(latestKey, Date.now() + randomDelayInMs);
        }
      }

      // Update server public keys in db.
      await Promise.all(newGroupPubKeys.map((shortDate) => {
        const key = this.groupPubKeys[shortDate] || {};
        key.groupPubKey = fromBase64(groupPubKeys[shortDate]);
        key.pubKey = pubKeys[shortDate] && fromBase64(pubKeys[shortDate]);
        return this.db.setGroupPubKey(shortDate, key);
      }));
    }

    // TODO: add some protection for malicious server trying to target by
    // using this. For example, we could limit the maximum allowed daily
    // changes.
    Object.keys(sourceMap.actions).forEach((action) => {
      this.db.setSourceMapAction(action, sourceMap.actions[action]);
    });
    if (trafficHints) {
      this.throttler.updateConfig(trafficHints, sourceMap);
    }

    // Database cleanup:
    const { inSync, hoursSinceEpoch } = this.trustedClock.checkTime();
    if (inSync) {
      const purgeTags = this.db.purgeTags(hoursSinceEpoch).catch((e) => {
        logger.error('Failed to purge old tags in the database', e);
      });
      const purgeOldPubKeys = this.db.purgeOldPubKeys(hoursSinceEpoch).catch((e) => {
        logger.error('Failed to purge old keys in the database', e);
      });
      await Promise.all([purgeTags, purgeOldPubKeys]);
    }
  }

  getPublicKey(date) {
    const smaller = Object.keys(this.groupPubKeys).sort().filter(x => x <= date);
    if (this.getNextPublicKeys(date).length > 0 && smaller.length > 0) {
      const key = this.groupPubKeys[smaller[smaller.length - 1]];
      return key.banned ? null : key;
    }
    return null;
  }

  getNextPublicKeys(date) {
    return Object.keys(this.groupPubKeys)
      .sort()
      .filter(x => x > date)
      .map(x => this.groupPubKeys[x]);
  }

  async scheduleJoinGroup() {
    pacemaker.clearTimeout(this._joinScheduler.nextJoinTimer);
    try {
      this._joinScheduler.pending += 1;
      if (this._joinScheduler.pending > 1) {
        return;
      }

      await this.joinGroups();
      this._joinScheduler.state = JOIN_STATE.JOINED;
    } catch (e) {
      if (e instanceof ClockOutOfSyncWhileJoining) {
        // Remember that is was the clock, so we can immediately
        // retry when when the clock gets synched.
        this._joinScheduler.state = JOIN_STATE.WAITING_FOR_CLOCK_SYNC;
      }
      const timeoutInMs = MINUTE + Math.random() * 10 * MINUTE;
      logger.warn('Failed to join group. Retrying again in', timeoutInMs / MINUTE, 'min');

      this._joinScheduler.nextJoinTimer = pacemaker.setTimeout(() => {
        this.scheduleJoinGroup();
      }, timeoutInMs);
    } finally {
      this._joinScheduler.pending -= 1;
    }
  }

  async joinGroups() {
    const { inSync, hoursSinceEpoch } = this.trustedClock.checkTime();
    if (!inSync) {
      logger.info('Skipping join attempt, as the clock is currently off.');
      throw new ClockOutOfSyncWhileJoining();
    }
    const today = formatHoursAsYYYYMMDD(hoursSinceEpoch);

    const sortedDates = Object.keys(this.groupPubKeys).sort();
    const smaller = sortedDates.filter(x => x <= today);
    if (smaller.length <= 0) {
      throw new Error('No valid group public key is available');
    }
    const activeKey = smaller[smaller.length - 1];

    const isCooldownExceeded = (date) => {
      const cooldown = this._joinScheduler.cooldowns.get(date);
      if (!cooldown) {
        // no cooldown configured -> join immediately
        return true;
      }

      if (date === activeKey || Date.now() >= cooldown) {
        this.log('Group', date, 'exceeded the join cooldown. Ready to join now.');
        this._joinScheduler.cooldowns.delete(date);
        return true;
      }

      // Do not join the group yet. It is not active yet, so we can
      // wait for the cooldown to run off before we attempt to join.
      return false;
    };

    const joinDates = sortedDates
      .filter(x => x >= activeKey)
      .filter(x => isCooldownExceeded(x));

    // Make sure join promises are resolved via reflectPromise
    const results = await Promise.all(joinDates.map(x => reflectPromise(this.joinGroup(x))));
    const error = results.find(({ isError }) => isError);
    if (error) {
      // For all non-active keys, joining is not a time-critical operation.
      // If there was an error, there will be reattempts soon to join again.
      // In that case, exclude the non-active keys for a while.
      for (const key of joinDates) {
        if (key !== activeKey && !this._joinScheduler.cooldowns.has(key)) {
          const randomBackoff = 5 * MINUTE + 30 * MINUTE * Math.random();
          this._joinScheduler.cooldowns.set(key, Date.now() + randomBackoff);
        }
      }
      throw error.error;
    }
  }

  // Loads server ECDH pubKey (but does not fetch them).
  // if !skipGroupKeys, also loads locally stored credentials into the signer.
  async loadKeys(skipGroupKeys) {
    if (this.initState.isUnloaded()) {
      throw new NotReadyError();
    }

    const { inSync, hoursSinceEpoch } = this.trustedClock.checkTime();
    const today = formatHoursAsYYYYMMDD(hoursSinceEpoch);
    if (!inSync) {
      logger.info('Clock time is out of sync. Loading of today\'s key might fail:', today);
    }
    const pk = this.getPublicKey(today);
    if (!pk) {
      throw new NoCredentialsError();
    }

    const { groupPubKey, credentials, date, pubKey } = pk;

    if (pubKey && this.ecdhPubKey.date !== date) {
      try {
        const key = await crypto.subtle.importKey(
          'raw',
          pubKey,
          { name: 'ECDH', namedCurve: 'P-256' },
          false,
          []
        );
        this.ecdhPubKey = { key, date };
      } catch (e) {
        // Workaround for (non Chromium-based) Edge:
        // ECDH is not supported, which is needed to agree on an encryption key
        // for the request body. As long as we directly send (over https) to our servers,
        // this is not a problem. The purpose of the extra encryption of the message body
        // is to prevent a 3rd party proxy from reading the data.
        //
        // Test page to see, which crypto APIs a browser supports:
        // https://diafygi.github.io/webcrypto-examples/
        //
        // Note: As the workaround is currently only relevant for Ghostery/MyOffrz, be extra
        // paranoid and make sure that the Ghostery/MyOfferz endpoints are used. That is only
        // to rule out any misconfigurations.
        if (this.endpoints.ENDPOINT_HPNV2_ANONYMOUS === this.endpoints.ENDPOINT_HPNV2_DIRECT
            && (this.endpoints.ENDPOINT_HPNV2_DIRECT === 'https://collector-hpn.ghostery.net'
                || this.endpoints.ENDPOINT_HPNV2_DIRECT === 'https://collector-hpn.cliqz.com')) {
          logger.debug('The browser does not support ECDH, but as we are not sending through a proxy, TLS encryption is sufficient.');
          this.ecdhPubKey = { unsupportedByBrowser: true };
        } else {
          logger.error('ECDH is not supported by the browser. Cannot send unencrypted data through a 3rd proxy proxy.', e);
          throw e;
        }
      }
    }

    if (skipGroupKeys) {
      return;
    }

    if (!credentials) {
      throw new NoCredentialsError();
    }

    if (this.loadedCredentialsDate === date) {
      return;
    }

    this.logDebug('Loading credentials', pk.date);
    try {
      await this.signer.setGroupPubKey(groupPubKey);
      await this.signer.setUserCredentials(credentials);
      this.loadedCredentialsDate = date;
    } catch (e) {
      this.logError('Error loading credentials', e);
      throw new BadCredentialsError();
    }
  }

  async initSigner() {
    if (this.signerInitialized) {
      return;
    }

    try {
      this.signer = new GroupSigner();
      await this.signer.seed(crypto.getRandomValues(new Uint8Array(128)));
      this.signerInitialized = true;
    } catch (e) {
      if (this.signer) {
        this.signer.unload();
        this.signer = null;
      }
      throw e;
    }
  }

  async initUserPK() {
    if (this.publicKeyB64) {
      return;
    }
    if (!this.userPK64) {
      const [, priv] = await generateRSAKeypair();
      this.userPK64 = priv;
    }
    this.userPK = await importRSAKey(this.userPK64, false, 'SHA-256', 'RSASSA-PKCS1-v1_5');
    this.publicKeyB64 = exportPublicKey(await crypto.subtle.exportKey('jwk', this.userPK));
  }

  // For each day, we should have a group public key and valid issued credentials
  // for that. We can have three states for the credentials: empty, user private
  // key generated, and final credentials issued. We need to be able to resume
  // from the second state, since due to network problems we might not receive
  // issued credentials, but the server could mark them as generated.

  // (Group public) key rotation will be controlled by the server. Keys are retrieved
  // via /config endpoint, each key labelled with a date (YYYYMMDD). If the endpoint
  // does not return a key for today it means that the previous group public key is still valid.
  async joinGroup(date) {
    const data = this.groupPubKeys[date];

    if (!data) {
      throw new Error(`No key found for date ${date}`);
    }

    if (data.banned) {
      throw new Error(`Group is banned ${date}`);
    }

    if (data.credentials) {
      this.logDebug('Found credentials for', date);
      return data;
    }

    this.logDebug('Joining group', date);

    const { groupPubKey, pubKey } = data;
    const challengeStr = JSON.stringify([this.publicKeyB64, toBase64(groupPubKey)]);
    const challenge = await sha256(challengeStr, 'bin');
    const { gsk, joinmsg } = (data.gsk ? data : await this.signer.startJoin(challenge));
    const sig = await signRSA(this.userPK, joinmsg);
    await this.db.setGroupPubKey(date, { groupPubKey, gsk, joinmsg, pubKey });

    const msg = {
      ts: date,
      joinMsg: toBase64(joinmsg),
      pk: this.publicKeyB64,
      sig: toBase64(fromHex(sig)),
    };

    const { joinResponse } = await this.endpoints.join(msg);

    const credentials = await this.signer.finishJoin(
      groupPubKey,
      gsk,
      fromBase64(joinResponse)
    );
    await this.db.setGroupPubKey(date, { groupPubKey, credentials, pubKey });
    return this.groupPubKeys[date];
  }

  // Possible Errors (all in hpnv2/errors)
  //
  //   MsgQuotaError: Sending this message would not respect rate-limiting rules
  //   TooBigMsgError: Message (after compressing) is bigger than 16KB
  //   InvalidMsgError: Message is not an object, does not have payload, or has invalid action
  //   OldVersionError: Client version is not supported by the server anymore
  //   NotReadyError: Module is not initialized. Can happen because of network problems or
  //     persistent system clock drift.
  //   NoCredentialsError: There are no available credentials for today. Should happen very rarely,
  //     for example if a system wakes up from suspend mode.
  //   TransportError: A network error when sending the message.
  //   ServerError: Unexpected server error.
  //
  //   (Should never happen, but theoretically possible): SignMsgError, BadCredentialsError
  //
  // When other modules are sending messages before hpn is ready, sending is blocked.
  // If hpn is unable to connect because of network issues, eventually it will have to
  // give up. By default, the timeout is very conservative, but the sender can
  // overwrite the default if needed. If do not want any timeout at all, you can pass 0
  // to wait forever. When sending times out, it will fail with an "NotReadyError".
  async send(msg, { proxyBucket, waitForInitTimeoutInMs = 3 * MINUTE, ttl } = {}) {
    if (this.isOldVersion) {
      // Refusing to send messages, as the client runs an old version of the protocol
      // that is not longer supported. Note that even if the changes are backward
      // compatible, we might actively want to stop old clients from sending once their
      // population gets too small.
      //
      // TODO: Dropping non-instant messages is always safe, as these are fire-and-forget
      // messages, where the user does not expect a response. For instant messages, maybe
      // trying to send is preferable, as the client expects a result. In other words,
      // dropping non-instant messages will never break client functionality, but
      // dropping instant messages might (e.g., search via proxy).
      //
      // The advantage of having not to fear client breakage would be that we could
      // more aggressively stop old clients from sending (to protect them when their
      // population size becomes too small).
      throw new OldVersionError();
    }
    if (!msg || typeof msg !== 'object') {
      throw new InvalidMsgError('msg must be an object');
    }
    const absoluteTimeout = ttl && ttl > 0 ? Date.now() + ttl : undefined;

    // handle races during startup when hpn is just starting up and other modules
    // are already trying to send messages:
    const initState = this.initState;
    if (!initState.isReady()) {
      if (initState.isUnloaded()) {
        // Although we could wait and speculate that loading will soon be initialized,
        // it is more likely that it will not happen, and it will just block.
        logger.info('Module is not initialized. Instead of waiting until we hit the timeout, give up immediately.');
        throw new NotReadyError();
      }

      logger.debug('Initialization is still pending. Waiting for it to complete...');
      await initState.waitUntilReady(waitForInitTimeoutInMs);
      logger.debug('Initialization is still pending. Waiting for it to complete...DONE');
    }

    const { action, payload } = msg;
    const config = this.sourceMap[action];
    if (!config) {
      throw (new InvalidMsgError(`unknown action ${action}`));
    }

    if (payload === null || payload === undefined) {
      throw (new InvalidMsgError('msg must not be null or undefined'));
    }

    const { noverify } = config;

    await this.loadKeys(noverify);

    const serverEcdhPubKey = Manager.clearText ? undefined : this.ecdhPubKey;

    const throttler = this.throttler;
    try {
      await throttler.startRequest(msg, this.trustedClock);
      if (initState.isUnloaded()) {
        // protection against races during shutdown
        const info = 'hpnv2 was stopped. The pending message could not be sent.';
        logger.warn(info);
        throw new NotReadyError(info);
      }

      // Do not queue noverify messages, these are ok to do in parallel
      const options = { msg, config, serverEcdhPubKey, proxyBucket, absoluteTimeout };
      if (noverify) {
        return await this._sendNoVerify(options);
      }

      return await this.msgQueue.push(options);
    } finally {
      throttler.endRequest(msg);
    }
  }

  // signs the message with the currently loaded credentials
  async _signMessage(message, action, pretag, hours, period, limit, skipQuotaCheck) {
    const tag = md5(JSON.stringify(pretag));
    let cnt;
    try {
      cnt = await this.db.consumeFreshCounter(
        tag,
        hours + period,
        limit
      );
    } catch (e) {
      if (skipQuotaCheck) {
        cnt = 0;
      } else {
        throw new MsgQuotaError(`${e.message} (action: ${action}, tag: ${tag}, limit: ${limit} per ${period} hours)`);
      }
    }

    try {
      const hashm = await sha256(message, 'b64');
      const bsn = await sha256(JSON.stringify([...pretag, cnt]), 'b64');
      const sig = await this.signer.sign(fromBase64(hashm), fromBase64(bsn));
      return { sig, cnt };
    } catch (e) {
      logger.error('Error signing message with action:', action, e);
      throw new SignMsgError();
    }
  }

  // Do not encrypt/compress/pad messages (for debugging purposes)
  static get clearText() {
    return prefs.get('hpnv2.cleartext', false) || prefs.get('hpnv2.plaintext', false);
  }

  static compressAndPad(data) {
    return Manager.clearText ? data : encodeWithPadding(data);
  }

  static encodeMessage(code, msg) {
    const data = new Uint8Array(1 + msg.length);
    data[0] = code;
    data.set(msg, 1);
    return data;
  }

  static encodeSignedMessage(msg, sig, cnt) {
    const len = msg.length;
    const data = new Uint8Array(8 + 389 + len);
    const view = new DataView(data.buffer);
    data.set(msg); // msg
    view.setFloat64(len, cnt); // count
    data.set(sig, len + 8); // signature
    return Manager.compressAndPad(Manager.encodeMessage(MSG_SIGNED, data));
  }

  async _sendNoVerify({ msg, config, serverEcdhPubKey, proxyBucket, absoluteTimeout }) {
    const { instant = false } = config;

    // Hack: this uses the first '{' as the message code.
    this.log('Sending noverify msg', msg);
    return this.endpoints.send(
      Manager.compressAndPad(toUTF8(JSON.stringify(msg))),
      { instant, serverEcdhPubKey, proxyBucket, absoluteTimeout }
    );
  }

  async _send({ msg: _msg, config, serverEcdhPubKey, proxyBucket }, skipQuotaCheck = false) {
    const msg = _msg;
    const { action } = msg;

    if (msg.compressed) {
      delete msg.compressed;
      msg.payload = JSON.parse(decompress(fromBase64(msg.payload)));
    }

    const { payload } = msg;

    const { limit = 1, period = 24, keys = [], instant = false } = config;
    const dig = digest(keys, payload);

    const { inSync, hoursSinceEpoch } = this.trustedClock.checkTime();
    if (!inSync) {
      logger.info('Sending could fail, as the clock is out of sync with the server.');
    }
    const hours = period * Math.floor(hoursSinceEpoch / period);
    const ts = formatDate(hours).slice(0, period % 24 === 0 ? 8 : 10);
    if (msg.ts !== ts) {
      this.logDebug('msg ts differ', msg.ts, ts);
      msg.ts = ts;
    }

    const utf8Msg = toUTF8(JSON.stringify(msg));
    let signedMsg = this.unsentSignedMessages.get(msg);
    if (!signedMsg) {
      const pretag = [
        action,
        period,
        limit,
        dig,
        hours
      ];
      signedMsg = await this._signMessage(
        utf8Msg,
        action,
        pretag,
        hours,
        period,
        limit,
        skipQuotaCheck,
      );
      this.unsentSignedMessages.set(msg, signedMsg);
    }

    this.log('Sending signed msg', msg);
    const result = await this.endpoints.send(
      Manager.encodeSignedMessage(utf8Msg, signedMsg.sig, signedMsg.cnt),
      { instant, serverEcdhPubKey, proxyBucket }
    );
    this.unsentSignedMessages.delete(msg);

    return result;
  }

  get groupPubKeys() {
    return this.db.groupPubKeys;
  }

  get userPK64() {
    return this.db.userPK;
  }

  set userPK64(value) {
    this.db.setUserPK(value);
  }

  get sourceMap() {
    return this.db.sourceMap;
  }

  static isValidDate(dateStr) {
    const match = dateStr.match(/([0-9]{4})([0-9]{2})([0-9]{2})/);
    if (!match) {
      return false;
    }
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    const date = new Date(year, month, day);
    return date && date.getMonth() === month;
  }

  static isValidBase64(str) {
    try {
      return typeof str === 'string' && str === toBase64(fromBase64(str));
    } catch (e) {
      // pass
    }
    return false;
  }

  // This aims to protect against a server trying to target users by returning different
  // group public keys. It assumes oldKeys are already checked or undefined, for the first time.
  // If it returns false for some keys returned by server, feel free to punish!
  static checkGroupPublicKeys(newGroupKeys, newPubKeys, oldKeys) {
    if (!newGroupKeys || typeof newGroupKeys !== 'object') {
      return false;
    }
    if (!newPubKeys || typeof newPubKeys !== 'object') {
      return false;
    }
    const dates = Object.keys(newGroupKeys);
    if (dates.length > 4 || !dates.every(Manager.isValidDate)) {
      return false;
    }
    // Just testing if the group public keys are valid base64. If some is invalid (e.g. garbage)
    // the user will not be able to start joining the group, so server does not gain anything with
    // that.
    if (!dates.map(x => newGroupKeys[x]).every(Manager.isValidBase64)) {
      return false;
    }
    if (!dates.map(x => newPubKeys[x]).every(Manager.isValidBase64)) {
      return false;
    }

    if (oldKeys) {
      const oldDates = Object.keys(oldKeys);
      if (oldDates.length === 0) {
        return true;
      }
      oldDates.sort();
      const smallestOldDate = oldDates[0];
      const largestOldDate = oldDates[oldDates.length - 1];
      // Make sure the server cannot change keys that we saw before,
      // or include additional keys in the interval defined by the keys
      // that we already know.
      const check = x => x < smallestOldDate || x > largestOldDate
        || (oldKeys[x] && toBase64(oldKeys[x].groupPubKey) === newGroupKeys[x]
        && (!oldKeys[x].pubKey || toBase64(oldKeys[x].pubKey) === newPubKeys[x]));
      if (!dates.every(check)) {
        return false;
      }
    }

    return true;
  }

  isHealthy() {
    if (this.isOldVersion) {
      logger.warn('Client is too old. The protocol is no longer accepted by the server');
      return false;
    }

    if (!this.initState.isReady()) {
      logger.warn(`hpnv2 is not loaded (current state: ${ppState(this.initState.state)})`);
      return false;
    }

    if (!this.configLoader.isHealthy()) {
      logger.warn('Config loader not healthy');
      return false;
    }

    if (!this.trustedClock.isHealthy()) {
      logger.warn('Clock out of sync');
      return false;
    }

    const today = formatHoursAsYYYYMMDD(this.trustedClock.checkTime().hoursSinceEpoch);
    const pk = this.getPublicKey(today);
    if (!pk) {
      logger.warn('Not joined with current group');
      return false;
    }

    if (this._joinScheduler.state !== JOIN_STATE.JOINED) {
      logger.warn('Unable to complete join operations.');
      return false;
    }

    return true;
  }
}
/* eslint-enable no-return-assign */
