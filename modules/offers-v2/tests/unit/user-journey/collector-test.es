/* global chai */
/* global describeModule */
/* global require */
const commonMocks = require('../utils/common');

export default describeModule('offers-v2/user-journey/collector',
  () => ({
    ...commonMocks,
  }),
  () => {
    describe('journey collector', function () {
      let collector;

      beforeEach(async function () {
        const JourneyCollector = this.module().default;
        collector = new JourneyCollector();
      });

      it('/return empty journey after creation', () => {
        const journey = collector.getJourney();

        chai.expect(journey).to.eql([]);
      });

      it('/return several steps from several events', () => {
        collector.addEvent({ ts: 10000, feature: 'f1' });
        collector.addEvent({ ts: 20000, feature: 'f2' });
        collector.addEvent({ ts: 30000, feature: 'f3' });

        const journey = collector.getJourney();

        chai.expect(journey).to.eql([['f1'], ['f2'], ['f3']]);
      });

      it('/join nearly simultaneous events to one step', () => {
        collector.addEvent({ ts: 10000, feature: 'f1' });
        collector.addEvent({ ts: 20010, feature: 'f2' });
        collector.addEvent({ ts: 20020, feature: 'f3' });
        collector.addEvent({ ts: 20030, feature: 'f4' });
        collector.addEvent({ ts: 30000, feature: 'f5' });

        const journey = collector.getJourney();

        chai.expect(journey).to.eql(
          [['f1'], ['f2', 'f3', 'f4'], ['f5']]
        );
      });

      it('/limit size of journey', () => {
        Array(100).fill().forEach((_, i) => {
          collector.addEvent({ ts: i * 10000, feature: `f${i}` });
        });

        const journey = collector.getJourney();
        chai.expect(journey.length).to.be.below(20, 'journey size');
      });
    });
  });
