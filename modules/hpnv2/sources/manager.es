/* eslint-disable no-return-assign */

import crypto from '../platform/crypto';
import { importRSAKey, signRSA, generateRSAKeypair, sha256 } from '../core/crypto/utils';
import { exportPublicKey } from '../core/crypto/pkcs-conversion';
import utils from '../core/utils';
import { fromBase64, toBase64, toUTF8, fromHex } from '../core/encoding';
import Database from './database';
import GroupSigner from './group-signer';
import Endpoints from './endpoints';
import md5 from '../core/helpers/md5';
import { deflate } from '../core/zlib'; // TODO: check how fast this is, use WebAssembly instead?
import { digest } from './digest';
import { MsgQuotaError, NotReadyError, InvalidMsgError, NoCredentialsError, BadCredentialsError,
  SignMsgError, TooBigMsgError, TransportError, MsgTimeoutError, InitUserPKError, FetchConfigError,
  JoinGroupsError, LoadCredentialsError, InitSignerError } from './errors';
import { formatDate, formatError } from './utils';
import logger from './logger';
import { nextTick } from '../core/decorators';
import { getUserAgent } from '../platform/device-info';
import { randomInt } from '../core/crypto/random';
import MessageQueue from '../core/message-queue';
import { decompress } from '../core/gzip';

const { setTimeout, clearTimeout } = utils;

const LOAD_CONFIG_INTERVAL = 60 * 60 * 1000;
const MSG_TIMEOUT = 60 * 1000;
const MAX_RETRIES = 3;

// FIXME: Just for debug
const sessionID = randomInt();

export default class Manager {
  constructor({ debug = true } = {}) {
    this.signerInitialized = false;
    this.isInit = false;
    this.unloaded = false;
    this.debug = debug;
    this.db = new Database();
    this.endpoints = new Endpoints();
    this.loadedCredentialsDate = null;
    this.msgQueue = MessageQueue('hpnv2', this._send.bind(this));

    this.logError = logger.error;
    this.log = logger.log;
    this.logDebug = logger.debug;

    this.setStatsHandlers(debug);
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
    // TODO: should we hardcode the sourceMap?
    return this.db.sourceMap;
  }

  get actionStats() {
    return this.db.stats;
  }

  hours() {
    return Math.floor(this.endpoints.getTime() / (1000 * 3600));
  }

  sendDebug(payload) {
    nextTick(() => {
      if (this.debug) {
        this.logDebug('Sending debug', payload);
        return this._send({
          action: 'hpnv2-debug',
          payload,
          userAgent: getUserAgent(),
          id: this.userPK64 && md5(this.userPK64),
          time: formatDate(Date.now() / (3600 * 1000)),
          extensionVersion: utils.extensionVersion,
          sessionID,
          __retries: MAX_RETRIES,
        });
      }
      return nextTick(() => {});
    }).catch((e) => {
      this.logError(e);
    });
  }

  setStatsHandlers(debug) {
    if (debug) {
      this.actionIncrement = (action = '__unknown__', result) => {
        if (action === 'hpnv2-debug') {
          return;
        }
        if (!this.actionStats[action]) {
          this.actionStats[action] = {
            ok: 0,
            ko: 0,
            tried: 0,
          };
        }
        const stats = this.actionStats[action];
        stats[result] += 1;
        this.db.setStats(this.actionStats);
      };

      this.actionError = (action = '__unknown__', error) => {
        if (action === 'hpnv2-debug') {
          return;
        }
        this.actionIncrement(action, 'ko');
        this.sendDebug({ action, msgError: formatError(error) });
      };

      this.initError = (error) => {
        // Fatal error, db might not be available, send directly.
        this.sendDebug({ initError: formatError(error) });
      };

      this.configError = (error) => {
        // Error reloading config, action map might no be availble, send directly.
        this.sendDebug({ configError: formatError(error) });
      };
    } else {
      this.logDebug = () => {};
      this.actionIncrement = () => {};
      this.actionError = () => {};
      this.initError = () => {};
      this.configError = () => {};
    }
  }

  sendStats() {
    if (Object.keys(this.actionStats).length > 0) {
      this.sendDebug({ actionStats: this.actionStats });
      this.db.setStats({});
    }
    return nextTick(() => {});
  }

