import { notImplemented } from "core/platform";
import * as fs from "platform/fs";

/**
 * read file from default location
 *
 * @param {string|Array} path
 * @returns {Promise}
 */
export let readFile = fs.readFile || notImplemented;

/**
 * write to file from default location
 *
 * @param {string|Array} path
 * @param {data} data - in a format accepted by the platform
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
