import Counter from './counter';

/**
 * Given an array of integers, creates an (object) histogram where integers are
 * the keys and values are the counts. Allows for specifying bin size and bin
 * count (with catch-all, overflow bin).
 *
 * e.g.:
 * >>> integersToHistogram([1, 1, 2, 2, 2, 3, 1, 20])
 * { '1': 3, '2': 3, '3': 1, 'rest': 1 }
 */
const integersToHistogram = (values, { binSize = 1, binCount = 10, overflowBinName = 'rest' } = {}) =>
  new Counter(values
    .map(v => parseInt(v / binSize, 10))
    .map(v => ((!binCount || v < binCount) ? v * binSize : overflowBinName)))
    .toObj();

export default integersToHistogram;
