import { compress } from 'core/gzip';

function _arrayBufferToBase64( buffer ) {
    var binary = '';
    var bytes = new Uint8Array( buffer );
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode( bytes[ i ] );
    }
    return btoa( binary );
}

function _base64ToArrayBuffer(base64) {
    var binary_string =  window.atob(base64);
    var len = binary_string.length;
    var bytes = new Uint8Array( len );
    for (var i = 0; i < len; i++)        {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}

export function compressionAvailable() {
  return compress !== false;
}

export function compressJSONToBase64(obj) {
  const bytes = compress(JSON.stringify(obj));
  return _arrayBufferToBase64(bytes);
}

export function splitTelemetryData(data, bucketSize) {
  let acc = 0;
  let bucket = {};
  const splitData = [];
  for (const k in data) {
    const length = JSON.stringify(data[k]).length;
    // full bucket
    if ( acc != 0 && acc + length > bucketSize ) {
      // full bucket, push it
      splitData.push(bucket);
      bucket = {};
      acc = 0;
    }
    acc += length;
    bucket[k] = data[k];
  }
  if ( Object.keys(bucket).length > 0 ) {
    splitData.push(bucket);
  }
  return splitData;
}

export function generatePayload(data, ts, instant, attachAttrs) {
    var payl = {
        'data': data,
        'ts': ts,
        'anti-duplicates': Math.floor(Math.random() * 10000000)
    };
    if (instant)
        payl['instant'] = true;
    if (attachAttrs) {
      for (const k in attachAttrs) {
        payl[k] = attachAttrs[k];
      }
    }
    return payl;
}

export function cleanTimestampCache(cacheObj, timeout, currTime) {
  const keys = Object.keys(cacheObj)
  keys.forEach(function(k) {
    if (currTime - cacheObj[k] || 0 > timeout) {
      delete cacheObj[k];
    }
  });
}
