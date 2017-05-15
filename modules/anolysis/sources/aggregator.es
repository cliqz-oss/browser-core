import Stats from './simple-statistics';


export default class {
  constructor(keyBlackList = ['id', 'ts', 'session', 'seq', '_id', '_rev']) {
    this.keyBlacklist = keyBlackList;
  }

  aggregate(data) {
    const aggregation = {
      // TODO: keep DRY (same logic as in retention)
      empty: Object.keys(data).length === 0 ||
           !Object.keys(data).some(key => data[key].length),
      types: { },
    };

    Object.keys(data).forEach((type) => {
      // TODO: combine getting keys and series (for efficiency)
      const records = data[type].map(record => record.behavior || {});
      const keys = this.getAllKeys(records, { blacklist: this.keyBlacklist });

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

  getAllKeys(objects, { blacklist = [] } = { }) {
    const keys = new Set();
    objects.forEach(o => Object.keys(o).forEach(key => keys.add(key)));
    blacklist.forEach(key => keys.delete(key));
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
    }, Object.create(null));
  }


  describeCategoricalSeries(series) {
    return Object.assign(Object.create(null), {
      count: series.length,
      categories: this.countOccurences(series),
    });
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

    return Object.assign(Object.create(null), {
      numbers: {
        count: numbers.length,
        mean: Stats.mean(numbers),
        median: Stats.median(numbers),
        stdev: Stats.standardDeviation(numbers),
        min: Stats.min(numbers),
        max: Stats.max(numbers),
      },
      nulls: {
        count: nullCount,
      },
    });
  }
}
