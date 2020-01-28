/* global describeModule */
/* global chai */

export default describeModule('offers-v2/coupon/journey',
  () => ({ }),
  () => {
    let Journey;
    let journey;
    beforeEach(function () {
      Journey = this.module().default;
      journey = new Journey();
    });
    afterEach(function () {
      Journey = null;
      journey = null;
    });
    describe('constructor', () => {
      it('should be valid default constructor', () => {
        chai.expect(journey.done).to.be.false;
        chai.expect(journey.bestPath).to.deep.eq([]);
      });

      it('should be valid copy constructor', () => {
        journey.lastTs += 1000; // sec
        journey.done = true;
        const newJourney = new Journey(journey);
        chai.expect(journey.done).to.eq(newJourney.done);
        chai.expect(journey.lastTs).to.eq(newJourney.lastTs);
        chai.expect(journey.bestPath).to.deep.eq(newJourney.bestPath);
        chai.expect(journey.paths).to.deep.eq(newJourney.paths);
      });

      it('should be valid copy constructor after init', () => {
        journey.init(['a b c', 'a']);
        const newJourney = new Journey(journey);
        chai.expect(journey.done).to.eq(newJourney.done);
        chai.expect(journey.lastTs).to.eq(newJourney.lastTs);
        chai.expect(journey.bestPath).to.deep.eq(newJourney.bestPath);
        chai.expect(journey.paths).to.deep.eq(newJourney.paths);
      });
    });

    describe('method init', () => {
      it('should update paths', () => {
        const journey1 = new Journey();
        const journey2 = new Journey();
        journey1.init(['a b c']);
        journey2.init(['a b c', 'd']);
        chai.expect(journey1.paths).to.deep.eq([['a', 'b', 'c']]);
        chai.expect(journey2.paths).to.deep.eq([['a', 'b', 'c'], ['d']]);
      });
    });

    describe('method receive', () => {
      it('should fulfil one step path', () => {
        journey.init(['a b c', 'd']);
        journey.receive('d');
        chai.expect(journey.done).to.be.true;
      });

      it('should fulfil many steps path', () => {
        journey.init(['a b c', 'd']);
        journey.receive('a');
        chai.expect(journey.done).to.be.false;
        journey.receive('b');
        chai.expect(journey.done).to.be.false;
        journey.receive('c');
        chai.expect(journey.done).to.be.true;
      });

      it('should follow selection rule', () => {
        journey.init(['a b c', 'e d']);
        journey.receive('e');
        chai.expect(journey.done).to.be.false;
        chai.expect(journey.paths.length).to.eq(1);
      });

      it('should follow selection rule with same prefix', () => {
        journey.init(['a b c', 'a z y', 'd e', 'g h', 'd t']);
        journey.receive('a');
        chai.expect(journey.done).to.be.false;
        chai.expect(journey.paths.length).to.eq(2);
      });

      it('if done should not receive any events', () => {
        journey.init(['a', 'a z y', 'd e', 'g h', 'd t']);
        journey.receive('a');
        chai.expect(journey.done).to.be.true;
        const lastTs = journey.lastTs;
        journey.receive('z');
        journey.receive('d');
        journey.receive('g');
        chai.expect(journey.lastTs).to.eq(lastTs);
      });

      it('should not receive any events unknown events', () => {
        journey.init(['a b c', 'd e f']);
        const lastTs = journey.lastTs;
        journey.receive('x');
        chai.expect(journey.lastTs).to.eq(lastTs);
      });

      it('should not receive any events in wrong order', () => {
        journey.init(['a b c']);
        const lastTs = journey.lastTs;
        journey.receive('b');
        chai.expect(journey.lastTs).to.eq(lastTs);
        journey.receive('c');
        chai.expect(journey.lastTs).to.eq(lastTs);
      });
    });

    describe('method getBestPath', () => {
      it('should return matching path', () => {
        journey.init(['a b c', 'a d e', 'a b z']);
        journey.receive('a');
        journey.receive('x');
        journey.receive('b');
        chai.expect(journey.getBestPath()).to.eq('a b');
      });
    });
  });
