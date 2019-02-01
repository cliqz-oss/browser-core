/* eslint-disable no-return-assign */

import crypto from '../platform/crypto';
import { importRSAKey, signRSA, generateRSAKeypair, sha256 } from '../core/crypto/utils';
import { exportPublicKey } from '../core/crypto/pkcs-conversion';
import { fromBase64, toBase64, toUTF8, fromHex } from '../core/encoding';
import Database from './database';
import GroupSigner from './group-signer';
import Endpoints from './endpoints';
import md5 from '../core/helpers/md5';
import { digest } from './digest';
import { MsgQuotaError, NotReadyError, InvalidMsgError, NoCredentialsError, BadCredentialsError,
  SignMsgError, FetchConfigError,
  JoinGroupsError, InitSignerError, OldVersionError } from './errors';
import { formatDate, reflectPromise, encodeWithPadding } from './utils';
import logger from './logger';
import MessageQueue from '../core/message-queue';
import { decompress } from '../core/gzip';
import random from '../core/crypto/random';
import setTimeoutInterval from '../core/helpers/timeout';
import { VERSION } from './constants';
import prefs from '../core/prefs';
import events from '../core/events';

const LOAD_CONFIG_SUCCESS_MIN_INTERVAL = 60 * 60 * 1000; // 1 hour
const LOAD_CONFIG_SUCCESS_MAX_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours
const LOAD_CONFIG_FAILURE_INTERVAL = 10 * 1000; // 10 seconds

const MSG_SIGNED = 0x03;

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
    this.minutesLocal = 0;
    this.timeDrift = 0;

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
    this.logError('Wrong system clock! Syncing...');
    clearTimeout(this.configLoader);
    this.configLoader = null;
    this.init();
  }

  hours() {
    const minutesLocal = this.minutesLocal;
    const minutesSystem = Math.round((this.timeDrift + Date.now()) / (1000 * 60));
    const hours = Math.floor(minutesSystem / 60);
    if (Math.abs(minutesLocal - minutesSystem) > Endpoints.MAX_MINUTES_DRIFT) {
      this._wrongClock();
    } else if (formatDate(hours).slice(0, 8) !== prefs.get('config_ts')) {
      // Let's try to keep config_ts in sync.
      this.log('Syncing config_ts');
      events.pub('cliqz-config:triggerUpdate');
    }
    return hours;
  }

  async punish() {
    // This bans all stored credentials, temporarily stopping data collection.
    return Promise.all(Object.keys(this.groupPubKeys).map((shortDate) => {
      this.groupPubKeys[shortDate].banned = true;
      return this.db.setGroupPubKey(shortDate, this.groupPubKeys[shortDate]);
    }));
  }

  async fetchConfig() {
    // This is the first network request that the module will do on init.
    // We do not skip in order to check whether the system clock is correct or not
    // based on the Date response header. If there is significant drift, loading
    // will fail.
    const { groupPubKeys, pubKeys, sourceMap, minVersion, ts } = await this.endpoints.getConfig();
    const time = (new Date(ts)).getTime();
    this.timeDrift = time - Date.now();
    this.minutesLocal = Math.round(time / (1000 * 60));
    const hours = Math.floor(this.minutesLocal / 60);

    if (VERSION < minVersion) {
      this.isOldVersion = true;
      return;
    }

    // Now we can trust system clock, so start our timer to detect further changes to it...
    if (this.clock) {
      this.clock.stop();
    }
    this.clock = setTimeoutInterval(() => {
      this.minutesLocal += 1;
      this.hours(); // Check out of sync clock
    }, 60 * 1000);

    const ok = Manager.checkGroupPublicKeys(groupPubKeys, pubKeys, this.groupPubKeys);
    if (!ok) {
      await this.punish();
    } else {
      // Update server public keys in db.
      await Promise.all(Object.keys(groupPubKeys).map((shortDate) => {
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

    await this.db.purgeTags(hours);
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

  // Loads server ECDH pubKey (but does not fetch them).
  // if !skipGroupKeys, also loads locally stored credentials into the signer.
  async loadKeys(skipGroupKeys) {
    if (this.unloaded) {
      throw new NotReadyError();
    }
    const today = this.today();
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
  async send(msg) {
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
        return await this._sendNoVerify({ msg, config, publicKey });
      }

      return await this.msgQueue.push({ msg, config, publicKey });
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

  async _sendNoVerify({ msg, config, publicKey }) {
    const { instant = false } = config;

    // Hack: this uses the first '{' as the message code.
    this.log('Sending noverify msg', msg);
    return this.endpoints.send(
      Manager.compressAndPad(toUTF8(JSON.stringify(msg))),
      { instant, publicKey }
    );
  }

  async _send({ msg: _msg, config, publicKey }, skipQuotaCheck = false) {
    const msg = _msg;
    const { action } = msg;

    if (msg.compressed) {
      delete msg.compressed;
      msg.payload = JSON.parse(decompress(fromBase64(msg.payload)));
    }

    const { payload } = msg;

    const { limit = 1, period = 24, keys = [], instant = false } = config;
    const dig = digest(keys, payload);
    const hours = period * Math.floor(this.hours() / period);

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
      { instant, publicKey }
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
}
/* eslint-enable no-return-assign */
