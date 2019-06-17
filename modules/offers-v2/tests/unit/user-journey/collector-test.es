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

      it('/unconditionally create new steps', () => {
        collector.addStep({ feature: 'f1' });
        collector.addStep({ feature: 'amazon' });
        collector.addStep({ feature: 'ebay' });

        const journey = collector.getJourney();

        chai.expect(journey).to.eql(
          [['f1'], ['amazon'], ['ebay']]
        );
      });

      it('remember url of a created step', () => {
        collector.addStep({ feature: 'f', url: 'some.com' });

        const lastStep = collector.journey.pop();
        chai.expect(lastStep.url).to.eq('some.com');
      });

      it('merge a feature if urls match', () => {
        collector.addStep({ feature: 'f1', url: 'some.com' });
        collector.addFeature({ feature: 'f2', url: 'some.com' });

        const journey = collector.getJourney();

        chai.expect(journey).to.eql([['f1', 'f2']]);
      });

      it('merge a feature if no urls', () => {
        collector.addStep({ feature: 'f1', url: 'some.com' });
        collector.addFeature({ feature: 'f2' });

        const journey = collector.getJourney();

        chai.expect(journey).to.eql([['f1', 'f2']]);
      });

      it('drop a feature if urls mismatch', () => {
        collector.addStep({ feature: 'f1', url: 'some.com' });
        collector.addFeature({ feature: 'will-be-dropped', url: 'another.com' });

        const journey = collector.getJourney();

        chai.expect(journey).to.eql([['f1']]);
      });

      it('drop a feature if journey is empty', () => {
        collector.addFeature({ feature: 'will-be-dropped', url: 'some.com' });

        const journey = collector.getJourney();

        chai.expect(journey).to.eql([]);
      });

      it('/limit size of journey', () => {
        Array(100).fill().forEach((_, i) => {
          collector.addStep({ feature: `f${i}` });
        });

        const journey = collector.getJourney();
        chai.expect(journey.length).to.be.below(50, 'journey size');
      });

      it('/retain "unk" placeholder if no features added', () => {
        collector.addStep({ feature: 'unk' });
        collector.addStep({ feature: 'unk' });

        const journey = collector.getJourney();
        chai.expect(journey).to.eql([['unk'], ['unk']]);
      });

      it('/drop "unk" placeholder when a feature added', () => {
        collector.addStep({ feature: 'unk', url: 'some' });
        collector.addFeature({ feature: 'feature', url: 'some' });

        const journey = collector.getJourney();
        chai.expect(journey).to.eql([['feature']]);
      });
    });
  });
