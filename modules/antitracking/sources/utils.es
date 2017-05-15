import { toBase64 } from '../core/encoding';
import { compress } from '../core/gzip';

export function compressionAvailable() {
  return compress !== false;
}

export function compressJSONToBase64(obj) {
  const bytes = compress(JSON.stringify(obj));
  return toBase64(bytes);
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
