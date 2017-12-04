// TODO: limit (sub)links
/*
 * Limits number of results. The limit depends on the provider.
 *
 * @param {Object} response - The response.
 */
const limit = ({ results, ...response }) => ({
  ...response,
  results: results.slice(0,
    response.config.operators.limit.limits[response.provider]),
});

export default limit;
