/*
 * Partially updates a list of responses to reduce flickering.
 *
 * @param {Object[]} currentResults - The responses of the current result.
 * @param {Object[]} previousResults - The responses of the previous result.
 */
const update = ([currentResults, previousResults]) => {
  // incompatible number of providers
  if (currentResults.length !== previousResults.length) {
    return currentResults;
  }

  const updatedResults = currentResults.map((currentResult, index) => {
    const previousResult = previousResults[index];
    const hasCurrentResults = currentResult.results.length > 0;
    const isCurrentResultDone = currentResult.state === 'done';

    if (isCurrentResultDone || hasCurrentResults) {
      return currentResult;
    }

    return {
      ...previousResult,
      state: 'outdated',
    };
  });

  return updatedResults;
};

export default update;
