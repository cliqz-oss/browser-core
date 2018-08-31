/**
* Creates object for message recieved+
* Only excepts valid JSON messages with the following fields:
* Type : Humanweb / Antitracking etc.
* Actions : Valid actions like Page, query etc.
* @returns string with payload created.
*/

import md5 from '../../core/helpers/md5';
import UserPK from './user-pk';
import { getProxyVerifyUrl } from '../routing';

import { sha1 } from '../../core/crypto/utils';

import {
  fromBase64,
  toBase64,
  toUTF8,
  fromUTF8,
  fromHex,
  toHex,
} from '../../core/encoding';

import {
  createPayloadBlindSignature,
  createPayloadProxy,
  getRouteHash,
} from './utils';
import { unBlindMessage, blindSignContext } from './blind-signature';
import _http from './http-worker';

import crypto from '../../platform/crypto';

const BlindSignContext = blindSignContext;

/* This method will ensure that we have the same length for all the mesages
*/
function padMessage(msg) {
  const mxLen = 14000;
  const padLen = (mxLen - msg.length) + 1;
  if (padLen < 0) {
    throw new Error(`msgtoobig (size=${msg.length} exceeds limit=${mxLen}, ` +
                    `<message>${msg.substr(0, 100)}<...rest is skipped>)`);
  }
  return msg + new Array(padLen).join('\n');
}

function isJson(str) {
// If can be parsed that means it's a str.
// If cannot be parsed and is an object then it's a JSON.
  try {
    JSON.parse(str);
  } catch (e) {
    if (typeof str === 'object') return true;
  }
  return false;
}

function hexToBinary(s) {
  let ret = '';
  // let i, k, part, ret = '';
  // lookup table for easier conversion. '0' characters are padded for '1' to '7'
  const lookupTable = {
    0: '0000',
    1: '0001',
    2: '0010',
    3: '0011',
    4: '0100',
    5: '0101',
    6: '0110',
    7: '0111',
    8: '1000',
    9: '1001',
    a: '1010',
    b: '1011',
    c: '1100',
    d: '1101',
    e: '1110',
    f: '1111',
    A: '1010',
    B: '1011',
    C: '1100',
    D: '1101',
    E: '1110',
    F: '1111',
  };
  for (let i = 0; i < s.length; i += 1) {
    if (Object.prototype.hasOwnProperty.call(lookupTable, s[i])) {
      ret += lookupTable[s[i]];
    } else {
      return { valid: false };
    }
  }
  return { valid: true, result: ret };
}

export default class MessageContext {
  constructor(msg, CliqzSecureMessage, logger = { log: () => {}, error: () => {} }) {
    this.noJSONKeys = ['noJSONKeys', 'csm', 'logger'];
    this.csm = CliqzSecureMessage;
    this.logger = logger;
    // FIXME: isJson is called 3 times on same object
    // TODO: don't use isJSON - try / catch should be sufficient
    if (!msg || !isJson(msg)) return;
    this.orgMessage = isJson(msg) ? JSON.stringify(msg) : msg;
    this.jMessage = isJson(msg) ? msg : JSON.parse(msg);
    this.signed = null;
    this.encrypted = null;
    this.routeHash = null;
    this.type = this.jMessage.type || null;
    this.action = this.jMessage.action || null;
    this.sha256 = null;
    this.interval = null;
    this.rateLimit = null;
    this.endPoint = null;
    this.mE = null;
    this.mK = null;
    this.mP = null;
    this.dm = null;
    this.proxyValidators = null;
  }

  toJSON() {
    const obj = {};
    Object.keys(this).forEach((x) => {
      if (this.noJSONKeys.indexOf(x) === -1) {
        obj[x] = this[x];
      }
    });
    return obj;
  }

  log(...args) {
    this.logger.log(...args);
  }

  error(...args) {
    this.logger.error(...args);
  }

