/* eslint-disable no-return-assign */

import crypto from '../platform/crypto';
import { importRSAKey, signRSA, generateRSAKeypair, sha256 } from '../core/crypto/utils';
import { exportPublicKey } from '../core/crypto/pkcs-conversion';
import { fromBase64, toBase64, toUTF8, fromHex } from '../core/encoding';
import Database from './database';
import GroupSigner from './group-signer';
import Endpoints from './endpoints';
import md5 from '../core/helpers/md5';
import { deflate } from '../core/zlib';
import { digest } from './digest';
import { MsgQuotaError, NotReadyError, InvalidMsgError, NoCredentialsError, BadCredentialsError,
  SignMsgError, TooBigMsgError, FetchConfigError,
  JoinGroupsError, InitSignerError, OldVersionError, WrongClockError } from './errors';
import { formatDate, reflectPromise } from './utils';
import logger from './logger';
import MessageQueue from '../core/message-queue';
import { decompress } from '../core/gzip';
import random from '../core/crypto/random';
import setTimeoutInterval from '../core/helpers/timeout';

const LOAD_CONFIG_SUCCESS_MIN_INTERVAL = 60 * 60 * 1000; // 1 hour
const LOAD_CONFIG_SUCCESS_MAX_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours
const LOAD_CONFIG_FAILURE_INTERVAL = 10 * 1000; // 10 seconds

export default class Manager {
  static get VERSION() {
    return 1;
  }

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
    this.minutesLocal = 0;

