export default describeModule('anolysis/aggregator',
  function () {
    return {
      'anolysis/simple-statistics': {
        default: { mean: () => 'mean' },
      },
      'anolysis/logging': { default: () => {} },
    };
  },
  function () {
    describe('#getValuesForKey', function () {
      it('empty list', function () {
        const Aggregator = this.module().default;
        const aggregator = new Aggregator();
        const values = aggregator.getValuesForKey([]);
        chai.expect(values).to.be.empty;
      });
      it('1 object with existing key', function () {
        const Aggregator = this.module().default;
        const aggregator = new Aggregator();
        const values = aggregator.getValuesForKey([{ key_1: 0 }], 'key_1');
        chai.expect(values).to.have.members([0]);
      });
      it('1 object with non-existing key', function () {
        const Aggregator = this.module().default;
        const aggregator = new Aggregator();
        const values = aggregator.getValuesForKey([{ key_1: 0 }], 'key_2');
        chai.expect(values).to.be.empty;
      });
      it('2 objects with existing key in both objects', function () {
        const Aggregator = this.module().default;
        const aggregator = new Aggregator();
        const values = aggregator.getValuesForKey([{ key_1: 0 }, { key_1: 1 }], 'key_1');
        chai.expect(values).to.have.members([0, 1]);
      });
      it('2 objects with existing key in 1 object', function () {
        const Aggregator = this.module().default;
        const aggregator = new Aggregator();
        const values = aggregator.getValuesForKey([{ key_2: 0 }, { key_1: 1 }], 'key_1');
        chai.expect(values).to.have.members([1]);
      });
    });
    describe('#describeIntervalSeries', function () {
      var meanSeries;
      var medianSeries;
      var stdevSeries;
      var minSeries;
      var maxSeries;
      beforeEach(function() {
        this.deps('anolysis/simple-statistics').default.mean = (series) => { meanSeries = series; return 'mean'; };
        this.deps('anolysis/simple-statistics').default.median = (series) => { medianSeries = series; return 'median'; };
        this.deps('anolysis/simple-statistics').default.standardDeviation = (series) => { stdevSeries = series; return 'stdev'; };
        this.deps('anolysis/simple-statistics').default.min = (series) => { minSeries = series; return 'min'; };
        this.deps('anolysis/simple-statistics').default.max = (series) => { maxSeries = series; return 'max'; };
      });
      it('single number', function () {
        const Aggregator = this.module().default;
        const aggregator = new Aggregator();
        const values = aggregator.describeIntervalSeries([0]);
        chai.expect(values).to.be.eql({
          numbers: {
            count: 1,
            mean: 'mean',
            median: 'median',
            stdev: 'stdev',
            min: 'min',
            max: 'max',
          },
          nulls: {
            count: 0,
          }
        });
        chai.expect(meanSeries).to.eql([0]);
        chai.expect(medianSeries).to.eql([0]);
        chai.expect(stdevSeries).to.eql([0]);
        chai.expect(minSeries).to.eql([0]);
        chai.expect(maxSeries).to.eql([0]);
      });
      it('numbers and nulls', function () {
        const Aggregator = this.module().default;
        const aggregator = new Aggregator();
        const values = aggregator.describeIntervalSeries([0, null, 3]);
        chai.expect(values).to.be.eql({
          numbers: {
            count: 2,
            mean: 'mean',
            median: 'median',
            stdev: 'stdev',
            min: 'min',
            max: 'max',
          },
          nulls: {
            count: 1,
          }
        });
        chai.expect(meanSeries).to.eql([0, 3]);
        chai.expect(medianSeries).to.eql([0, 3]);
        chai.expect(stdevSeries).to.eql([0, 3]);
        chai.expect(minSeries).to.eql([0, 3]);
        chai.expect(maxSeries).to.eql([0, 3]);
      });
    });
    describe('#isIntervalSeries', function () {
      var aggregator;
      beforeEach(function () {
        const Aggregator = this.module().default;
        aggregator = new Aggregator();
      });
      it('should return true for empty list', function () {
        const isIntervalSeries = aggregator.isIntervalSeries([]);
        chai.expect(isIntervalSeries).to.be.true;
      });
      it('should return true for just nulls', function () {
        const isIntervalSeries = aggregator.isIntervalSeries([null, null]);
        chai.expect(isIntervalSeries).to.be.true;
      });
      it('should return true for numbers and nulls', function () {
        const isIntervalSeries = aggregator.isIntervalSeries([1, null, 4.5]);
        chai.expect(isIntervalSeries).to.be.true;
      });
      it('should return true for 1 integer', function () {
        const isIntervalSeries = aggregator.isIntervalSeries([1]);
        chai.expect(isIntervalSeries).to.be.true;
      });
      it('should return true for 2 integers', function () {
        const isIntervalSeries = aggregator.isIntervalSeries([1, 5]);
        chai.expect(isIntervalSeries).to.be.true;
      });
      it('should return true for 1 float', function () {
        const isIntervalSeries = aggregator.isIntervalSeries([1.1]);
        chai.expect(isIntervalSeries).to.be.true;
      });
      it('should return true for 2 floats', function () {
        const isIntervalSeries = aggregator.isIntervalSeries([1.1, 100.3]);
        chai.expect(isIntervalSeries).to.be.true;
      });
      it('should return true for integer and float', function () {
        const isIntervalSeries = aggregator.isIntervalSeries([1, 100.3]);
        chai.expect(isIntervalSeries).to.be.true;
      });
      it('should return false if list contains string', function () {
        const isIntervalSeries = aggregator.isIntervalSeries([5, '1', '44.3']);
        chai.expect(isIntervalSeries).to.be.false;
      });
      it('should return false if list contains boolean', function () {
        const isIntervalSeries = aggregator.isIntervalSeries([5, false, true]);
        chai.expect(isIntervalSeries).to.be.false;
      });
      it('should return false if list contains undefined', function () {
        const isIntervalSeries = aggregator.isIntervalSeries([5, undefined]);
        chai.expect(isIntervalSeries).to.be.false;
      });
      it('should return false if list contains list', function () {
        const isIntervalSeries = aggregator.isIntervalSeries([5, []]);
        chai.expect(isIntervalSeries).to.be.false;
      });
      it('should return false if list contains object', function () {
        const isIntervalSeries = aggregator.isIntervalSeries([5, {}]);
        chai.expect(isIntervalSeries).to.be.false;
      });
    });
    describe('#countOccurences', function () {
      it('empty array', function () {
        const Aggregator = this.module().default;
        const aggregator = new Aggregator();
        const counts = aggregator.countOccurences([]);
        chai.expect(counts).to.be.empty;
      });
      it('single string', function () {
        const Aggregator = this.module().default;
        const aggregator = new Aggregator();
        const counts = aggregator.countOccurences(['val_0']);
        chai.expect(counts).to.eql({val_0: 1});
      });
      it('multi-occurence of single string', function () {
        const Aggregator = this.module().default;
        const aggregator = new Aggregator();
        const counts = aggregator.countOccurences(['val_0', 'val_0']);
        chai.expect(counts).to.eql({val_0: 2});
      });
      it('single occurence of multiple strings', function () {
        const Aggregator = this.module().default;
        const aggregator = new Aggregator();
        const counts = aggregator.countOccurences(['val_0', 'val_1']);
        chai.expect(counts).to.eql({val_0: 1, val_1: 1});
      });
      it('multi-occurence of multiple strings', function () {
        const Aggregator = this.module().default;
        const aggregator = new Aggregator();
        const counts = aggregator.countOccurences(['val_0', 'val_1', 'val_0']);
        chai.expect(counts).to.eql({val_0: 2, val_1: 1});
      });
      it('multi-occurence of multiple booleans', function () {
        const Aggregator = this.module().default;
        const aggregator = new Aggregator();
        const counts = aggregator.countOccurences([true, false, true]);
        chai.expect(counts).to.eql({true: 2, false: 1});
      });
    });
    describe('#describeCategoricalSeries', function () {
      let aggregator;
      beforeEach(function initAggregator() {
        const Aggregator = this.module().default;
        aggregator = new Aggregator();
        aggregator.countOccurences = _ => 'categories';
      });
      it('empty array', () => {
        const desc = aggregator.describeCategoricalSeries([]);
        chai.expect(desc).to.eql({ count: 0, categories: 'categories' });
      });
      it('non-empty array', function () {
        let desc;
        desc = aggregator.describeCategoricalSeries([1]);
        chai.expect(desc).to.eql({ count: 1, categories: 'categories' });
        desc = aggregator.describeCategoricalSeries([1, 2]);
        chai.expect(desc).to.eql({ count: 2, categories: 'categories' });
        desc = aggregator.describeCategoricalSeries([1, 2, 3, 4]);
        chai.expect(desc).to.eql({ count: 4, categories: 'categories' });
      });
    });
    describe('#aggregate', function () {
      let aggregator;
      let records;

      beforeEach(function initAggregator() {
        this.deps('anolysis/simple-statistics').default.mean = () => 'mean';
        this.deps('anolysis/simple-statistics').default.median = () => 'median';
        this.deps('anolysis/simple-statistics').default.standardDeviation = () => 'stdev';
        this.deps('anolysis/simple-statistics').default.min = () => 'min';
        this.deps('anolysis/simple-statistics').default.max = () => 'max';

        const Aggregator = this.module().default;
        aggregator = new Aggregator();
        records = {
          type_test_1: [
            { behavior: { id: 'type_test_1', ts: 0, session: 's', seq: 0, _id: 'x', _rev: 'rev', key_1: 1, key_2: 'cat_1' } },
            { behavior: { id: 'type_test_1', ts: 0, session: 's', seq: 1, _id: 'x', _rev: 'rev', key_1: 2, key_2: 'cat_2' } },
          ],
          type_test_2: [],
        };
      });
      it('should return interval description for key_1 and categorical description for key_2', () => {
        const aggregation = aggregator.aggregate(records);
        chai.expect(aggregation).to.eql({
          empty: false,
          types: {
            type_test_1: {
              count: 2,
              keys: {
                key_1: {
                  numbers: {
                    count: 2,
                    mean: 'mean',
                    median: 'median',
                    stdev: 'stdev',
                    min: 'min',
                    max: 'max',
                  },
                  nulls: {
                    count: 0,
                  },
                },
                key_2: {
                  count: 2,
                  categories: { cat_1: 1, cat_2: 1 },
                },
              },
            },
            type_test_2: {
              count: 0,
              keys: { }
            }
          },
        });
      });
      it('should return total count if signal has no keys', () => {
        const aggregations = aggregator.aggregate({ type_test_1: [{}, {}] });
        chai.expect(aggregations.types.type_test_1).to.eql({ count: 2, keys: {} });
      });
      it('should set empty to true', () => {
        const aggregations = aggregator.aggregate({ type_test_1: [] });
        chai.expect(aggregations.empty).to.be.true;
      });
    });
  },
);
