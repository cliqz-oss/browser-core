/* eslint-disable import/prefer-default-export */

/**
 * This file is meant to contain re-usable code related analyses. You can think
 * of it as a toolbox containing building blocks that can be used for aggregated
 * metrics.
 */

/**
 * Given a histogram which keys are indices (contiguous integers), creates an
 * array histogram where indices are the keys, and values are the counts
 * (defaulting to zero).
 *
 * e.g.:
 * >>> indexHistogramToArray(new Counter([1, 1, 2, 2, 2, 3, 1]))
 * [0, 3, 3, 1]
 */
export function indicesHistogramToArray(counter) {
  const array = [];
  const maximumIndex = Math.max(...counter.keys());
  for (let i = 0; i <= maximumIndex; i += 1) {
    array.push(counter.get(i));
  }
  return array;
}
