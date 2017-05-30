export default class {
  constructor() {
    this.name = 'result_selection';
  }

  generateSignals(aggregation) {
    const signals = [];

    Object.keys(aggregation.types).forEach((key) => {
      if (key.startsWith('result_selection')) {
        signals.push(aggregation.types[key]);
      }
    });

    return signals;
  }
}
