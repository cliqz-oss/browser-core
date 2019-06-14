import { ModuleDisabledError, ModuleMissingError } from '../core/app/module-errors';

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

/**
 * To be used together with core/kord/inject
 * Calling an action of disabled or missing module
 * results in promise rejects. This helper function
 * generates a promise error callback that will
 * resolve to fixed value in those cases.
 *
 * Example:
 *
 *   inject.module('freshtab').action('getConfig')
 *     .catch(actionFallback({}));
 */
export const actionFallback = fallbackValue => (error) => {
  if (error instanceof ModuleDisabledError || error instanceof ModuleMissingError) {
    return fallbackValue;
  }
  throw error;
};

/**
 * Given a list of possible keys, return the JSON schema of the result of a call
 * to `count` (defined below).
 */
export function counterSchema(keys) {
  const properties = {};

  keys.forEach((key) => {
    properties[key] = { type: 'integer', minimum: 0 };
  });

  return {
    required: [],
    properties,
  };
}

/**
 * Return the count of each value in `values`. This can be used in conjunction
 * with `counterSchema` to help create analyses.
 */
export function count(values) {
  const result = {};

  values.forEach((value) => {
    result[value] = (result[value] || 0) + 1;
  });

  return result;
}


export function sum(arr) {
  let total = 0.0;
  for (let i = 0; i < arr.length; i += 1) {
    total += arr[i];
  }
  return total;
}


export function mean(arr) {
  return sum(arr) / arr.length;
}


export function median(arr) {
  arr.sort((a, b) => a - b);

  if (arr.length === 0) return 0;

  const half = Math.floor(arr.length / 2);

  if (arr.length % 2) return arr[half];
  return (arr[half - 1] + arr[half]) / 2.0;
}