  getproxyCoordinator() {
    const msg = this.jMessage;
    this.endPoint = this.csm.sourceMap[this.action].endpoint;
    this.md5Hash = md5(this.action);
    const promise = new Promise((resolve, reject) => {
      try {
        const stringRouteHash = getRouteHash(msg, this.csm.sourceMap);
        sha1(stringRouteHash).then((hashM) => {
          this.sha1 = hashM;
          const dmC = hexToBinary(hashM).result.slice(0, 13);
          const routeHash = parseInt(dmC, 2);
          this.fullHash = hashM;
          this.dmC = dmC;
          const totalProxies = 4096;
          const modRoute = routeHash % totalProxies;
          const proxy = this.csm.routeTable[modRoute];
          const proxyUrl = getProxyVerifyUrl({
            host: proxy.dns,
            ip: proxy.ip,
            supportsHttps: proxy.ssl
          });
          this.proxyCoordinator = proxyUrl;
          resolve(this);
        }).catch((err) => {
          this.log(`ERROR >> ${err}`);
          reject(err);
        });
      } catch (e) {
        reject(e);
      }
    });
    return promise;
  }

  /**
   * Method to generate an AES-CBC 128 bit key.
   * @returns crypto object of AES KEY.
   */
  aesGenerateKey() {
    return crypto.subtle.generateKey(
      {
        name: 'AES-CBC',
        length: 128,
      },
      true,
      ['encrypt', 'decrypt']
    ).catch((err) => {
      this.log(`Error in generating key: ${err}`);
      throw err;
    });
  }

  /**
   * Method to generate an AES-CBC 128 bit key.
   * @returns crypto object of AES KEY.
   */
  aesExportKey(key) {
    return crypto.subtle.exportKey('raw', key).then((result) => {
      this.aesKey = toHex(new Uint8Array(result));
      return key;
    }).catch((err) => {
      this.log(`Error in exporting key: ${err}`);
      throw err;
    });
  }
  /**
   * Method to parse a message and encrypt with AES.
   * @throws {string} Will throw 'msgtoobig' if message size exceeds a threshold.
   * @returns string of AES encrypted message.
   */
  aesEncryption(key, _iv, msgEncrypt) {
    return crypto.subtle.encrypt(
      {
        name: 'AES-CBC',
        iv: _iv,
      },
      key,
      toUTF8(msgEncrypt) // ArrayBuffer of data you want to encrypt
    ).catch((err) => {
      this.log(`Error in aes encryption: ${err}`);
      throw err;
    });
  }

