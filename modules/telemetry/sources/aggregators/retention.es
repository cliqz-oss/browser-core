import Aggregator from 'telemetry/aggregators/base';

export default class extends Aggregator {
  constructor() {
    super();
    // TODO: use more meaningful name for `types` (e.g., `typesToInclude`)
    this.types = [
      'activity_results',
    ];
  }

  /**
   * Aggregate records: check if signals are present for given signal types.
   * @param {Object} records - The lists of signals by signal type.
   * @return {Object} The aggregation.
   */
  aggregate(records) {
    const aggregation = {
      // no keys or only empty-list values
      empty: Object.keys(records).length === 0 ||
             !Object.keys(records).some(key => records[key].length),
      types: { },
    };
    this.types.forEach(type =>
      (aggregation.types[type] = type in records && records[type].length > 0));
    return aggregation;
  }
}
