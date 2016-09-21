const encoding_table = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const decoding_table = [,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,62,,,,63,52,53,54,55,56,
           57,58,59,60,61,,,,,,,,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,
           19,20,21,22,23,24,25,,,,,,,26,27,28,29,30,31,32,33,34,35,36,37,38,39,
           40,41,42,43,44,45,46,47,48,49,50,51];
const encoding_table_hex = '0123456789abcdef';
const decoding_table_hex = [,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,0,1,2,3,4,5,6,7,8,9,
                          ,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,10,11,12,13,14,15];
var mod_table = [0, 2, 1];

// Returns base64 encoded string, expects Uint8Array
export function base64_encode(data) {
    if (!data.buffer) {
        data = new Uint8Array(data);
    }
    var input_length = data.byteLength;
    var output_length = 4 * (Math.floor((input_length + 2) / 3));

    var encoded_data = new Array(output_length);

    for (let i = 0, j = 0; i < input_length;) {
        var octet_a = i < input_length ? data[i++] : 0;
        var octet_b = i < input_length ? data[i++] : 0;
        var octet_c = i < input_length ? data[i++] : 0;

        var triple = (octet_a << 0x10) + (octet_b << 0x08) + octet_c;

        encoded_data[j++] = encoding_table[(triple >> 3 * 6) & 0x3F];
        encoded_data[j++] = encoding_table[(triple >> 2 * 6) & 0x3F];
        encoded_data[j++] = encoding_table[(triple >> 1 * 6) & 0x3F];
        encoded_data[j++] = encoding_table[(triple >> 0 * 6) & 0x3F];
    }

    for (let i = 0; i < mod_table[input_length % 3]; i++) {
        encoded_data[output_length - 1 - i] = '=';
    }

    return encoded_data.join('');
};

//Returns Uint8Array, expects base64 encoded string
export function base64_decode(data) {
    var input_length = data.length;
    if (input_length % 4 !== 0) {
        return;
    }

    var output_length = Math.floor(input_length / 4) * 3;
    if (data[input_length - 1] === '=') {
        output_length--;
    }
    if (data[input_length - 2] === '=') {
        output_length--;
    }

    var decoded_data = new Uint8Array(output_length);
    for (var i = 0, j = 0; i < input_length;) {
        var sextet_a = data[i] === '=' ? 0 & i++ : decoding_table[data[i++].charCodeAt()]; // TODO: check accesses are correct
        var sextet_b = data[i] === '=' ? 0 & i++ : decoding_table[data[i++].charCodeAt()];
        var sextet_c = data[i] === '=' ? 0 & i++ : decoding_table[data[i++].charCodeAt()];
        var sextet_d = data[i] === '=' ? 0 & i++ : decoding_table[data[i++].charCodeAt()];

        var triple = (sextet_a << 3 * 6) + (sextet_b << 2 * 6) + (sextet_c << 1 * 6) + (sextet_d << 0 * 6);
        if (j < output_length) {
            decoded_data[j++] = (triple >> 2 * 8) & 0xFF;
        }
        if (j < output_length) {
            decoded_data[j++] = (triple >> 1 * 8) & 0xFF;
        }
        if (j < output_length) {
            decoded_data[j++] = (triple >> 0 * 8) & 0xFF;
        }
    }
    return decoded_data;
};

export function hex_encode(data) {
    if (!data.buffer) {
        data = new Uint8Array(data);
    }
    var input_length = data.byteLength;
    var output_length = 2*input_length;
    var encoded_data = new Array(output_length);
    for (var i = 0; i < input_length; ++i) {
        encoded_data[2*i] = encoding_table_hex[data[i]>>4];
        encoded_data[2*i + 1] = encoding_table_hex[data[i]&0x0F];
    }
    return encoded_data.join('');
};

export function hex_decode(data) {
    data = data.toLowerCase();
    var output_length = data.length/2;
    var decoded_data = new Uint8Array(output_length);
    for (var i = 0; i < output_length; i++) {
        decoded_data[i] = (decoding_table_hex[data[2*i].charCodeAt()] << 4) | (decoding_table_hex[data[2*i + 1].charCodeAt()]);
    }
    return decoded_data;
};

