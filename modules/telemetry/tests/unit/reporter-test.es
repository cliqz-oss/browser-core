export default describeModule("telemetry/reporter",
  function () {
    return { }
  },
  function () {
    var aggregator;
    var demographicsAggregator;
    var behaviorTimespan;
    var demographicsTimespans;
    var reporter;
    var behavior = { };
    var demographicsStorage = { };
    beforeEach(function() {
      behaviorTimespan = undefined;
      demographicsTimespans = [];
      behavior.getTypesByTimespan = (_timespan) => {
        behaviorTimespan = _timespan;
        return Promise.resolve({
          type_1: [{ signal_key: 1 }],
          type_2: [{ signal_key: 2 }],
        });
      };
      demographicsStorage.getTypesByTimespan = (_timespan) => {
        demographicsTimespans.push(_timespan);
        return Promise.resolve({
          _demographics: [{
            demo_1: 'demo_1_value',
            demo_2: '',
          }],
        });
      };
      aggregator = {
        aggregate: (records) => { return { types: Object.keys(records).map(type => records[type][0]) }; },
      };
      demographicsAggregator = {
        aggregate: (records) => {
          const aggregate = { };
          Object.keys(records._demographics[0])
            .forEach(key => aggregate[key] = records._demographics[0][key]);
          return aggregate;
        },
      };

      const Reporter = this.module().default;
      reporter = new Reporter(behavior, demographicsStorage);
    });
    describe("#joinMessages", function () {
      it("should return empty list", function () {
        chai.expect(reporter.joinMessages([], [])).to.eql([]);
        chai.expect(reporter.joinMessages([{ a: 1 }], [])).to.eql([]);
        chai.expect(reporter.joinMessages([], [{ b: 1 }])).to.eql([]);
      });
      it("should join two messages", function () {
        chai.expect(reporter.joinMessages([{ a: 1 }], [{ b: 1 }])).to.eql([{ a: 1, b: 1 }]);
      });
      it("should join multiple messages", function () {
        chai.expect(reporter.joinMessages([{ a: 1 }, { a: 2 }], [{ b: 1 }])).to.eql([{ a: 1, b: 1 }, { a: 2, b: 1 }]);
        chai.expect(reporter.joinMessages([{ a: 1 }, { a: 2 }], [{ b: 1 }, { b: 2 }])).to.eql(
          [{ a: 1, b: 1 }, { a: 1, b: 2 }, { a: 2, b: 1 }, { a: 2, b: 2 }]);
      });
    });
    describe("#createBehaviorMessage", function () {
      it("should retrieve records for given timespan, aggregate them, and return them as a message", function () {
        return reporter.createBehaviorMessage({ from: 1, to: 99 }, aggregator).then((message) => {
          chai.expect(behaviorTimespan).to.eql({ from: 1, to: 99 });
          chai.expect(message).to.eql({
            behavior: {
              timespan: { from: 1, to: 99 },
              types: [{ signal_key: 1 }, { signal_key: 2 }],
            },
          });
        });
      });
    });
    describe("#createDemographicsMessages", function () {
      it("should retrieve records for given timespan, aggregate them, and return them as a message", function () {
        return reporter.createDemographicsMessages({ from: 1, to: 99 }, demographicsAggregator).then((messages) => {
          chai.expect(demographicsTimespans[0]).to.eql({ from: 1, to: 99 });
          chai.expect(messages).to.eql([
            { demographics: {
                demo_1: 'demo_1_value',
              },
            },
            { demographics: {
                demo_2: '',
              },
            },
            { demographics: {
                _any: true,
              },
            },
          ]);
        });
      });
    });
    describe("#createMessages", function () {
      it("should throw error if interval is given but no timespan", function () {
        chai.expect(reporter.createMessages.bind(reporter, aggregator, demographicsAggregator, { }, 5)).to.throw(Error);
        chai.expect(reporter.createMessages.bind(reporter, aggregator, demographicsAggregator, { from: 1 }, 5)).to.throw(Error);
        chai.expect(reporter.createMessages.bind(reporter, aggregator, demographicsAggregator, { to: 1 }, 5)).to.throw(Error);
      });
      it("should throw error if interval <= 0 is given", function () {
        chai.expect(reporter.createMessages.bind(reporter, aggregator, demographicsAggregator, { from: 1, to: 2 }, 0)).to.throw(Error);
        chai.expect(reporter.createMessages.bind(reporter, aggregator, demographicsAggregator, { from: 1, to: 2 }, -1)).to.throw(Error);
      });
      it("should return messages for one timespan", function () {
         return reporter.createMessages(aggregator, demographicsAggregator, { from: 0, to: 10 }, 10).then((messages) => {
            chai.expect(messages.length).to.equal(3);
            chai.expect(messages[0]).to.eql({
              demographics: {
                demo_1: 'demo_1_value',
              },
              behavior: {
                timespan: { from: 0, to: 10 },
                types: [{ signal_key: 1 }, { signal_key: 2 }],
              },
            });
            chai.expect(messages[1].demographics.demo_2).to.equal('');
            chai.expect(messages[2].demographics._any).to.be.true;
         });
      });
      it("should return messages for intervals and use latest timespan for demographics", function () {
         return reporter.createMessages(aggregator, demographicsAggregator, { from: 0, to: 10 }, 2).then((messages) => {
            chai.expect(messages.length).to.equal(12);
            chai.expect(messages[0]).to.eql({
              demographics: {
                demo_1: 'demo_1_value',
              },
              behavior: {
                timespan: { from: 0, to: 2 },
                types: [{ signal_key: 1 }, { signal_key: 2 }],
              },
            });
            chai.expect(messages[11]).to.eql({
              demographics: {
                _any: true,
              },
              behavior: {
                timespan: { from: 9, to: 10 },
                types: [{ signal_key: 1 }, { signal_key: 2 }],
              },
            });
            for (let i = 0; i < 4; i++) {
              chai.expect(messages[i].demographics.demo_1).to.equal('demo_1_value');
            }
            for (let i = 4; i < 8; i++) {
              chai.expect(messages[i].demographics.demo_2).to.equal('');
            }
            for (let i = 8; i < 12; i++) {
              chai.expect(messages[i].demographics._any).to.equal(true);
            }
            for (let i = 0; i < 12; i+=4) {
              chai.expect(messages[i].behavior.timespan).to.eql({ from: 0, to: 2 });
            }
            for (let i = 1; i < 12; i+=4) {
              chai.expect(messages[i].behavior.timespan).to.eql({ from: 3, to: 5 });
            }
            for (let i = 2; i < 12; i+=4) {
              chai.expect(messages[i].behavior.timespan).to.eql({ from: 6, to: 8 });
            }
            for (let i = 3; i < 12; i+=4) {
              chai.expect(messages[i].behavior.timespan).to.eql({ from: 9, to: 10 });
            }
            for (let i = 0; i < 12; i++) {
              chai.expect(messages[i].behavior.types).to.eql([{ signal_key: 1 }, { signal_key: 2 }]);
            }
            demographicsTimespans.forEach(timespan => chai.expect(timespan).to.eql({ from: 9, to: 10 }));
         });
      });
    });
  }
)
