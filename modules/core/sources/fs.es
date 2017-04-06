import { notImplemented } from './platform';
import * as fs from '../platform/fs';

/**
 * Read file from default location.
 *
 * @param {string|Array} path
 * @param {Object} options - {bool} isText: decodes data before returning
 * @returns {Promise}
 */
export const readFile = fs.readFile || notImplemented;

/**
 * Write to file from default location.
 *
 * @param {string|Array} path
 * @param {data} data - in a format accepted by the platform
 * @param {Object} options - {bool} isText: encodes data before writing
 * @returns {Promise}
 */
export const writeFile = fs.writeFile || notImplemented;

/**
 * Create directory in default location, does not fail if directory exists.
 *
 * @param {string|Array} path
 * @returns {Promise}
 */
export const mkdir = fs.mkdir || notImplemented;

/**
 * Similar to writeFile, but this one does not do atomic write. Always truncates file.
 *
 * @param {string|Array} path
 * @param {data} data - in a format accepted by the platform
 * @param {Object} options - {bool} isText: encodes data before writing
 * @returns {Promise}
 */
export const write = fs.write || notImplemented;

/**
 * Renames old path to new path.
 *
 * @param {string|Array} oldPath
 * @param {string|Array} newPath
 * @returns {Promise}
 */
export const renameFile = fs.renameFile || notImplemented;

/**
 * Returns whether it exists a file with given path or not.
 *
 * @param {string|Array} path
 * @returns {Promise}
 */
export const fileExists = fs.fileExists || notImplemented;

/**
 * Truncates file with given path.
 *
 * @param {string|Array} path
 * @returns {Promise}
 */
export const truncateFile = fs.truncateFile || notImplemented;

/**
 * Opens file with given file (creating if does not exist) and return
 * file object to be used in writeFD and closeFD functions.
 *
 * @param {string|Array} path
 * @returns {Promise}
 */
export const openForAppend = fs.openForAppend || notImplemented;

/**
 * Writes to given open file.
 *
 * @param {Object} openFile
 * @param {data} data - in a format accepted by the platform
 * @param {Object} options - {bool} isText: encodes data before writing
 * @returns {Promise}
 */
export const writeFD = fs.writeFD || notImplemented;

/**
 * Closes given open file.
 *
 * @param {Object} openFile
 * @returns {Promise}
 */
export const closeFD = fs.closeFD || notImplemented;

/**
 * Removes file with given path, does not fail if file does not exist.
 *
 * @param {string|Array} path
 * @returns {Promise}
 */
export const removeFile = fs.removeFile || notImplemented;

/**
 * Creates empty file with given path.
 *
 * @param {string|Array} path
 * @returns {Promise}
 */
export const createFile = fs.createFile || notImplemented;

/**
 * Returns file size.
 *
 * @param {string|Array} path
 * @returns {Promise}
 */
export const getFileSize = fs.getFileSize || notImplemented;

/**
 * Joins the given path components.
 *
 * @param {Array} paths
 * @returns {Promise}
 */
export const pathJoin = fs.pathJoin || notImplemented;
