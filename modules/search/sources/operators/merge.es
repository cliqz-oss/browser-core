// TODO: remove?
/*
 * Merges multiple responses into one by concatening their results.
 *
 * @param {Object[]} responses - The responses.
 */
const merge = (responses) => {
  if (responses.length === 0) {
    // TODO: handle elswhere?
    return {
      results: [],
    };
  }

  const latest = responses.reduce((min, cur) =>
    (cur.params && min.params && cur.params.ts > min.params.ts ? cur : min),
  responses.slice(-1)[0]);
  return {
    ...latest,
    results: [].concat(...responses.map(response => response.results)),
  };
};

export default merge;
