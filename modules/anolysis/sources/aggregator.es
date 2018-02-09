import Stats from '../platform/lib/simple-statistics';
import logger from './logger';


export default class Aggregator {
  constructor(keyBlackList = ['id', 'ts', 'session', 'seq', '_id', '_rev']) {
    this.keyBlacklist = new Set(keyBlackList);
  }

  aggregate(data) {
    const aggregation = {
      empty: data.size === 0 || ![...data.values()].some(v => v.length !== 0),
      types: { },
    };

    data.forEach((records, type) => {
      const keys = this.getAllKeys(records, this.keyBlacklist);

      aggregation.types[type] = { count: records.length, keys: { } };
      keys.forEach((key) => {
        const series = this.getValuesForKey(records, key);
        if (this.isIntervalSeries(series)) {
          aggregation.types[type].keys[key] = this.describeIntervalSeries(series);
        } else {
          aggregation.types[type].keys[key] = this.describeCategoricalSeries(series);
        }
      });
    });

    return aggregation;
  }

  // ----------------------------------------------------------------------- //
  // Private API - Kept in the class for unit tests
  // ----------------------------------------------------------------------- //

  getAllKeys(objects, blacklist) {
    const keys = new Set();
    for (let i = 0; i < objects.length; i += 1) {
      Object.keys(objects[i]).forEach((key) => {
        if (!blacklist.has(key)) {
          keys.add(key);
        }
      });
    }
    return keys;
  }

  getValuesForKey(objects, key) {
    return objects
      .filter(o => Object.prototype.hasOwnProperty.call(o, key))
      .map(o => o[key]);
  }

  isIntervalSeries(series) {
    return series.every(e => e === null || typeof e === 'number');
  }

  countOccurences(array) {
    /* eslint no-param-reassign: off */
    return array.reduce((counts, value) => {
      counts[value] = (counts[value] || 0) + 1;
      return counts;
    }, {});
  }

  describeCategoricalSeries(series) {
    return {
      count: series.length,
      categories: this.countOccurences(series),
    };
  }

  // TODO: add histogram
  describeIntervalSeries(series) {
    const numbers = [];
    let nullCount = 0;

    series.forEach((value) => {
      if (typeof value === 'number') {
        numbers.push(value);
      } else if (value === null) {
        nullCount += 1;
      }
    });

    const safeAggregation = (fn) => {
      try {
        // simple-statistics can throw exceptions if the input is not valid.
        return fn(numbers);
      } catch (ex) {
        logger.debug('Exception while trying to aggregate', fn, numbers, ex);
        return null;
      }
    };

    return {
      numbers: {
        count: numbers.length,
        mean: safeAggregation(ns => Stats.mean(ns)),
        median: safeAggregation(ns => Stats.median(ns)),
        stdev: safeAggregation(ns => Stats.standardDeviation(ns)),
        min: safeAggregation(ns => Stats.min(ns)),
        max: safeAggregation(ns => Stats.max(ns)),
      },
      nulls: {
        count: nullCount,
      },
    };
  }
}
