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
import md5 from '../core/helpers/md5';
import { digest } from './digest';
import { MsgQuotaError, NotReadyError, InvalidMsgError, NoCredentialsError, BadCredentialsError,
  SignMsgError, InitSignerError, OldVersionError,
  ClockOutOfSyncWhileJoining } from './errors';
import { formatDate, reflectPromise, encodeWithPadding } from './utils';
import logger from './logger';
import MessageQueue from '../core/message-queue';
import { decompress } from '../core/gzip';
import { VERSION } from './constants';
import prefs from '../core/prefs';

const MSG_SIGNED = 0x03;

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

const JOIN_STATE = {
  PENDING_JOINS: 0,
  JOINED: 1,
  WAITING_FOR_CLOCK_SYNC: 2,
};

/**
 * Returns a string, for example: "20190122"
 */
function formatHoursAsYYYYMMDD(hoursSinceEpoch) {
  return formatDate(hoursSinceEpoch).slice(0, 8);
}

export default class Manager {
  _initDefaults() {
    this.configFailures = 0;
    this.signerInitialized = false;
    this.isInit = false;
    this.unloaded = false;

    this.db = new Database();
    this.endpoints = new Endpoints();
    this.loadedCredentialsDate = null;
    this.msgQueue = MessageQueue('hpnv2', this._send.bind(this));
    this.isOldVersion = false;
    this.configLoader = null;
    this.signer = null;
    this.ecdhPubKey = {};

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
    this.trustedClock.onClockOutOfSync = () => {
      this.configLoader.synchronizeClocks();

      // react on a hint: if the last, we failed to join because of the clock,
      // we can now bypass the timer and immediately try to join again
      if (this._joinScheduler.state === JOIN_STATE.WAITING_FOR_CLOCK_SYNC) {
        this._joinScheduler.state = JOIN_STATE.PENDING_JOINS;
        this.scheduleJoinGroup();
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
        this.isInit = true;
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
    if (this.unloaded) {
      return;
    }
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

    // This is the first network request that the module will do on init.
    // We do not skip in order to check whether the system clock is correct or not
    // based on the Date response header. If there is significant drift, loading
    // will fail.
    await this.configLoader.fetchConfig();
  }

  unload() {
    this.unloaded = true;
    if (this.signer) {
      this.signer.unload();
    }
    clearTimeout(this._joinScheduler.nextJoinTimer);
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
  async updateConfig({ groupPubKeys, pubKeys, sourceMap, minVersion }) {
    if (VERSION < minVersion) {
      this.logError(`We are running an old version of the protocol, which is no longer supported by the server. All communication will be stopped. Our version: ${VERSION} does not meet the minimum version required by the server: ${minVersion}`);
      this.isOldVersion = true;
      return;
    }

    const ok = Manager.checkGroupPublicKeys(groupPubKeys, pubKeys, this.groupPubKeys);
    if (!ok) {
      await this.punish();
    } else {
      const oldGroupKeys = Object.keys(this.groupPubKeys);
      const newGroupPubKeys = Object.keys(groupPubKeys).filter(x => !oldGroupKeys.includes(x));

      // Special case: if a new key is published, not all clients should immediately
      // attempt to join the group, for two reasons:
      // 1) It leads to a sudden spike of join requests
      // 2) (worse) not all servers might yet have synchronized and are aware of that key
      if (newGroupPubKeys.length === 1) {
        const latestKey = newGroupPubKeys[0];
        const randomDelayInMs = 30 * MINUTE + Math.random() * 2 * HOUR;
        this.log('Delay joining the latest group', latestKey, 'by', randomDelayInMs, 'ms');
        this._joinScheduler.cooldowns.set(latestKey, Date.now() + randomDelayInMs);
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

    try {
      const { inSync, hoursSinceEpoch } = this.trustedClock.checkTime();
      if (inSync) {
        await this.db.purgeTags(hoursSinceEpoch);
      }
    } catch (e) {
      this.logError('Failed to purge old tags in the database:', e);
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
    clearTimeout(this._joinScheduler.nextJoinTimer);
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
      logger.warn('Failed to join group. Retrying again in', timeoutInMs, 'ms');

      this._joinScheduler.nextJoinTimer = setTimeout(() => {
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
        if (key !== activeKey && !this._joinScheduler.cooldown.has(key)) {
          const randomBackoff = 5 * MINUTE + 30 * MINUTE * Math.random();
          this._joinScheduler.cooldown.set(key, Date.now() + randomBackoff);
        }
      }
      throw error.error;
    }
  }

  // Loads server ECDH pubKey (but does not fetch them).
  // if !skipGroupKeys, also loads locally stored credentials into the signer.
  async loadKeys(skipGroupKeys) {
    if (this.unloaded) {
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
      const key = await crypto.subtle.importKey(
        'raw',
        pubKey,
        { name: 'ECDH', namedCurve: 'P-256' },
        false,
        []
      );

      this.ecdhPubKey = { key, date };
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
      await this.db.purgeOldPubKeys(date);
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
  async send(msg, { proxyBucket } = {}) {
    try {
      if (this.isOldVersion) {
        throw new OldVersionError();
      }

      if (!this.isInit || this.unloaded) {
        throw new NotReadyError();
      }

      if (!msg || typeof msg !== 'object') {
        throw (new InvalidMsgError('msg must be an object'));
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

      const publicKey = Manager.clearText ? undefined : this.ecdhPubKey;

      // Do not queue noverify messages, these are ok to do in parallel
      if (noverify) {
        return await this._sendNoVerify({ msg, config, publicKey, proxyBucket });
      }

      return await this.msgQueue.push({ msg, config, publicKey, proxyBucket });
    } catch (e) {
      this.logError('Send error', e);
      throw e;
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
      this.logError('Error signing msg', e);
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

  async _sendNoVerify({ msg, config, publicKey, proxyBucket }) {
    const { instant = false } = config;

    // Hack: this uses the first '{' as the message code.
    this.log('Sending noverify msg', msg);
    return this.endpoints.send(
      Manager.compressAndPad(toUTF8(JSON.stringify(msg))),
      { instant, publicKey, proxyBucket }
    );
  }

  async _send({ msg: _msg, config, publicKey, proxyBucket }, skipQuotaCheck = false) {
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

    const pretag = [
      action,
      period,
      limit,
      dig,
      hours
    ];

    const { sig, cnt } = await this._signMessage(
      utf8Msg,
      action,
      pretag,
      hours,
      period,
      limit,
      skipQuotaCheck,
    );

    this.log('Sending signed msg', msg);
    return this.endpoints.send(
      Manager.encodeSignedMessage(utf8Msg, sig, cnt),
      { instant, publicKey, proxyBucket }
    );
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
    if (this.unloaded) {
      logger.warn('hpnv2 unloaded');
      return false;
    }

    if (!this.isInit) {
      logger.warn('hpnv2 initialization not completed');
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
