/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * @function isDone
 * @param {Object} response - The response.
 * @param {string} response.state - The state of the response.
 * @returns {boolean} True, if the response states that the provider is
 *   done providing results.
 */
const isDone = ({ state } = {}) => state === 'done';

/**
 * @function hasResults
 * @param {Object} response - The response.
 * @param {Object[]} response.results - The results of the response.
 * @returns {boolean} True, if the response contains at least one result.
 */
const hasResults = ({ results = [] } = {}) => results.length > 0;

/**
 * @function hasResponded
 * @param {Object} response - The response.
 * @param {string} response.state - The state of the response.
 * @param {Object[]} response.results - The results of the response.
 * @returns {boolean} True, if the response contains at least one result or
 *   if the response states that the provider is done providing results.
 */
const hasResponded = response =>
  hasResults(response) || isDone(response);

/**
 * Removes all results from a response.
 *
 * @param {Object} response The response to remove results from.
 * @return {Object} The response with empty results.
 */
const clearResults = response => ({ ...response, results: [] });

export { isDone, hasResults, hasResponded, clearResults };