    this.logError = logger.error;
    this.log = logger.log;
    this.logDebug = logger.debug;
  }

  constructor() {
    this._initDefaults();
  }

  async init() {
    if (this.unloaded) {
      return;
    }

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

    // Trigger config load, but do not wait for it. It will periodically be reloaded
    // with some increasing timeout in case of repeated failures.
    let minCooldown;
    let randomExtraCooldown;
    try {
      await this._loadConfig();
      if (this.unloaded || this.isOldVersion) {
        return;
      }
      this.logDebug('Config loaded successfully!');
      this.configFailures = 0;
      this.isInit = true;
      minCooldown = LOAD_CONFIG_SUCCESS_MIN_INTERVAL;
      randomExtraCooldown = LOAD_CONFIG_SUCCESS_MAX_INTERVAL - LOAD_CONFIG_SUCCESS_MIN_INTERVAL;
    } catch (e) {
      if (this.unloaded) {
        return;
      }
      this.logDebug('Config could not be loaded successfully!', e);
      this.configFailures += 1;
      minCooldown = this.configFailures * LOAD_CONFIG_FAILURE_INTERVAL;
      randomExtraCooldown = minCooldown;
    }

    // Note: random noise is added, so the collector cannot use
    // time-based attacks to target individual users by serving
    // them different group keys.
    this.configLoader = setTimeout(
      () => this.init(),
      Math.floor(minCooldown + (random() * randomExtraCooldown))
    );
  }

  unload() {
    this.unloaded = true;
    clearTimeout(this.configLoader);
    if (this.signer) {
      this.signer.unload();
    }
    this.endpoints.unload();
    this._initDefaults();
  }

  _wrongClock() {
    this.logError('Wrong system clock! restarting...');
    if (this.clock) {
      this.clock.stop();
    }
    clearTimeout(this.configLoader);
    this.configLoader = null;
    this.isInit = false;
    this.init();
    throw new WrongClockError();
  }

  hours() {
    const minutesLocal = this.minutesLocal;
    const minutesSystem = Math.round(Date.now() / (1000 * 60));
    if (Math.abs(minutesLocal - minutesSystem) > Endpoints.MAX_MINUTES_DRIFT) {
      this._wrongClock();
    }
    return Math.floor(minutesSystem / 60);
  }

  punish() {
    // This bans all stored credentials, temporarily stopping data collection.
    Object.keys(this.groupPubKeys).forEach((shortDate) => {
      this.groupPubKeys[shortDate].banned = true;
      this.db.setGroupPubKey(shortDate, this.groupPubKeys[shortDate]);
    });
  }

  async fetchConfig() {
    // This is the first network request that the module will do on init.
    // We do not skip in order to check whether the system clock is correct or not
    // based on the Date response header. If there is significant drift, loading
    // will fail.
    const { groupPubKeys, sourceMap, minVersion } = await this.endpoints.getConfig();

    if (Manager.VERSION < minVersion) {
      this.isOldVersion = true;
      return;
    }

    // Now we can trust system clock, so start our timer to detect further changes to it...
    this.minutesLocal = Math.round(Date.now() / (1000 * 60));
    if (this.clock) {
      this.clock.stop();
    }
    this.clock = setTimeoutInterval(() => {
      this.minutesLocal += 1;
    }, 60 * 1000);

    await this.db.setLastConfigTime(this.hours());
    const ok = Manager.checkGroupPublicKeys(groupPubKeys, this.groupPubKeys);
    if (!ok) {
      this.punish();
    } else {
      Object.keys(groupPubKeys).forEach((shortDate) => {
        if (!this.groupPubKeys[shortDate]) {
          const groupPubKey = fromBase64(groupPubKeys[shortDate]);
          this.db.setGroupPubKey(shortDate, { groupPubKey });
        }
      });
    }

    // TODO: add some protection for malicious server trying to target by
    // using this. For example, we could limit the maximum allowed daily
    // changes.
    Object.keys(sourceMap.actions).forEach((action) => {
      this.db.setSourceMapAction(action, sourceMap.actions[action]);
    });

    await this.db.purgeTags(this.hours());
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

  today() {
    return formatDate(this.hours()).slice(0, 8);
  }

  async joinGroups() {
    const sortedDates = Object.keys(this.groupPubKeys).sort();
    const smaller = sortedDates.filter(x => x <= this.today());
    if (smaller.length <= 0) {
      throw new Error('No valid group public key is available');
    }

    // Make sure join promises are resolved via reflectPromise
    const joinDates = sortedDates.filter(x => x >= smaller[smaller.length - 1]);
    const results = await Promise.all(joinDates.map(x => reflectPromise(this.joinGroup(x))));
    const error = results.find(({ isError }) => isError);
    if (error) {
      throw error.error;
    }
  }

  // This loads sourceMap and group public keys from the server, and joins groups if needed.
  // Only will add sourceMap actions and public keys we do not already have.
  // Therefore, server should never change an action, always add a new one (append-only).
  // For group public keys we could add a protection: if we find out that
  // the server is changing the group public key for a day, we do not send any data.
  async _loadConfig() {
    if (this.unloaded) {
      return;
    }

    async function waitAndWrap(fn, ErrorClass) {
      try {
        await fn();
      } catch (e) {
        throw new ErrorClass(e.message);
      }
    }

    this.logDebug('Loading config');

    // Fetch config (group public keys, sourcemap). Will punish if server behaves inconsistently.
    await waitAndWrap(() => this.fetchConfig(), FetchConfigError);

    // Joins groups if not already done.
    if (!this.isOldVersion) {
      await waitAndWrap(() => this.joinGroups(), JoinGroupsError);
    }
  }

  // Loads locally stored credentials into the signer, but does not fetch them.
  async loadCredentials() {
    if (this.unloaded) {
      throw new NotReadyError();
    }
    const today = this.today();
    const pk = this.getPublicKey(today);
    if (!pk || !pk.credentials) {
      throw new NoCredentialsError();
    }

    const { groupPubKey, credentials, date } = pk;
    if (this.loadedCredentialsDate >= date) {
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

    const { groupPubKey } = data;
    const challengeStr = JSON.stringify([this.publicKeyB64, toBase64(groupPubKey)]);
    const challenge = await sha256(challengeStr, 'bin');
    const { gsk, joinmsg } = (data.gsk ? data : await this.signer.startJoin(challenge));
    const sig = await signRSA(this.userPK, joinmsg);
    await this.db.setGroupPubKey(date, { groupPubKey, gsk, joinmsg });

    const msg = {
      ts: date,
      joinMsg: toBase64(joinmsg),
      pk: this.publicKeyB64,
      sig: toBase64(fromHex(sig)),
    };

    Manager._setVersion(msg);

    const { joinResponse } = await this.endpoints.join(msg);

    const credentials = await this.signer.finishJoin(
      groupPubKey,
      gsk,
      fromBase64(joinResponse)
    );
    await this.db.setGroupPubKey(date, { groupPubKey, credentials });
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
  //   WrongClockError: Either system clock changed or it differs from server time.
  //   TransportError: A network error when sending the message.
  //   ServerError: Unexpected server error.
  //
  //   (Should never happen, but theoretically possible): SignMsgError, BadCredentialsError
  async send(msg) {
    return this.msgQueue.push(msg);
  }

  // If noverify = true, just returns an empty signature
  // Otherwise, signs the message with the currently loaded credentials
  async _signMessage(message, pretag, hours, period, limit, skipQuotaCheck, noverify) {
    if (noverify) {
      return { sig: new Uint8Array(), cnt: 0 };
    }

    let cnt;
    try {
      cnt = await this.db.consumeFreshCounter(
        md5(JSON.stringify(pretag)),
        hours + period,
        limit
      );
    } catch (e) {
      if (skipQuotaCheck) {
        cnt = 0;
      } else {
        throw new MsgQuotaError(e.message);
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

  _encodeMessage(message, sig, cnt, MSG_SIZE = 16 * 1024) {
    // Formats (all should have same size, 16KB, at least for now):
    //   UNCOMPRESSED:
    //     0x00|
    //     msg_size(2 bytes)|
    //     msg(deflated_msg_size bytes)|
    //     cnt(8 bytes)
    //     sig_with_padding(16384 - 1 - 2 - msg_size bytes - 8)

    //   COMPRESSED:
    //     0x01|
    //     deflated_msg_size(2 bytes)|
    //     deflated_msg(deflated_msg_size bytes)|
    //     cnt(8 bytes)
    //     sig_with_padding(16384 - 1 - 2 - deflated_msg_size bytes - 8)

    //   UNCOMPRESSED_UNSIGNED:
    //     0x7B|
    //     rest_of_msg(16384 - 1 bytes)

    let mb = message;
    let msgCode = 0;
    if (1 + 2 + mb.length + 8 + sig.length > MSG_SIZE) {
      msgCode = 1; // COMPRESSED
      mb = deflate(mb);
    }
    if (1 + 2 + mb.length + 8 + sig.length > MSG_SIZE) {
      throw (new TooBigMsgError());
    }
    const data = new Uint8Array(MSG_SIZE);
    data[0] = msgCode;
    (new DataView(data.buffer)).setUint16(1, mb.length);
    data.set(mb, 1 + 2);
    (new DataView(data.buffer)).setFloat64(1 + 2 + mb.length, cnt);
    data.set(sig, 1 + 2 + mb.length + 8);
    return data;
  }

  static _setVersion(_msg) {
    const msg = _msg;
    if (!msg.hpnv2) {
      msg.hpnv2 = {};
    } else if (typeof msg.hpnv2 !== 'object') {
      this.logError('msg.hpnv2 should be an object');
      msg.hpnv2 = {};
    }
    msg.hpnv2.version = Manager.VERSION;
  }

  async _send(_msg, skipQuotaCheck = false) {
    if (this.isOldVersion) {
      // Should we fail silently here?
      throw new OldVersionError();
    }

    if (!this.isInit || this.unloaded) {
      throw new NotReadyError();
    }

    if (!_msg || typeof _msg !== 'object') {
      throw (new InvalidMsgError('msg must be an object'));
    }

    const msg = _msg;

    const action = msg.action;

    if (msg.compressed) {
      delete msg.compressed;
      msg.payload = JSON.parse(decompress(fromBase64(msg.payload)));
    }

    const payload = msg.payload;
    const config = this.sourceMap[action];

    if (!config) {
      throw (new InvalidMsgError(`unknown action ${action}`));
    }

    if (payload === null || payload === undefined) {
      throw (new InvalidMsgError('msg must not be null or undefined'));
    }

    const { limit = 1, period = 24, keys = [], noverify = false, instant = false } = config;
    const dig = digest(keys, payload);
    const hours = period * Math.floor(this.hours() / period);

    const ts = formatDate(hours).slice(0, period % 24 === 0 ? 8 : 10);

    if (msg.ts !== ts) {
      this.logDebug('msg ts differ', msg.ts, ts);
      msg.ts = ts;
    }

    Manager._setVersion(msg);

    const pretag = [
      action,
      period,
      limit,
      dig,
      hours
    ];

    const utf8Msg = toUTF8(JSON.stringify(msg));

    if (!noverify) {
      await this.loadCredentials();
    }

    const { sig, cnt } = await this._signMessage(
      utf8Msg,
      pretag,
      hours,
      period,
      limit,
      skipQuotaCheck,
      noverify,
    );

    return this.endpoints.send(this._encodeMessage(utf8Msg, sig, cnt), instant);
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
  static checkGroupPublicKeys(newKeys, oldKeys) {
    if (!newKeys || typeof newKeys !== 'object') {
      return false;
    }
    const dates = Object.keys(newKeys);
    if (dates.length > 4 || !dates.every(Manager.isValidDate)) {
      return false;
    }
    const values = dates.map(x => newKeys[x]);
    // Just testing if the group public keys are valid base64. If some is invalid (e.g. garbage)
    // the user will not be able to start joining the group, so server does not gain anything with
    // that.
    if (!values.every(Manager.isValidBase64)) {
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
      const check = x => x < smallestOldDate || x > largestOldDate ||
        (oldKeys[x] && toBase64(oldKeys[x].groupPubKey) === newKeys[x]);
      if (!dates.every(check)) {
        return false;
      }
    }

    return true;
  }
}
/* eslint-enable no-return-assign */
