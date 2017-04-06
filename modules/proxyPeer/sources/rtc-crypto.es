import console from 'core/console';

// import crypto from 'platform/crypto';
Components.utils.importGlobalProperties(['crypto']);


//UTILS
const encoding_table = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const decoding_table = [,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,62,,,,63,52,53,54,55,56,
           57,58,59,60,61,,,,,,,,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,
           19,20,21,22,23,24,25,,,,,,,26,27,28,29,30,31,32,33,34,35,36,37,38,39,
           40,41,42,43,44,45,46,47,48,49,50,51];
const encoding_table_hex = '0123456789abcdef';
const decoding_table_hex = [,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,0,1,2,3,4,5,6,7,8,9,
                          ,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,10,11,12,13,14,15];
const mod_table = [0, 2, 1];


// Returns base64 encoded string, expects Uint8Array
function base64_encode(data) {
	if (!data.buffer) {
		data = new Uint8Array(data);
	}
	var input_length = data.byteLength;
	var output_length = 4 * (Math.floor((input_length + 2) / 3));

	var encoded_data = new Array(output_length);

	for (var i = 0, j = 0; i < input_length;) {
		var octet_a = i < input_length ? data[i++] : 0;
		var octet_b = i < input_length ? data[i++] : 0;
		var octet_c = i < input_length ? data[i++] : 0;

		var triple = (octet_a << 0x10) + (octet_b << 0x08) + octet_c;

		encoded_data[j++] = encoding_table[(triple >> 3 * 6) & 0x3F];
		encoded_data[j++] = encoding_table[(triple >> 2 * 6) & 0x3F];
		encoded_data[j++] = encoding_table[(triple >> 1 * 6) & 0x3F];
		encoded_data[j++] = encoding_table[(triple >> 0 * 6) & 0x3F];
	}

	for (var i = 0; i < mod_table[input_length % 3]; i++)
		encoded_data[output_length - 1 - i] = '=';

	return encoded_data.join('');
}


//Returns Uint8Array, expects base64 encoded string
function base64_decode(data) {
	var input_length = data.length;
	if (input_length % 4 !== 0) return;

	var output_length = Math.floor(input_length / 4) * 3;
	if (data[input_length - 1] === '=') output_length--;
	if (data[input_length - 2] === '=') output_length--;

	var decoded_data = new Uint8Array(output_length);
	for (var i = 0, j = 0; i < input_length;) {
		var sextet_a = data[i] === '=' ? 0 & i++ : decoding_table[data[i++].charCodeAt()]; // TODO: check accesses are correct
		var sextet_b = data[i] === '=' ? 0 & i++ : decoding_table[data[i++].charCodeAt()];
		var sextet_c = data[i] === '=' ? 0 & i++ : decoding_table[data[i++].charCodeAt()];
		var sextet_d = data[i] === '=' ? 0 & i++ : decoding_table[data[i++].charCodeAt()];

		var triple = (sextet_a << 3 * 6)
			+ (sextet_b << 2 * 6)
			+ (sextet_c << 1 * 6)
			+ (sextet_d << 0 * 6);
		if (j < output_length) decoded_data[j++] = (triple >> 2 * 8) & 0xFF;
		if (j < output_length) decoded_data[j++] = (triple >> 1 * 8) & 0xFF;
		if (j < output_length) decoded_data[j++] = (triple >> 0 * 8) & 0xFF;
	}
	return decoded_data;
}

// Copied from https://developer.mozilla.org/es/docs/Web/API/WindowBase64/Base64_codificando_y_decodificando
function strToUTF8Arr (sDOMStr) {
  var encoder = new TextEncoder("utf-8");
  return encoder.encode(sDOMStr);
}


function UTF8ArrToStr (aBytes) {
  var decoder = new TextDecoder("utf-8");
  return decoder.decode(aBytes);
}


export function fromArrayBuffer(data, format) {
  const newdata = new Uint8Array(data);
  if (format === 'hex') {
    return hex_encode(newdata);
  } else if (format === 'b64') {
    return base64_encode(newdata);
  }
  return newdata;
}


