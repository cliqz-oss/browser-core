import pako from 'pako';

/**
 * @param {!string} uncompressed input
 * @returns {Uint8Array} gzipped output
 */
export function compress(str) {
  return pako.gzip(str);
}

/**
 * @param {!string} gzipped input
 * @returns {string} uncompressed output
 */
export function decompress(str) {
  return pako.gunzip(str, { to: 'string' });
}