  rsaEncrypt(msg) {
    const publicKey = this.csm.secureLogger.publicKeyB64;
    return crypto.subtle.importKey(
      'spki',
      fromBase64(publicKey),
      {
        name: 'RSA-OAEP',
        hash: { name: 'SHA-1' }
      },
      false,
      ['encrypt']
    )
      .then(key => crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, toUTF8(msg)))
      .then(toBase64)
      .catch((err) => {
        this.error(`Error during rsa encryption: ${err}`);
        throw err;
      });
  }
  /**
   * Method to parse a message and encrypt with AES.
   * @throws {string} Will throw 'msgtoobig' if message size exceeds a threshold.
   * @returns string of AES encrypted message.
   */
  aesEncrypt(type) {
    const promise = new Promise((resolve, reject) => {
      const _iv = crypto.getRandomValues(new Uint8Array(16));
      const eventID = toHex(_iv).substring(0, 5);

      this.eventID = eventID;
      this.iv = toHex(_iv);
      this.mID = eventID;
      this.oiv = _iv;

      this.aesGenerateKey()
        .then(key => this.aesExportKey(key))
        .then((key) => {
          const encryptionPaylod = {};
          encryptionPaylod.msg = this.orgMessage;
          encryptionPaylod.endpoint = this.endPoint;
          let msgEncrypt = JSON.stringify(encryptionPaylod);
          if (type === 'telemetry') {
            try {
              msgEncrypt = padMessage(JSON.stringify(encryptionPaylod));
            } catch (e) {
              reject(`padMessage failed (message type: ${type}): ${e}`);
              return;
            }
          }

          this.aesEncryption(key, _iv, msgEncrypt).then((encryptedResult) => {
            this.mE = toBase64(new Uint8Array(encryptedResult));
            resolve(this.mE);
          });
        });
    });
    return promise;
  }

  /**
   * Method to parse a message and decrypt with AES.
   * @returns string of AES decrypted message.
   */
  aesDecrypt(msg) {
    const promise = new Promise((resolve /* , reject */) => {
      const _msg = fromBase64(msg.split(';')[1]);
      const hashKey = this.aesKey;
      const _iv = this.iv;
      crypto.subtle.importKey(
        'raw',
        fromHex(hashKey),
        'AES-CBC',
        false,
        ['decrypt']
      )
        .then((key) => {
          crypto.subtle.decrypt(
            {
              name: 'AES-CBC',
              iv: fromHex(_iv),
            },
            key,
            _msg
          )
            .then((decrypted) => {
              // returns an ArrayBuffer containing the decrypted data
              // console.log("Decrypted>>> " + fromUTF8(new Uint8Array(decrypted)));
              resolve(fromUTF8(new Uint8Array(decrypted)));
            })
            .catch((err) => {
              this.error(err);
            });
        })
        .catch((err) => {
          this.error(err);
        });
    });

    return promise;
  }

  /**
   * Method to sign the AES encryptiong key with Aggregator Public key.
   * Calculate mK = {AESKey;iv;endPoint}
   * @returns string of encrypted key.
   */
  signKey() {
    const promise = new Promise((resolve, reject) => {
      try {
        // To protect from padding oracle attacks, we need to send the hash of
        // mE.
        const mI = md5(this.mE); // replace it with web-crypto md5.
        const messageToSign = `${this.aesKey};${this.iv};endPoint;${mI}`;
        this.rsaEncrypt(messageToSign).then((encryptedResponse) => {
          this.signedKey = encryptedResponse;
          this.mK = encryptedResponse;
          resolve(encryptedResponse);
        });
      } catch (e) {
        reject(e);
      }
    });
    return promise;
  }

  /**
   * Method to create MP
   * Calculate mP = <mID, mK, mE>
   * @returns string called mP.
   */
  getMP() {
    const mP = `${this.mID};${this.mK};${this.mE}`;
    this.mP = mP;
    return mP;
  }

  checkLocalUniq() {
    const promise = new Promise((resolve, reject) => {
      // Check for local temporal uniquness
      const uniqKey = this.dmC;
      const localTemporalUniq = this.csm.localTemporalUniq;
      if (localTemporalUniq && Object.keys(localTemporalUniq).indexOf(uniqKey) > -1) {
        if (localTemporalUniq[uniqKey].fullhash) {
          if (this.fullHash === localTemporalUniq[uniqKey].fullhash) {
            reject('exact-duplicate');
          } else {
            reject('collision');
          }
        }
      } else {
        resolve(true);
      }
    });
    return promise;
  }

  blindMessage() {
    const promise = new Promise((resolve /* , reject */) => {
      // After the message is SIGNED, we need to start the blind signature.
      this.getMP();

      const uPK = this.csm.uPK.publicKeyB64;

      // Messages to be blinded.
      this.m1 = this.mP;
      this.m2 = `${this.mP};${uPK}`;
      this.m3 = `${this.mP};${this.dmC}`; // + ";" + uPK;

      const _bm1 = new BlindSignContext(this.m1, this.logger);
      const _bm2 = new BlindSignContext(this.m2, this.logger);
      const _bm3 = new BlindSignContext(this.m3, this.logger);

      this.r1 = _bm1.getBlindingNonce();
      this.r2 = _bm2.getBlindingNonce();
      this.r3 = _bm3.getBlindingNonce();

      const e = this.csm.dsPK.e;
      const n = this.csm.dsPK.n;

      // Get Unblinder - to unblind the message
      this.u1 = _bm1.getUnBlinder(n);
      this.u2 = _bm2.getUnBlinder(n);
      this.u3 = _bm3.getUnBlinder(n);

      // Blind the message
      _bm1.blindMessage(e, n)
        .then((bm1) => {
          this.bm1 = bm1;
          return _bm2.blindMessage(e, n);
        })
        .then((bm2) => {
          this.bm2 = bm2;
          return _bm3.blindMessage(e, n);
        })
        .then((bm3) => {
          this.bm3 = bm3;
          resolve(this);
        });
    });
    return promise;
  }

  userSign() {
    const promise = new Promise((resolve /* , reject */) => {
      const uPK = this.csm.uPK.publicKeyB64;
      const payloadMsg = `${uPK};${this.bm1};${this.bm2};${this.bm3}`;
      const _uPK = new UserPK(this.csm, this.logger);
      return _uPK.sign(payloadMsg).then((signedData) => {
        this.signedData = signedData;
        resolve(this);
      });
    });
    return promise;
  }

  sendBlindPayload() {
    const promise = new Promise((resolve, reject) => {
      const payload = createPayloadBlindSignature(
        this.csm.uPK.publicKeyB64,
        this.bm1,
        this.bm2,
        this.bm3,
        this.signedData
      );
      return _http(this.csm.BLIND_SIGNER)
        .post(JSON.stringify(payload))
        .then((response) => {
          this.bsResponse = JSON.parse(response);
          resolve(this);
        }).catch(reject);
    });
    return promise;
  }

  unBlindMessage() {
    const promise = new Promise((resolve /* , reject */) => {
      const res = this.bsResponse;
      // Capture the response
      const bs1 = res.bs1;
      const bs2 = res.bs2;
      const bs3 = res.bs3;
      const suPK = res.suPK;

      // Unblind the message to get the signature.
      const n = this.csm.dsPK.n;
      this.us1 = unBlindMessage(bs1, this.u1, n);
      this.us2 = unBlindMessage(bs2, this.u2, n);
      this.us3 = unBlindMessage(bs3, this.u3, n);
      this.suPK = suPK;
      resolve(this);
    });
    return promise;
  }

  signUnblindedMessage() {
    const promise = new Promise((resolve /* , reject */) => {
      const payload = `${this.csm.uPK.publicKeyB64};${this.mP};${this.dmC};${this.us1};${this.us2};${this.us3}`;
      const _uPK = new UserPK(this.csm, this.logger);
      _uPK.sign(payload).then((signedMessageProxy) => {
        this.signedMessageProxy = signedMessageProxy;
        resolve(this);
      });
    });
    return promise;
  }

  sendMessageProxy() {
    const promise = new Promise((resolve, reject) => {
      const payload = createPayloadProxy(this.csm.uPK.publicKeyB64,
        this.suPK,
        this.mP,
        this.dmC,
        this.us1,
        this.us2,
        this.us3,
        this.signedMessageProxy
      );
      return _http(this.proxyCoordinator)
        .post(JSON.stringify(payload))
        .then(() => resolve(this))
        .catch((err) => {
          reject(err);
        });
    });
    return promise;
  }

  saveLocalCheckTable() {
    const promise = new Promise((resolve /* , reject */) => {
      // Save the hash in temporal unique queue.
      const tt = new Date().getTime();
      const localTemporalUniq = this.csm.localTemporalUniq;
      localTemporalUniq[this.dmC] = { ts: tt, fullhash: this.fullHash };
      resolve(this);
    });
    return promise;
  }
  query(queryProxyUrl) {
    return this.aesEncrypt()
      .then(() => this.signKey())
      .then(() => {
        const data = { mP: this.getMP() };
        return _http(queryProxyUrl).post(JSON.stringify(data), 'instant');
      })
      .then(res =>
        // Got response, let's decrypt it.
        this.aesDecrypt(JSON.parse(res).data)
      )
      .catch((err) => {
        this.log('query failed:', queryProxyUrl, ', reason:', err);
        return Promise.reject(err);
      });
  }

  encryptedTelemetry() {
    const promise = new Promise((resolve, reject) => {
      try {
        this.getproxyCoordinator()
          .then(() => this.checkLocalUniq())
          .then(() => this.aesEncrypt('telemetry'))
          .then(() => this.signKey())
          .then(() => this.blindMessage())
          .then(() => this.userSign())
          .then(() => this.sendBlindPayload())
          .then(() => this.unBlindMessage())
          .then(() => this.signUnblindedMessage())
          .then(() => this.sendMessageProxy())
          .then(() => this.saveLocalCheckTable())
          .then(() => resolve(true))
          .catch((err) => {
            this.log(err);
            reject(err);
          });
      } catch (err) {
        this.log(`Error creating mc: ${err}`);
        reject(err);
      }
    });
    return promise;
  }
}
