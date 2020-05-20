/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { encodeWithPadding } from './padding';
import { fromBase64, toBase64, fromUTF8, toUTF8 } from '../core/encoding';
import { randomInt } from '../core/crypto/random';
import { inflate } from '../core/zlib';
import { ProtocolError } from './errors';

const HPNV2_PROTOCOL_VERSION = 1;
const HPNV2_ECDH_P256_AES_128_GCM = 0xEA;

async function exportKey(key) {
  return new Uint8Array(await crypto.subtle.exportKey('raw', key));
}

async function sha256(data) {
  return new Uint8Array(await crypto.subtle.digest({ name: 'SHA-256' }, data));
}

/**
 * Responsible for sending Human Web message to the servers.
 * Ideally in a way that is as anonymous as possible, although
 * the choices are limited on Mobile.
 *
 * Note: We can start with https. There is no fundamental
 * reason why hpnv2 could not be used on Mobile as well,
 * but it is a project on its own to port it.
 */
export default class ProxiedHttp {
  constructor(config, serverPublicKeyAccessor) {
    this.viaProxyEndpointTemplate = config.HUMAN_WEB_LITE_COLLECTOR_VIA_PROXY;
    this.serverPublicKeyAccessor = serverPublicKeyAccessor;
  }

  // TODO: The interface might changes. For Human Web, fire-and-forget
  // messages to the same endpoint are enough. Should we need to use the
  // anonymization layer (sending through proxy) for other purposes,
  // the response should be decrypted and returned.
  async send({ body }) {
    const {
      ciphertext,
      iv,
      secret,
      clientPublicKey,
      serverPublicKeyDate,
    } = await this.encrypt(body);

    // layout:
    // * algorithm type (1 byte)
    // * client ECDH public key (65 bytes; the size of the key after export)
    // * initialization vector (12 byte)
    const encryptionHeader = new Uint8Array(1 + 65 + 12);
    encryptionHeader[0] = HPNV2_ECDH_P256_AES_128_GCM;
    encryptionHeader.set(clientPublicKey, 1);
    encryptionHeader.set(iv, 1 + 65);

    const headers = {
      'Content-Type': 'application/octet-stream',
      Version: HPNV2_PROTOCOL_VERSION.toString(),
      Encryption: toBase64(encryptionHeader),
      'Key-Date': serverPublicKeyDate,
    };

    const response = await fetch(this._chooseRandomProxyUrl(), {
      method: 'POST',
      headers,
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'manual',
      body: ciphertext,
    });
    if (!response.ok) {
      throw new Error(`Failed to send data (${response.statusText})`);
    }
    let data = new Uint8Array(await response.arrayBuffer());

    const serverIV = response.headers.get('Encryption-IV');
    if (serverIV) {
      const decrypted = await crypto.subtle.decrypt({
        name: 'AES-GCM',
        iv: fromBase64(serverIV),
        tagLength: 128
      }, secret, data);
      data = new Uint8Array(decrypted);
    }

    // Depending on the message type, we need to decompress the data.
    // In the HPN protocol, the type is implicitely defined:
    // * if the data starts with 0x7B (=== '{'), it can be directly consume
    //   (e.g. fire-and-forget messages will always return '{}')
    // * otherwise, decompress it
    //   (format: "<size: 4-byte unsigned int>:<data: "size" bytes>")
    if (data[0] !== 0x7B) {
      const size = (new DataView(data.buffer)).getUint32();
      if (4 + size > data.length) {
        throw new ProtocolError('Overflow in data received from the server');
      }
      data = inflate(data.subarray(4, 4 + size));
    }
    const { status, body: body_ } = JSON.parse(fromUTF8(data));
    return new Response(body_, { status });
  }

  _chooseRandomProxyUrl() {
    const MIN_PROXY_NUM = 1;
    const MAX_PROXY_NUM = 100;
    const NUM_PROXIES = MAX_PROXY_NUM - MIN_PROXY_NUM + 1;
    const proxyNum = (randomInt() % NUM_PROXIES) + MIN_PROXY_NUM;
    return this.viaProxyEndpointTemplate.replace('*', proxyNum);
  }

  async generateClientECDHKey() {
    const { publicKey, privateKey } = await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveKey']
    );
    return {
      publicKey: await exportKey(publicKey),
      privateKey,
    };
  }

  async negotiateSecret() {
    // Setup:
    // 1) get the server's public key for today
    // 2) compute a new public/private key pair
    const [serverKey, clientKeys] = await Promise.all([
      this.serverPublicKeyAccessor.getKey(),
      this.generateClientECDHKey(),
    ]);
    const { publicKey: serverPublicKey, date: serverPublicKeyDate } = serverKey;
    const { publicKey: clientPublicKey, privateKey: clientPrivateKey } = clientKeys;

    // Perform ECDH to get a curve point (on P-256, which is assumed
    // have an effective security strength of at least 128 bits).
    // To derive the symmetric key for AES-128-GCM, first hash with
    // SHA-256, then take 16 bytes resulting in the desired 128 bit key.
    const derivedKey = await crypto.subtle.deriveKey(
      { name: 'ECDH', namedCurve: 'P-256', public: serverPublicKey },
      clientPrivateKey,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    const rawDerived = await exportKey(derivedKey);
    const raw128bitKey = (await sha256(rawDerived)).subarray(0, 16);
    const secret = await crypto.subtle.importKey(
      'raw',
      raw128bitKey,
      { name: 'AES-GCM', length: 128 },
      false,
      ['encrypt', 'decrypt']
    );
    return { secret, clientPublicKey, serverPublicKeyDate };
  }

  /**
   * When sending through proxies, we have to create a secure channel.
   * Like hpnv2, we use an Integrated Encryption Scheme (IES). First, exchange
   * a symmentric key (through ECDH). Then derive a AES key and encrypt
   * the data with AES-128-GCM.
   *
   * In addition, we should take counter-measures against traffic analysis.
   * To achieve that, payloads are padded to the next power-of-2 bucket size
   * (with a minimum size of 1K).
   */
  async encrypt(plaintext) {
    const { secret, clientPublicKey, serverPublicKeyDate } = await this.negotiateSecret();
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // note: we are assuming JSON messages, here
    const unpaddedPlaintext = toUTF8(typeof plaintext === 'string' ? plaintext : JSON.stringify(plaintext));
    const data = encodeWithPadding(unpaddedPlaintext);
    const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, tagLength: 128 }, secret, data));

    return { ciphertext, iv, secret, clientPublicKey, serverPublicKeyDate };
  }
}
