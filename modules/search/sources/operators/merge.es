/*
 * Merges multiple responses into one by concatening their results.
 *
 * @param {Object[]} responses - The responses.
 */
const merge = (responses) => {
  if (responses.length === 0) {
    return [];
  }

  const last = responses.slice(-1)[0];

  return {
    results: Array.concat(...responses.map(response => response.results)),
    state: last.state,
    provider: last.provider,
    // config is set on new search (focus), thus is the same for all providers
    config: last.config,
    query: last.query,
  };
};

export default merge;
