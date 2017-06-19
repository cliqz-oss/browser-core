//UTILS
var encoding_table = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
var decoding_table = [,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,62,,,,63,52,53,54,55,56,
           57,58,59,60,61,,,,,,,,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,
           19,20,21,22,23,24,25,,,,,,,26,27,28,29,30,31,32,33,34,35,36,37,38,39,
           40,41,42,43,44,45,46,47,48,49,50,51];
var encoding_table_hex = '0123456789abcdef';
var decoding_table_hex = [,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,0,1,2,3,4,5,6,7,8,9,
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
export function base64_decode(data) {
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
export function stringToByteArray(s){
    if (typeof(TextEncoder) != 'undefined'){
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
export function byteArrayToString(byteArray){
    if(typeof(TextEncoder) != 'undefined'){
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
/* This method will ensure that we have the same length for all the mesages
*/
export function padMessage(msg){
	const mxLen = 14000;
	var padLen = (mxLen - msg.length) + 1;
	if (padLen < 0) {
		throw 'msgtoobig';
	}
	return msg + new Array(padLen).join("\n");
}

export function isJson(str) {
// If can be parsed that means it's a str.
// If cannot be parsed and is an object then it's a JSON.
  try {
      JSON.parse(str);
  } catch (e) {
  	if(typeof str =='object')
      return true;
  }
  return false;
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

export function base64ToByteArray(base64String){
    var binaryString = atob(base64String);
    var byteArray = new Uint8Array(binaryString.length);
    for (var i=0; i<binaryString.length; i++){
        byteArray[i] += binaryString.charCodeAt(i);
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

export function base64UrlDecode(str) {
  str = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  var buffer = new Uint8Array(str.length);
  for(var i = 0; i < str.length; ++i) {
    buffer[i] = str.charCodeAt(i);
  }
  return buffer;
}
export function h2d(s) {

    function add(x, y) {
        var c = 0, r = [];
        var x = x.split('').map(Number);
        var y = y.split('').map(Number);
        while(x.length || y.length) {
            var s = (x.pop() || 0) + (y.pop() || 0) + c;
            r.unshift(s < 10 ? s : s - 10);
            c = s < 10 ? 0 : 1;
        }
        if(c) r.unshift(c);
        return r.join('');
    }

    var dec = '0';
    s.split('').forEach(function(chr) {
        var n = parseInt(chr, 16);
        for(var t = 8; t; t >>= 1) {
            dec = add(dec, dec);
            if(n & t) dec = add(dec, '1');
        }
    });
    return dec;
}

export function sha1(msg) {
    let promise = new Promise(function(resolve, reject){
      crypto.subtle.digest("SHA-1", stringToByteArray(msg)).then( hash => {
        resolve(byteArrayToHexString(new Uint8Array(hash)));
      });
    });
    return promise;
}

function sha256(msg) {
    let promise = new Promise(function(resolve, reject){
      crypto.subtle.digest("SHA-256", stringToByteArray(msg)).then( hash => {
        resolve(byteArrayToHexString(new Uint8Array(hash)));
      });
    });
    return promise;
}