export function has(obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
};


function bytesToEncode(len) {
    var sum = len + 1;
    if (len < (1<<7)) {
        sum += 1;
    }
    else if (len < (1<<8)) {
        sum += 2;
    }
    else if (len < (1<<16)) {
        sum += 3;
    }
    else if (len < (1<<24)) {
        sum += 4;
    }
    else if (len < (1<<32)) {
        sum += 5;
    }
    else {
        throw 'value too big ' + len;
    }
    return sum;
}

function pushLength(buffer, len) {
    if (len < (1<<7)) {
        buffer.pushByte(len);
    }
    else if (len < (1<<8)) {
        buffer.pushByte(0x81);
        buffer.pushByte(len);
    }
    else if (len < (1<<16)) {
        buffer.pushByte(0x82);
        buffer.pushByte(len >> 8);
        buffer.pushByte(len&0xFF);
    }
    else if (len < (1<<24)) {
        buffer.pushByte(0x83);
        buffer.pushByte(len >> 16);
        buffer.pushByte((len >> 8)&0xFF);
        buffer.pushByte(len&0xFF);
    }
    else if (len < (1<<32)) {
        buffer.pushByte(0x84);
        buffer.pushByte(len >> 24);
        buffer.pushByte((len >> 16)&0xFF);
        buffer.pushByte((len >> 8)&0xFF);
        buffer.pushByte(len&0xFF);
    }
    else {
        throw 'value too big ' + len;
    }
}

function fromBase64url(data) {
    data = data.replace(/-/g, '+').replace(/_/g, '/');
    var pads = (4 - data.length%4)%4;
    if (pads === 3) {
        throw 'illegal base64 string: ' + data;
    }
    for (var i = 0; i < pads; i++) {
        data += '=';
    }
    return data;
}


