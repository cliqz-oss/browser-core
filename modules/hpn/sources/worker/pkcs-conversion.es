import { base64_decode, base64_encode } from './crypto-utils';

// This is blatant rip-off of conversion function in cliqz-p2p crytpo.
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
export function exportPrivateKey(key) {
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
export function exportPublicKey(key) {
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

function exportPublicKeySPKI(key) {
    return exportPublicKey(key);
};

function exportPrivateKeyPKCS8(key) {
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
};

function importPrivateKey(data) {
    var res = _importKey(data, ['version', 'n', 'e', 'd', 'p', 'q', 'dp', 'dq', 'qi']);
    delete res.version;
    return res;
};

export function privateKeytoKeypair(privateKey) {
    var key = importPrivateKey(privateKey);
    return [exportPublicKeySPKI(key), exportPrivateKeyPKCS8(key)];
};
