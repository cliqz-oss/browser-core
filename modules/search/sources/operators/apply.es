/*
 * Applies an operator to all results of the given response.
 *
 * @param {Object} response - The response.

 */
const apply = ({ results, ...response }, operator) => ({
  results: results.map(operator),
  ...response,
});

export default apply;