  fetchConfig() {
    // TODO: check correctness of config, dates, actions...
    // also check that actions or group public keys do not change...
    return nextTick(() => this.endpoints.getConfig())
      .then(({ groupPubKeys, sourceMap }) => {
        this.db.setLastConfigTime(this.hours());
        Object.keys(groupPubKeys).forEach((date) => {
          const shortDate = date.slice(0, 8);
          if (!this.groupPubKeys[shortDate]) {
            const groupPubKey = fromBase64(groupPubKeys[shortDate]);
            this.db.setGroupPubKey(shortDate, { groupPubKey });
          }
        });

        Object.keys(sourceMap.actions).forEach((action) => {
          if (this.debug || !this.sourceMap[action]) {
            this.db.setSourceMapAction(action, sourceMap.actions[action]);
          }
        });
      })
      .then(() => this.db.purgeTags(this.hours()));
  }

  getPublicKey(date) {
    const smaller = Object.keys(this.groupPubKeys).sort().filter(x => x <= date);
    if (this.getNextPublicKeys(date).length > 0 && smaller.length > 0) {
      return this.groupPubKeys[smaller[smaller.length - 1]];
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

  joinGroups() {
    return nextTick(() => {
      const sortedDates = Object.keys(this.groupPubKeys).sort();
      const smaller = sortedDates.filter(x => x <= this.today());
      if (smaller.length <= 0) {
        throw new Error('No valid group public key is available');
      }
      const validDate = smaller[smaller.length - 1];
      // TODO: is joining all days too aggresive?
      return Promise.all(
        sortedDates.filter(x => x >= validDate).map(
          x => this.joinGroup(x)
        )
      );
    });
  }

  // This loads sourceMap and group public keys from the server, and joins groups if needed.
  // Only will add sourceMap actions and public keys we do not already have.
  // Therefore, server should never change an action, always add a new one (append-only).
  // For group public keys we could add a protection: if we find out that
  // the server is changing the group public key for a day, we do not send any data.
  loadConfig(firstTime = false) {
    function wrapFailure(e, ErrorClass) {
      throw new ErrorClass(e);
    }

    if (this.unloaded) {
      return Promise.resolve();
    }

    this.logDebug('Loading config');

    // TODO: protect against attacks like different sourceMaps, different publicKeys
    // attempting to distinguish users.
    return nextTick(() => this.sendStats())
      .then(() => this.initUserPK().catch(e => wrapFailure(e, InitUserPKError)))
      .then(() => {
        const today = this.today();
        const diffHours = this.hours() - this.db.getLastConfigTime();
        const skipFetch = !this.debug && diffHours < 24 && this.getPublicKey(today) &&
          this.getNextPublicKeys(today).length > 1;
        if (skipFetch) {
          this.logDebug('No need to fetch config');
          return null;
        }
        return this.fetchConfig().catch(e => wrapFailure(e, FetchConfigError));
      })
      .then(() => this.joinGroups().catch(e => wrapFailure(e, JoinGroupsError)))
      .then(() => this.loadCredentials().catch(e => wrapFailure(e, LoadCredentialsError)))
      .then(() => {
        if (!this.unloaded) {
          this.logDebug('Config (re)loaded successfully!');
          this.configLoader = setTimeout(this.loadConfig.bind(this, false), LOAD_CONFIG_INTERVAL);
        }
      })
      .catch((e) => {
        if (!this.unloaded) {
          if (firstTime) {
            throw e;
          }
          this.logError('Error loading config', e);
          this.configError(e);
          this.configLoader = setTimeout(this.loadConfig.bind(this, false), 60 * 1000);
        }
      });
  }

  loadCredentials() {
    return nextTick(() => {
      if (this.unloaded) {
        throw new NotReadyError();
      }
      const today = this.today();
      const pk = this.getPublicKey(today);
      if (!pk || !pk.credentials) {
        throw (new NoCredentialsError());
      }

      const { groupPubKey, credentials, date } = pk;
      if (this.loadedCredentialsDate >= date) {
        return nextTick(() => {});
      }

      this.logDebug('Loading credentials', pk.date);

      return this.signer.setGroupPubKey(groupPubKey)
        .then(() => this.signer.setUserPrivKey(credentials))
        .then(() => this.db.purgeOldPubKeys(date))
        .then(() => (this.loadedCredentialsDate = date))
        .catch((e) => {
          this.logError('Error loading credentials', e);
          throw (new BadCredentialsError());
        });
    });
  }

  init() {
    // Lazy initialization (see _init), will be done when sending a message (if needed)
    // For example, we don't need to initialize for sending noverify = true messages (unsigned
  }

  _init() {
    this.sendDebug({ beforeInit: true });

    return nextTick(() => this.sendStats())
      .then(() => this.initSigner())
      .catch((e) => {
        // This should never happen
        throw new InitSignerError(e);
      })
      // DB init errors should fall back to memory-only db, but reporting them
      .then(() => this.db.init().catch((e) => {
        this.initError(e);
        this.logError('Could not init (indexed)DB, will switch to memory-only DB');
      }))
      .then(() => this.loadConfig(true))
      .then(() => {
        this.isInit = true;
        this.sendDebug({ afterInit: true });
      });
  }

  unload() {
    this.isInit = false;
    clearTimeout(this.configLoader);
    this.configLoader = null;

    if (this.signer) {
      this.signer.unload();
      this.signer = null;
    }
    this.signerInitialized = false;

    this.unloaded = true;
    this.db = null;
    this.endpoints = null;
  }

  initSigner() {
    if (this.signerInitialized) {
      return nextTick(() => {});
    }

    return nextTick(() => (this.signer = new GroupSigner()))
      .then(() => this.signer.init())
      .then(() => this.signer.seed(crypto.getRandomValues(new Uint8Array(128))))
      .then(() => {
        this.signerInitialized = true;
      })
      .catch((e) => {
        if (this.signer) {
          this.signer.unload();
          this.signer = null;
        }
        throw e;
      });
  }

  registerKey() {
    // TODO: implement
    return nextTick(() => {});
  }

  initUserPK() {
    return nextTick(() => {
      if (this.publicKeyB64) {
        return nextTick(() => {});
      }
      const keyPromise = (this.userPK64 ? nextTick(() => this.userPK64) :
        generateRSAKeypair().then(([pub, priv]) =>
          this.registerKey(pub, priv)
            .then(() => {
              this.userPK64 = priv;
              return priv;
            })
        ));

      return keyPromise
        .then(pk => importRSAKey(pk, false, 'SHA-256', 'RSASSA-PKCS1-v1_5'))
        .then(key => (this.userPK = key))
        .then(() => crypto.subtle.exportKey('jwk', this.userPK))
        .then(exportPublicKey)
        .then(publicKeyB64 => (this.publicKeyB64 = publicKeyB64));
    });
  }

  // For each day, we should have a group public key and valid issued credentials
  // for that. We can have three states for the credentials: empty, user private
  // key generated, and final credentials issued. We need to be able to resume
  // from the second state, since due to network problems we might not receive
  // issued credentials, but the server could mark them as generated.

  // (Group public) key rotation will be controlled by the server. Keys are retrieved
  // via /config endpoint, each key labelled with a date (YYYYMMDD). If the endpoint
  // does not return a key for today it means that the previous group public key is still valid.
  joinGroup(date) {
    return nextTick(() => {
      const data = this.groupPubKeys[date];
      if (!data) {
        throw new Error(`No key found for date ${date}`);
      }
      if (data.credentials) {
        this.logDebug('Found credentials for', date);
        return nextTick(() => data);
      }

      this.logDebug('Joining group', date);

      const { groupPubKey } = data;
      const challengeStr = JSON.stringify([this.publicKeyB64, toBase64(groupPubKey)]);

      return sha256(challengeStr, 'bin')
        .then(challenge => (data.gsk ? data : this.signer.startJoinStatic(challenge)))
        .then(({ gsk, joinmsg }) => Promise.all([
          joinmsg,
          gsk,
          signRSA(this.userPK, joinmsg),
          this.db.setGroupPubKey(date, { groupPubKey, gsk, joinmsg }),
        ]))
        .then(([joinmsg, gsk, sig]) => Promise.all([
          gsk,
          this.endpoints.join({
            ts: date,
            joinMsg: toBase64(joinmsg),
            pk: this.publicKeyB64,
            sig: toBase64(fromHex(sig)),
          }),
        ]))
        .then(([gsk, { joinResponse }]) =>
          this.signer.finishJoinStatic(groupPubKey, gsk, fromBase64(joinResponse))
        )
        .then((credentials) => {
          this.db.setGroupPubKey(date, { groupPubKey, credentials });
          return this.groupPubKeys[date];
        });
    });
  }

  send(_msg) {
    if (_msg) {
      const msg = JSON.parse(JSON.stringify(_msg));
      this.actionIncrement(msg.action, 'tried');
      this.msgQueue.push(msg);
    }

    return nextTick(() => {});
  }

  // We will not modify the msg, but will check it's a valid one.
  // This means it follows the structure { action, payload, ts, ... }
  // Where payload is an object and ts follows the format YYYYMMDD[HH] (HH optional).
  // If ts is not valid it will be set by the send function (ok, we do modify the
  // msg in this case...)
  _send(_msg, skipQuotaCheck = false) {
    return nextTick(() => {
      if (this.unloaded) {
        throw new NotReadyError();
      }
      if (!_msg || typeof _msg !== 'object') {
        throw (new InvalidMsgError('msg must be an object'));
      }

      const msg = _msg;

      const retries = msg.__retries || 0;
      delete msg.__retries;

      const action = msg.action;

      if (msg.compressed) {
        delete msg.compressed;
        msg.payload = JSON.parse(decompress(fromBase64(msg.payload)));
      }

      const payload = msg.payload;
      // TODO: es6 map?
      const config = this.sourceMap[action];

      if (!config) {
        throw (new InvalidMsgError(`unknown action ${action}`));
      }

      if (payload === null || payload === undefined) {
        throw (new InvalidMsgError('msg must not be null or undefined'));
      }

      const { limit = 1, period = 24, keys = [], noverify = false } = config;
      const dig = digest(keys, payload);
      const hours = period * Math.floor(this.hours() / period);

      const ts = formatDate(hours).slice(0, period % 24 === 0 ? 8 : 10);

      if (msg.ts !== ts) {
        this.logDebug('msg ts differ', msg.ts, ts);
        msg.ts = ts;
      }

      const pretag = [
        action,
        period,
        limit,
        dig,
        hours
      ];

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

      const MSG_SIZE = 16384;
      let mb = toUTF8(JSON.stringify(msg));
      let promise = nextTick(() => {});
      if (noverify) {
        promise = promise.then(() => ({ sig: new Uint8Array(), cnt: 0 }));
      } else {
        if (!this.isInit) {
          promise = promise.then(() => this._init());
        }
        promise = promise.then(() => this.loadCredentials()).then(() =>
          this.db.consumeFreshCounter(
            md5(JSON.stringify(pretag)),
            hours + period,
            limit
          )
            .catch((e) => {
              if (skipQuotaCheck) {
                return 0;
              }
              throw (new MsgQuotaError(e));
            })
            .then(cnt =>
              Promise.all([
                sha256(mb, 'b64'),
                sha256(JSON.stringify([...pretag, cnt]), 'b64'),
              ])
                .then(([hashm, bsn]) => this.signer.sign(fromBase64(hashm), fromBase64(bsn)))
                .catch((e) => {
                  this.logError('Error signing msg', e);
                  throw (new SignMsgError());
                })
                .then(sig => ({ sig, cnt }))
            )
        );
      }

      return (new Promise((resolve, reject) => {
        setTimeout(() => reject(new MsgTimeoutError()), MSG_TIMEOUT);

        promise.then(({ sig, cnt }) => {
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
        })
          .then(encoded =>
            this.endpoints.send(encoded)
              .catch(() => {
                throw (new TransportError());
              })
          )
          .then(() => {
            this.actionIncrement(action, 'ok');
          })
          .then(resolve)
          .catch(reject);
      }))
        .catch((e) => {
          const nonRetriableErrors = [MsgQuotaError, TooBigMsgError];
          if (!this.unloaded) {
            if (nonRetriableErrors.every(x => !(e instanceof x)) && retries < MAX_RETRIES) {
              msg.__retries = retries + 1;
              this.msgQueue.push(msg);
            } else {
              this.actionError(msg && msg.action, e);
            }
          }
        });
    });
  }
}
/* eslint-enable no-return-assign */