function toArrayBuffer(data, format) {
  if (format === 'hex') {
    return hex_decode(data).buffer;
  } else if (format === 'b64') {
    return base64_decode(data).buffer;
  }
  return data;
}


export function generateAESIv() {
  return crypto.getRandomValues(new Uint8Array(12));
}


export function packAESKeyAndIv(aesKey, iv, pubKey) {
  try {
    return wrapAESKey(aesKey, pubKey).then(wrapped => {
      return JSON.stringify({
        key: wrapped,
        iv: fromArrayBuffer(iv, 'b64'),
      });
    });
  } catch (e) {
    console.debug(`proxyPeer SERVER FAIL TO PACK AES ${e}`);
    return Promise.reject(e);
  }
}


export function unpackAESKeyAndIv(packed, privKey) {
  try {
    const { key, iv } = JSON.parse(packed);
    return unwrapAESKey(key, privKey).then(aesKey => ({
      key: aesKey,
      iv: new Uint8Array(toArrayBuffer(iv, 'b64')),
    }));
  } catch (e) {
    console.debug(`proxyPeer SERVER FAIL TO UNPACK AES ${e} ${packed}`);
    return Promise.reject(e);
  }
}


export function generateAESKey() {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}


function importAESKey(key) {
  return crypto.subtle.importKey('raw', toArrayBuffer(key, 'hex'),
    { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}


export function encryptAES(data, key, iv) {
  return Promise.all([
    iv || crypto.getRandomValues(new Uint8Array(12)),
    typeof key === 'string' ? importAESKey(key) : key,
  ]).then(([_iv, _key]) =>
       crypto.subtle.encrypt({ name: 'AES-GCM', iv: _iv }, _key, data)
       .then(encrypted =>
          [fromArrayBuffer(_iv, 'b64'), fromArrayBuffer(encrypted, 'b64')]
       )
     );
}


export function decryptAES(encrypted, key) {
  let iv = encrypted[0];
  let encryptedMsg = encrypted[1];
  iv = new Uint8Array(toArrayBuffer(iv, 'b64'));
  encryptedMsg = toArrayBuffer(encryptedMsg, 'b64');
  return Promise.resolve()
    .then(() => (typeof key === 'string' ? importAESKey(key) : key))
    .then(importedKey => crypto.subtle.decrypt({ name: 'AES-GCM', iv }, importedKey, encryptedMsg))
}


function importRSAKey(pk, pub = true) {
  return crypto.subtle.importKey(
    pub ? 'spki' : 'pkcs8',
    base64_decode(pk),
    {
      name: 'RSA-OAEP',
      hash: { name: 'SHA-256' },
    },
    false,
    [pub ? 'wrapKey' : 'unwrapKey']
  );
}


export function encryptRSA(data, pubKey, aesKey) {
  return Promise.all([
    encryptAES(data, aesKey),
    wrapAESKey(aesKey, pubKey),
  ]);
}


export function decryptRSA(data, privKey) {
  const [encrypted, wrappedKey] = data;
  return unwrapAESKey(wrappedKey, privKey)
    .then(aesKey => decryptAES(encrypted, aesKey));
}


function wrapAESKey(aesKey, publicKey) {
  return Promise.resolve(
    typeof publicKey === 'string' ? importRSAKey(publicKey, true) : publicKey
  ).then(pk =>
    crypto.subtle.wrapKey('raw', aesKey, pk, { name: 'RSA-OAEP', hash: { name: 'SHA-256' } })
  ).then(wrapped => base64_encode(wrapped));
}


function unwrapAESKey(aesKey, privateKey) {
  return Promise.resolve(
    typeof privateKey === 'string' ? importRSAKey(privateKey, false) : privateKey
  )
    .then(pk =>
      crypto.subtle.unwrapKey(
        'raw',
        base64_decode(aesKey),
        pk,
        {
          name: 'RSA-OAEP',
          modulusLength: 2048,
          publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
          hash: { name: 'SHA-256' },
        },
        {
          name: 'AES-GCM',
          length: 256,
        },
        true,
        ['encrypt', 'decrypt'],
      ),
    );
}
