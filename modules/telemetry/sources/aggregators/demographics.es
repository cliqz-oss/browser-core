import Aggregator from 'telemetry/aggregators/base';

export default class extends Aggregator {
  constructor(trees = {}) {
    super();

    this.k = 10;
    this.id = '_demographics';
    this.trees = trees;
  }

  aggregate(records = { }) {
    const demo = (records[this.id] || []).pop() || { };
    const anon = { };
    this.getAllKeys([demo])
      .forEach(key => {
        if (key in this.trees) {
          anon[key] = this.trees[key].anonymize(demo[key], this.k);
        } else {
          // TODO: drop keys for which there is no tree
          anon[key] = '';
        }
      });
    return anon;
  }
}
