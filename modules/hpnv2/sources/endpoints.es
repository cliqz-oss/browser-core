import config from '../core/config';
import { fetch, Headers, Response } from '../core/http';
import random, { randomInt } from '../core/crypto/random';
import logger from './logger';
import { TransportError, ServerError, NotReadyError } from './errors';
import { VERSION, ECDH_P256_AES_128_GCM } from './constants';
import { inflate } from '../core/zlib';
import { fromUTF8, toUTF8, toByteArray, toBase64, fromBase64 } from '../core/encoding';
import crypto from '../platform/crypto';
import LRU from '../core/LRU';
import pacemaker from '../core/services/pacemaker';

const MAX_PROXY_BUCKETS = 10;

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

async function myfetch(url, { method = 'GET', body, publicKey = {}, timeoutInMs = 10000 } = {}) {
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
    const timer = pacemaker.setTimeout(() => reject(new TransportError('timeout')), timeoutInMs);
    try {
      let response;
      try {
        response = await fetch(url, options);
      } catch (e) {
        throw new ServerError(e);
      }

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
      pacemaker.clearTimeout(timer);
    }
  });
}

// Just to have all the endpoints in the same place.
export default class Endpoints {
  constructor({ maxRetries = 3, urls = config.settings } = {}) {
    this._reset();
    this.maxRetries = maxRetries;
    this.urls = urls;
    this.proxyBuckets = new LRU(MAX_PROXY_BUCKETS);
  }

  _reset() {
    const oldMessages = this.messages || [];
    this.messages = [];
    this.sendTimer = null;
    this.unloaded = false;

    oldMessages.forEach(x => x.reject(new NotReadyError('Request cancelled because of unload')));
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
    // It is important that we never use the anonymous endpoint here!
    // If /config requests would go through a 3rd party proxy, we would
    // be open to man-in-the-middle attacks.
    //
    // The reason is that it breaks the Diffie-Hellman key exchange,
    // as a malicious proxy could modify the server's public key.
    // The consequence would be that a malicious proxy could trick
    // the client into encrypting with a secret known to the proxy.
    return `${this.ENDPOINT_HPNV2_DIRECT}/config`;
  }

  _scheduleSend() {
    if (this.unloaded || this.sendTimer !== null) {
      return;
    }
    this.sendTimer = pacemaker.setTimeout(() => {
      const n = Math.floor(random() * this.messages.length);
      const { url, msg, cnt, publicKey, resolve, reject } = this.messages.splice(n, 1)[0];
      myfetch(url, { method: 'POST', body: msg, publicKey })
        .then(resolve, (e) => {
          if (cnt < this.maxRetries) {
            logger.log('Will retry sending msg after error', e);
            this.messages.push({ url, msg, cnt: cnt + 1, publicKey, resolve, reject });
          } else {
            logger.warn('_scheduleSend failed (gave up after', this.maxRetries,
              'retry attempts)', e);
            reject(e);
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

  // When defined, proxyBucket is random string or number, "big enough" to avoid collisions
  // Same proxyBucket will be routed via same proxy (e.g. for search queries)
  async send(msg, { instant, proxyBucket, publicKey } = {}) {
    const MIN_PROXY_NUM = 1;
    const MAX_PROXY_NUM = 100;
    const NUM_PROXIES = MAX_PROXY_NUM - MIN_PROXY_NUM + 1;
    const randBucket = (randomInt() % NUM_PROXIES) + MIN_PROXY_NUM;
    const proxyNum = this.proxyBuckets.get(proxyBucket) || randBucket;
    if (proxyBucket) {
      this.proxyBuckets.set(proxyBucket, proxyNum);
    }
    const url = this.ENDPOINT_HPNV2_POST.replace('*', proxyNum);

    if (instant) {
      try {
        const response = await myfetch(url, { method: 'POST', body: msg, publicKey });
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

    // non-instance message
    const pendingSend = new Promise((resolve, reject) => {
      this.messages.push({ url, msg, cnt: 0, publicKey, resolve, reject });
    });
    this._scheduleSend();

    // The server response is not too interesting, as it will always confirm
    // with an empty response. Still, waiting for the response is useful
    // to make sure that the server got the message, also we only will
    // know for sure that the network request was successful.
    await pendingSend;
    return new Response();
  }

  async join(body) {
    const response = await myfetch(this.ENDPOINT_HPNV2_JOIN, { method: 'POST', body });
    return response.json();
  }

  async getConfig({ timeoutInMs = 15000 } = {}) {
    return (await myfetch(this.ENDPOINT_HPNV2_CONFIG, { timeoutInMs })).json();
  }

  unload() {
    pacemaker.clearTimeout(this.sendTimer);
    this._reset();
    this.proxyBuckets.reset();
    this.unloaded = true;
  }
}