function toBase64url(data) {
    data = data.replace(/\+/g, '-').replace(/\//g, '_');
    for (var i = 0; i < 2; ++i) {
        if (data[data.length - 1] === '=') {
            data = data.substring(0, data.length - 1);
        }
    }
    return data;
}

function padIfSigned(array) {
    if (array[0]&0x80) {
        var newArray = new Uint8Array(array.length + 1);
        newArray[0] = 0;
        newArray.set(array, 1);
        return newArray;
    }
    return array;
}

/*RSAPrivateKey ::= SEQUENCE {
  version           0,
  modulus           INTEGER,  -- n
  publicExponent    INTEGER,  -- e
  privateExponent   INTEGER,  -- d
  prime1            INTEGER,  -- p
  prime2            INTEGER,  -- q
  exponent1         INTEGER,  -- d mod (p-1)
  exponent2         INTEGER,  -- d mod (q-1)
  coefficient       INTEGER,  -- (inverse of q) mod p
}*/

/*RSAPublicKey ::= SEQUENCE {
    modulus           INTEGER,  -- n
    publicExponent    INTEGER   -- e
}*/
function exportPrivateKey (key) {
    var orig_values = ['AA==', key.n, key.e, key.d, key.p, key.q, key.dp, key.dq, key.qi];
    var values = orig_values.map(x => padIfSigned(base64_decode(fromBase64url(x))));
    var buffer = new ByteBuffer(2000);

    buffer.pushByte(0x30); //SEQUENCE
    var numBytes = values.reduce((a, x) => a + bytesToEncode(x.length), 0);
    pushLength(buffer, numBytes);

    values.forEach(x => {
        buffer.pushByte(0x02); // INTEGER
        pushLength(buffer, x.length);
        buffer.pushBytes(x);
    });
    return buffer.toBase64();
};
/*RSAPublicKey ::= SEQUENCE {
    modulus           INTEGER,  -- n
    publicExponent    INTEGER   -- e
}*/


// SEQUENCE(2 elem)
    // SEQUENCE(2 elem)
        // OBJECT IDENTIFIER 1.2.840.113549.1.1.1
        // NULL
    // BIT STRING(1 elem)
        // SEQUENCE(2 elem)
            // INTEGER(2048 bit) n
            // INTEGER e
function exportPublicKey (key) {
    var orig_values = [key.n, key.e];
    var values = orig_values.map(x => padIfSigned(base64_decode(fromBase64url(x))));
    var numBytes = values.reduce((a, x) => a + bytesToEncode(x.length), 0);

    var buffer = new ByteBuffer(2000);

    buffer.pushByte(0x30); //SEQUENCE
    pushLength(buffer, bytesToEncode(bytesToEncode(numBytes) + 1) + 15);

    buffer.pushBytes(new Uint8Array([0x30, 0x0D, 0x06, 0x09, 0x2A, 0x86, 0x48, 0x86, 0xF7, 0x0D, 0x01, 0x01, 0x01, 0x05, 0x00]));
    buffer.pushByte(0x03); //BIT STRING
    pushLength(buffer, bytesToEncode(numBytes) + 1);
    buffer.pushByte(0x00);

    buffer.pushByte(0x30); //SEQUENCE
    pushLength(buffer, numBytes);

    values.forEach(x => {
        buffer.pushByte(0x02); // INTEGER
        pushLength(buffer, x.length);
        buffer.pushBytes(x);
    });
    return buffer.toBase64();
};

function exportPublicKeySPKI (key) {
    return exportPublicKey(key);
};

function exportPrivateKeyPKCS8 (key) {
    var orig_values = ['AA==', key.n, key.e, key.d, key.p, key.q, key.dp, key.dq, key.qi];
    var values = orig_values.map(x => padIfSigned(base64_decode(fromBase64url(x))));
    var numBytes = values.reduce((a, x) => a + bytesToEncode(x.length), 0);

    var buffer = new ByteBuffer(2000);

    buffer.pushByte(0x30); //SEQUENCE
    pushLength(buffer, 3 + 15 + bytesToEncode(bytesToEncode(numBytes)));
    buffer.pushBytes(new Uint8Array([0x02, 0x01, 0x00]));
    buffer.pushBytes(new Uint8Array([0x30, 0x0D, 0x06, 0x09, 0x2A, 0x86, 0x48, 0x86, 0xF7, 0x0D, 0x01, 0x01, 0x01, 0x05, 0x00]));
    buffer.pushByte(0x04); //OCTET STRING
    pushLength(buffer, bytesToEncode(numBytes));

    buffer.pushByte(0x30); //SEQUENCE
    pushLength(buffer, numBytes);

    values.forEach(x => {
        buffer.pushByte(0x02); // INTEGER
        pushLength(buffer, x.length);
        buffer.pushBytes(x);
    });
    return buffer.toBase64();
};

function readLength(buffer) {
    var first = buffer.readByte();
    if (first&0x80) {
        var numBytes = first&0x7F;
        var res = 0;
        while (numBytes--) {
            res = (res << 8)|buffer.readByte();
        }
        return res;
    }
    else {
        return first;
    }
}

function readInteger(buffer) {
    var tag = buffer.readByte();
    if (tag !== 0x02) {
        throw 'invalid tag for integer value';
    }
    var len = readLength(buffer);
    var val = buffer.readBytes(len);
    if (val[0] === 0) { // Remove padding?
        val = val.subarray(1);
    }
    return val;
}

function __importKey(buffer, values) {
    var key = {};
    if (buffer.readByte() === 0x30) {
        readLength(buffer);
        for (var i = 0; i < values.length; ++i) {
            var val = readInteger(buffer);
            val = toBase64url(base64_encode(val));
            key[values[i]] = val;
        }
    }
    else {
        throw 'first value not correct';
    }
    if (buffer.pos !== buffer.buffer.length) {
        throw 'not all input data consumed';
    }
    key.alg = 'RS256';
    key.ext = true;
    key.kty = 'RSA';
    return key;
}

function _importKey(data, values) {
    var buffer = new ByteBuffer(0);
    buffer.setData(base64_decode(data));
    return __importKey(buffer, values);
}

function importPublicKey (data){
    var buffer = new ByteBuffer(0);
    buffer.setData(base64_decode(data));
    if (buffer.readByte() === 0x30) {
        readLength(buffer);
        buffer.readBytes(15);
        if (buffer.readByte() !== 0x03) {
            throw 'format not correct';
        }
        readLength(buffer);
        if (buffer.readByte() !== 0x00) {
            throw 'format not correct';
        }
    }
    else {
        throw 'format not correct';
    }
    return __importKey(buffer, ['n', 'e']);
};

function importPrivateKey (data) {
    var res = _importKey(data, ['version', 'n', 'e', 'd', 'p', 'q', 'dp', 'dq', 'qi']);
    delete res.version;
    return res;
};
// Various tools to convert string formats to and from
// byte arrays (that is, Uint8Array), since the Web Crypto
// API likes byte arrays, and web pages like strings.

function ByteBuffer(length) {
    this.buffer = new Uint8Array(length);
    this.pos = 0;
}

ByteBuffer.prototype.setData = function(data) {
    this.buffer = data;
    this.pos = 0;
};

ByteBuffer.prototype.readByte = function() {
    if (this.pos + 1 > this.buffer.length) {
        throw 'Tried to read past the buffer length';
    }
    return this.buffer[this.pos++];
};

ByteBuffer.prototype.readBytes = function(length) {
    if (this.pos + length > this.buffer.length) {
        throw 'Tried to read past the buffer length';
    }
    var res = this.buffer.subarray(this.pos, this.pos + length);
    this.pos += length;
    return res;
};

ByteBuffer.prototype.resetPointer = function() {
    this.pos = 0;
};

ByteBuffer.prototype.pushByte = function(byte) {
    if (this.pos + 1 > this.buffer.length) {
        var newBuffer = new Uint8Array(this.buffer.length*2);
        newBuffer.set(this.buffer);
        this.buffer = newBuffer;
    }
    this.buffer[this.pos++] = byte;
};

ByteBuffer.prototype.pushBytes = function(bytes) {
    if (this.pos + bytes.length > this.buffer.length) {
        var newBuffer = new Uint8Array((this.pos + bytes.length)*2);
        newBuffer.set(this.buffer);
        this.buffer = newBuffer;
    }
    this.buffer.set(bytes, this.pos);
    this.pos += bytes.length;
};

ByteBuffer.prototype.toBase64 = function() {
    return base64_encode(this.buffer.subarray(0, this.pos));
};

ByteBuffer.prototype.fromBase64 = function(data) {
    this.pushBytes(base64_decode(data));
};

export function byteArrayToHexString(byteArray) {
    var hexString = '';
    var nextHexByte;
    for (var i=0; i<byteArray.byteLength; i++) {
        nextHexByte = byteArray[i].toString(16);    // Integer to base 16
        if (nextHexByte.length < 2) {
            nextHexByte = "0" + nextHexByte;        // Otherwise 10 becomes just a instead of 0a
        }
        hexString += nextHexByte;
    }
    return hexString;
}

export function hexStringToByteArray(hexString) {
    if (hexString.length % 2 !== 0) {
        throw "Must have an even number of hex digits to convert to bytes";
    }
    var numBytes = hexString.length / 2;
    var byteArray = new Uint8Array(numBytes);
    for (var i=0; i<numBytes; i++) {
        byteArray[i] = parseInt(hexString.substr(i*2, 2), 16);
    }
    return byteArray;
}

function byteArrayToBase64(byteArray){
    var binaryString = "";
    for (var i=0; i<byteArray.byteLength; i++){
        binaryString += String.fromCharCode(byteArray[i]);
    }
    var base64String = btoa(binaryString);
    return base64String;
}

export function base64ToByteArray(base64String){
    var binaryString = atob(base64String);
    var byteArray = new Uint8Array(binaryString.length);
    for (var i=0; i<binaryString.length; i++){
        byteArray[i] += binaryString.charCodeAt(i);
    }
    return byteArray;
}

function byteArrayToString(byteArray){
    if(TextDecoder){
        var decoder = new TextDecoder;
        return decoder.decode(byteArray);
    }

    // Otherwise, fall back to 7-bit ASCII only
    var result = "";
    for (var i=0; i<byteArray.byteLength; i++){
        result += String.fromCharCode(byteArray[i])
    }
    return result;
}

export function stringToByteArray(s){
    if(TextEncoder){
       var encoder = new TextEncoder;
       return encoder.encode(s);
    }

    // Otherwise, fall back to 7-bit ASCII only
    var result = new Uint8Array(s.length);
    for (var i=0; i<s.length; i++){
        result[i] = s.charCodeAt(i);
    }
    return result;
}


function readLength(buffer) {
    var first = buffer.readByte();
    if (first&0x80) {
        var numBytes = first&0x7F;
        var res = 0;
        while (numBytes--) {
            res = (res << 8)|buffer.readByte();
        }
        return res;
    }
    else {
        return first;
    }
}
function readInteger(buffer) {
    var tag = buffer.readByte();
    if (tag !== 0x02) {
        throw 'invalid tag for integer value';
    }
    var len = readLength(buffer);
    var val = buffer.readBytes(len);
    if (val[0] === 0) { // Remove padding?
        val = val.subarray(1);
    }
    return val;
}
function __importKey(buffer, values) {
    var key = {};
    if (buffer.readByte() === 0x30) {
        readLength(buffer);
        for (var i = 0; i < values.length; ++i) {
            var val = readInteger(buffer);
            val = toBase64url(base64_encode(val));
            key[values[i]] = val;
        }
    }
    else {
        throw 'first value not correct';
    }
    if (buffer.pos !== buffer.buffer.length) {
        throw 'not all input data consumed';
    }
    key.alg = 'RS256';
    key.ext = true;
    key.kty = 'RSA';
    return key;
}
function _importKey(data, values) {
    var buffer = new ByteBuffer(0);
    buffer.setData(base64_decode(data));
    return __importKey(buffer, values);
}
function importPublicKey(data) {
    var buffer = new ByteBuffer(0);
    buffer.setData(base64_decode(data));
    if (buffer.readByte() === 0x30) {
        readLength(buffer);
        buffer.readBytes(15);
        if (buffer.readByte() !== 0x03) {
            throw 'format not correct';
        }
        readLength(buffer);
        if (buffer.readByte() !== 0x00) {
            throw 'format not correct';
        }
    }
    else {
        throw 'format not correct';
    }
    return __importKey(buffer, ['n', 'e']);
}

function importPrivateKey(data) {
    var res = _importKey(data, ['version', 'n', 'e', 'd', 'p', 'q', 'dp', 'dq', 'qi']);
    delete res.version;
    return res;
}


function strToUTF8Arr (sDOMStr) {
    sDOMStr = sDOMStr||'';
    var aBytes, nChr, nStrLen = sDOMStr.length, nArrLen = 0;

    /* mapeando... */

    for (var nMapIdx = 0; nMapIdx < nStrLen; nMapIdx++) {
        nChr = sDOMStr.charCodeAt(nMapIdx);
        nArrLen += nChr < 0x80 ? 1 : nChr < 0x800 ? 2 : nChr < 0x10000 ? 3 : nChr < 0x200000 ? 4 : nChr < 0x4000000 ? 5 : 6;
    }

    aBytes = new Uint8Array(nArrLen);

    /* transcripción... */

    for (var nIdx = 0, nChrIdx = 0; nIdx < nArrLen; nChrIdx++) {
        nChr = sDOMStr.charCodeAt(nChrIdx);
        if (nChr < 128) {
            /* un byte */
            aBytes[nIdx++] = nChr;
        } else if (nChr < 0x800) {
            /* dos bytes */
            aBytes[nIdx++] = 192 + (nChr >>> 6);
            aBytes[nIdx++] = 128 + (nChr & 63);
        } else if (nChr < 0x10000) {
            /* tres bytes */
            aBytes[nIdx++] = 224 + (nChr >>> 12);
            aBytes[nIdx++] = 128 + (nChr >>> 6 & 63);
            aBytes[nIdx++] = 128 + (nChr & 63);
        } else if (nChr < 0x200000) {
            /* cuatro bytes */
            aBytes[nIdx++] = 240 + (nChr >>> 18);
            aBytes[nIdx++] = 128 + (nChr >>> 12 & 63);
            aBytes[nIdx++] = 128 + (nChr >>> 6 & 63);
            aBytes[nIdx++] = 128 + (nChr & 63);
        } else if (nChr < 0x4000000) {
            /* cinco bytes */
            aBytes[nIdx++] = 248 + (nChr >>> 24);
            aBytes[nIdx++] = 128 + (nChr >>> 18 & 63);
            aBytes[nIdx++] = 128 + (nChr >>> 12 & 63);
            aBytes[nIdx++] = 128 + (nChr >>> 6 & 63);
            aBytes[nIdx++] = 128 + (nChr & 63);
        } else /* if (nChr <= 0x7fffffff) */ {
            /* seis bytes */
            aBytes[nIdx++] = 252 + (nChr >>> 30);
            aBytes[nIdx++] = 128 + (nChr >>> 24 & 63);
            aBytes[nIdx++] = 128 + (nChr >>> 18 & 63);
            aBytes[nIdx++] = 128 + (nChr >>> 12 & 63);
            aBytes[nIdx++] = 128 + (nChr >>> 6 & 63);
            aBytes[nIdx++] = 128 + (nChr & 63);
        }
    }
    return aBytes;
}

export function binaryToHex(s) {
    var i, k, part, accum, ret = '';
    for (i = s.length-1; i >= 3; i -= 4) {
        // extract out in substrings of 4 and convert to hex
        part = s.substr(i+1-4, 4);
        accum = 0;
        for (k = 0; k < 4; k += 1) {
            if (part[k] !== '0' && part[k] !== '1') {
                // invalid character
                return { valid: false };
            }
            // compute the length 4 substring
            accum = accum * 2 + parseInt(part[k], 10);
        }
        if (accum >= 10) {
            // 'A' to 'F'
            ret = String.fromCharCode(accum - 10 + 'A'.charCodeAt(0)) + ret;
        } else {
            // '0' to '9'
            ret = String(accum) + ret;
        }
    }
    // remaining characters, i = 0, 1, or 2
    if (i >= 0) {
        accum = 0;
        // convert from front
        for (k = 0; k <= i; k += 1) {
            if (s[k] !== '0' && s[k] !== '1') {
                return { valid: false };
            }
            accum = accum * 2 + parseInt(s[k], 10);
        }
        // 3 bits, value cannot exceed 2^3 - 1 = 7, just convert
        ret = String(accum) + ret;
    }
    return { valid: true, result: ret };
}

export function hexToBinary(s) {
    var i, k, part, ret = '';
    // lookup table for easier conversion. '0' characters are padded for '1' to '7'
    var lookupTable = {
        '0': '0000', '1': '0001', '2': '0010', '3': '0011', '4': '0100',
        '5': '0101', '6': '0110', '7': '0111', '8': '1000', '9': '1001',
        'a': '1010', 'b': '1011', 'c': '1100', 'd': '1101',
        'e': '1110', 'f': '1111',
        'A': '1010', 'B': '1011', 'C': '1100', 'D': '1101',
        'E': '1110', 'F': '1111'
    };
    for (i = 0; i < s.length; i += 1) {
        if (lookupTable.hasOwnProperty(s[i])) {
            ret += lookupTable[s[i]];
        } else {
            return { valid: false };
        }
    }
    return { valid: true, result: ret };
}

export function privateKeytoKeypair(privateKey) {
    var key = importPrivateKey(privateKey);
    return [exportPublicKeySPKI(key), exportPrivateKeyPKCS8(key)];
};