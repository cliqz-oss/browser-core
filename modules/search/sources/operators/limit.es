const LIMITS = {
  cliqz: 3,
  history: 3,
  'query-suggestions': 5,
};

// TODO: limit (sub)links
/*
 * Limits number of results. The limit depends on the provider.
 *
 * @param {Object} response - The response.
 */
const limit = ({ results, ...response }) => ({
  ...response,
  results: results
    .slice(0, LIMITS[response.provider]),
});

export default limit;
