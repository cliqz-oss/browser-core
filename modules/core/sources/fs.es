import { notImplemented } from './platform';
import * as fs from '../platform/fs';

const notImplementedPromise = () => new Promise(() => notImplemented());

/**
 * Read file from default location.
 *
 * @param {string|Array} path
 * @param {Object} options - {bool} isText: decodes data before returning
 * @returns {Promise}
 */
export const readFile = fs.readFile || notImplementedPromise;

/**
 * Write to file from default location.
 *
 * @param {string|Array} path
 * @param {data} data - in a format accepted by the platform
 * @param {Object} options - {bool} isText: encodes data before writing
 * @returns {Promise}
 */
export const writeFile = fs.writeFile || notImplementedPromise;

/**
 * Create directory in default location, does not fail if directory exists.
 *
 * @param {string|Array} path
 * @returns {Promise}
 */
export const mkdir = fs.mkdir || notImplementedPromise;

/**
 * Similar to writeFile, but this one does not do atomic write. Always truncates file.
 *
 * @param {string|Array} path
 * @param {data} data - in a format accepted by the platform
 * @param {Object} options - {bool} isText: encodes data before writing
 * @returns {Promise}
 */
export const write = fs.write || notImplementedPromise;

/**
 * Renames old path to new path.
 *
 * @param {string|Array} oldPath
 * @param {string|Array} newPath
 * @returns {Promise}
 */
export const renameFile = fs.renameFile || notImplementedPromise;

/**
 * Returns whether it exists a file with given path or not.
 *
 * @param {string|Array} path
 * @returns {Promise}
 */
export const fileExists = fs.fileExists || notImplementedPromise;

/**
 * Truncates file with given path.
 *
 * @param {string|Array} path
 * @returns {Promise}
 */
export const truncateFile = fs.truncateFile || notImplementedPromise;

/**
 * Opens file with given file (creating if does not exist) and return
 * file object to be used in writeFD and closeFD functions.
 *
 * @param {string|Array} path
 * @returns {Promise}
 */
export const openForAppend = fs.openForAppend || notImplementedPromise;

/**
 * Writes to given open file.
 *
 * @param {Object} openFile
 * @param {data} data - in a format accepted by the platform
 * @param {Object} options - {bool} isText: encodes data before writing
 * @returns {Promise}
 */
export const writeFD = fs.writeFD || notImplementedPromise;

/**
 * Closes given open file.
 *
 * @param {Object} openFile
 * @returns {Promise}
 */
export const closeFD = fs.closeFD || notImplementedPromise;

/**
 * Removes file with given path, does not fail if file does not exist.
 *
 * @param {string|Array} path
 * @returns {Promise}
 */
export const removeFile = fs.removeFile || notImplementedPromise;

/**
 * Creates empty file with given path.
 *
 * @param {string|Array} path
 * @returns {Promise}
 */
export const createFile = fs.createFile || notImplementedPromise;

/**
 * Returns file size.
 *
 * @param {string|Array} path
 * @returns {Promise}
 */
export const getFileSize = fs.getFileSize || notImplementedPromise;

/**
 * Joins the given path components.
 *
 * @param {Array} paths
 * @returns {Promise}
 */
export const pathJoin = fs.pathJoin || notImplementedPromise;
