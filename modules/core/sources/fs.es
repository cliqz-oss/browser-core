import { notImplemented } from "core/platform";
import * as fs from "platform/fs";

/**
 * read file from default location
 *
 * @param {string|Array} path
  * @param {Object} options - {bool} isText: decodes data before returning
 * @returns {Promise}
 */
export let readFile = fs.readFile || notImplemented;

/**
 * write to file from default location
 *
 * @param {string|Array} path
 * @param {data} data - in a format accepted by the platform
 * @param {Object} options - {bool} isText: encodes data before writing
 * @returns {Promise}
 */
export let writeFile = fs.writeFile || notImplemented;

/**
 * create directory in default location
 *
 * @param {string|Array} path
 * @returns {Promise}
 */
export let mkdir = fs.mkdir || notImplemented;
