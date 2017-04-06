

// NOTE: This analysis is temporary. In the future we will
// have separated analyses for each AB test, along with
// behavioral data we need to perform the test.
export default class {
  constructor() {
    this.name = 'abtests';
    this.needs_gid = true;
  }

  generateSignals(aggregation, abtests) {
    const signals = [];

    abtests.forEach((abtest) => {
      signals.push({
        data: {
          abtest,
        },
      });
    });

    return signals;
  }
}
