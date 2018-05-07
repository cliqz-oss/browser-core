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

export { isDone, hasResults, hasResponded };
