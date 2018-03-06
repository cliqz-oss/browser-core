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
    ...last,
    results: Array.concat(...responses.map(response => response.results)),
  };
};

export default merge;
