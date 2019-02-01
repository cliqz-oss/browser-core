import config from '../core/config';
import { fetch, Headers, Response } from '../core/http';
import random, { randomInt } from '../core/crypto/random';
import logger from './logger';
import { TransportError, ServerError } from './errors';
import { VERSION, ECDH_P256_AES_128_GCM } from './constants';
import { inflate } from '../core/zlib';
import { fromUTF8, toUTF8, toByteArray, toBase64, fromBase64 } from '../core/encoding';
import crypto from '../platform/crypto';

const { subtle } = crypto;

async function generateECDH() {
  return subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey']
  );
}

async function deriveKey(serverPublicKey, clientPrivateKey) {
  return subtle.deriveKey(
    { name: 'ECDH', namedCurve: 'P-256', public: serverPublicKey },
    clientPrivateKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

async function exportKey(key) {
  return new Uint8Array(await subtle.exportKey('raw', key));
}

async function sha256(data) {
  return new Uint8Array(await subtle.digest({ name: 'SHA-256' }, data));
}

async function importAesKey(data) {
  return subtle.importKey(
    'raw',
    data,
    { name: 'AES-GCM', length: 128 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptAES(iv, key, data) {
  return new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, data));
}

async function decryptAES(iv, key, data) {
  return new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, data));
}

async function encrypt(data, serverPublicKey) {
  const { publicKey: clientPublicKey, privateKey } = await generateECDH();
  const derivedKey = await deriveKey(serverPublicKey, privateKey);
  const rawDerived = await exportKey(derivedKey);
  const encryptionKey = (await sha256(rawDerived)).subarray(0, 16);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aesKey = await importAesKey(encryptionKey);
  const encrypted = await encryptAES(iv, aesKey, data);
  return { iv, encrypted, clientPublicKey: await exportKey(clientPublicKey), aesKey };
}

async function myfetch(url, { session, method = 'GET', body, publicKey = {} } = {}) {
  // We randomize first subdomain to avoid browser reusing connections,
  // which would defeat our purpose of making messages unlinkable.

  // If session is passed, same subdomain is used (e.g. for proxying search queries).

  // If url doesn't have asterisk, nothing will be replaced (used for non-anonymous
  // requests, like group joins).

  const urlfinal = url.replace('*', `${session || randomInt()}`);

  const headers = new Headers({ Version: VERSION.toString() });
  const options = { method, headers, credentials: 'omit', cache: 'no-store', redirect: 'manual' };

  if (body instanceof ArrayBuffer || ArrayBuffer.isView(body)) {
    options.headers.append('Content-Type', 'application/octet-stream');
    options.body = toByteArray(body);
  } else if (body && typeof body === 'object') {
    options.headers.append('Content-Type', 'application/json');
    options.body = toUTF8(JSON.stringify(body));
  }

  let aesKey;
  const { key, date } = publicKey;
  if (key && options.body) {
    const out = await encrypt(options.body, key);
    const { iv, encrypted, clientPublicKey } = out;
    aesKey = out.aesKey;
    options.headers.append('Key-Date', date);
    options.body = encrypted;
    const encryption = new Uint8Array(1 + 65 + 12);
    encryption.set(clientPublicKey, 1);
    encryption.set(iv, 1 + 65);
    encryption[0] = ECDH_P256_AES_128_GCM;
    options.headers.append('Encryption', toBase64(encryption));
  }

  return new Promise(async (resolve, reject) => {
    const timer = setTimeout(() => reject(new TransportError('timeout')), 5000);
    try {
      let response = await fetch(urlfinal, options);
      const { status, statusText, ok } = response;

      if (!ok) {
        throw new ServerError(statusText);
      }

      if (aesKey && response.headers.get('Encryption-IV')) {
        const encrypted = new Uint8Array(await response.arrayBuffer());
        const iv = fromBase64(response.headers.get('Encryption-IV'));
        const decrypted = await decryptAES(iv, aesKey, encrypted);
        response = new Response(decrypted, { status, statusText });
      }
      resolve(response);
    } catch (e) {
      reject(e);
    } finally {
      clearTimeout(timer);
    }
  });
}

// Just to have all the endpoints in the same place.
// Also handles possible clock drift of the user, syncing with time returned
// by our endpoints or 3rd party popular sites.

// At some point, we should do the transport in the most private way available
// for the platform, but for now just doing direct requests.
export default class Endpoints {
  static get MAX_MINUTES_DRIFT() {
    return 3;
  }

  constructor({ maxRetries = 3, urls = config.settings } = {}) {
    this._reset();
    this.maxRetries = maxRetries;
    this.urls = urls;
  }

  _reset() {
    this.messages = [];
    this.sendTimer = null;
    this.unloaded = false;
  }

  get ENDPOINT_HPNV2_ANONYMOUS() {
    return this.urls.ENDPOINT_HPNV2_ANONYMOUS;
  }

  get ENDPOINT_HPNV2_DIRECT() {
    return this.urls.ENDPOINT_HPNV2_DIRECT;
  }

  get ENDPOINT_HPNV2_JOIN() {
    return `${this.ENDPOINT_HPNV2_DIRECT}/join`;
  }

  get ENDPOINT_HPNV2_POST() {
    return this.ENDPOINT_HPNV2_ANONYMOUS;
  }

  get ENDPOINT_HPNV2_CONFIG() {
    return `${this.ENDPOINT_HPNV2_DIRECT}/config`;
  }

  _scheduleSend() {
    if (this.unloaded || this.sendTimer !== null) {
      return;
    }
    this.sendTimer = setTimeout(() => {
      const n = Math.floor(random() * this.messages.length);
      const [msg, cnt, publicKey] = this.messages.splice(n, 1)[0];
      myfetch(this.ENDPOINT_HPNV2_POST, { method: 'POST', body: msg, publicKey })
        .catch((e) => {
          if (cnt < this.maxRetries) {
            logger.log('Will retry sending msg after error', e);
            this.messages.push([msg, cnt + 1, publicKey]);
          } else {
            logger.error('_scheduleSend failed (gave up after', this.maxRetries,
              'retry attempts)', e);
          }
        })
        .then(() => {
          this.sendTimer = null;
          if (this.messages.length > 0) {
            this._scheduleSend();
          }
        });
    }, 500 + Math.floor(random() * 1500)); // TODO: improve?
  }

  async send(msg, { instant, session, publicKey } = {}) {
    if (instant) {
      try {
        const response = await myfetch(this.ENDPOINT_HPNV2_POST, { session, method: 'POST', body: msg, publicKey });
        let data = new Uint8Array(await response.arrayBuffer());
        if (data[0] !== 0x7B) {
          const size = (new DataView(data.buffer)).getUint32();
          data = inflate(data.subarray(4, 4 + size));
        }
        const { status, body } = JSON.parse(fromUTF8(data));
        return new Response(body, { status });
      } catch (e) {
        if (e instanceof ServerError) {
          throw e;
        }
        throw new TransportError(e.message);
      }
    }
    this.messages.push([msg, 0, publicKey]);
    this._scheduleSend();
    return new Response();
  }

  async join(body) {
    const response = await myfetch(this.ENDPOINT_HPNV2_JOIN, { method: 'POST', body });
    return response.json();
  }

  async getConfig() {
    return (await myfetch(this.ENDPOINT_HPNV2_CONFIG)).json();
  }

  unload() {
    clearTimeout(this.sendTimer);
    this._reset();
    this.unloaded = true;
  }
}
