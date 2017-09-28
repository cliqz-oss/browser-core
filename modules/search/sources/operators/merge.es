/*
 * Merges multiple responses into one by concatening their results.
 *
 * @param {Object[]} responses - The responses.
 */
const merge = (responses) => {
  if (responses.length === 0) {
    return [];
  }

  return {
    results: Array.concat(...responses.map(response => response.results)),
    state: responses[0].state,
    provider: responses[0].provider,
  };
};

export default merge;
