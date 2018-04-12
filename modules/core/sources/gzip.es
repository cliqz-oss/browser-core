import * as gzip from '../platform/gzip';

/**
 *  Compress a string
 *
 *  @param {string} string to compress
 *  @returns {UInt8Array} compressed data
 */
export const compress = gzip.compress || false;

/**
 *  Decompress a Gzip compressed string
 *
 *  @param {UInt8Array} gzipped data
 *  @returns {string} decompressed string
 */
export const decompress = gzip.decompress || false;
