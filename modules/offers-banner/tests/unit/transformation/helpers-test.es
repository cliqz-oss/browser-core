/* global chai */
/* global describeModule */

export default describeModule('offers-banner/transformation/helpers',
  () => ({
    'core/platform': { default: {} },
    'core/prefs': { default: {} },
  }),
  () => {
    describe('calculateValidity function', () => {
      let calculateValidity;

      describe('basic cases', () => {
        beforeEach(function () {
          calculateValidity = this.module().calculateValidity;
        });

        it('expired in the next 70 years', () => {
          const d = Date.parse('04 Dec 2095 00:12:00 GMT');
          const d2 = Date.parse('04 Dec 2018 00:12:00 GMT');
          const { diff, diffUnit, expired = {} } = calculateValidity(d / 1000, d2);
          chai.expect(diff).to.be.equal(28124);
          chai.expect(diffUnit.includes('day')).to.be.true;
          chai.expect(expired.soon).to.be.false;
        });

        it('expired in the next 5 days', () => {
          const d = Date.parse('09 Dec 2095 00:12:00 GMT');
          const d2 = Date.parse('04 Dec 2095 00:12:00 GMT');
          const { diff, diffUnit, expired = {} } = calculateValidity(d / 1000, d2);
          chai.expect(diff).to.be.equal(5);
          chai.expect(diffUnit.includes('day')).to.be.true;
          chai.expect(expired.leftSome).to.be.true;
        });

        it('expired in the next hours', () => {
          const d = Date.parse('04 Dec 2018 04:12:00 GMT');
          const d2 = Date.parse('04 Dec 2018 00:12:00 GMT');
          const { diff, diffUnit, expired = {} } = calculateValidity(d / 1000, d2);
          chai.expect(diff).to.be.equal(4);
          chai.expect(diffUnit.includes('hour')).to.be.true;
          chai.expect(expired.soon).to.be.true;
        });
        it('expired in the next minutes', () => {
          const d = Date.parse('04 Dec 2018 00:32:00 GMT');
          const d2 = Date.parse('04 Dec 2018 00:12:00 GMT');
          const { diff, diffUnit, expired = {} } = calculateValidity(d / 1000, d2);
          chai.expect(diff).to.be.equal(20);
          chai.expect(diffUnit.includes('minute')).to.be.true;
          chai.expect(expired.soon).to.be.true;
        });
      });

      describe('null and zero cases', () => {
        beforeEach(function () {
          calculateValidity = this.module().calculateValidity;
        });

        it('should return undefined', () => {
          const { diff, diffUnit, expired } = calculateValidity(null);
          chai.expect(diff).to.be.undefined;
          chai.expect(diffUnit).to.be.undefined;
          chai.expect(expired).to.be.undefined;
        });

        it('should return undefined', () => {
          const { diff, diffUnit, expired } = calculateValidity(0);
          chai.expect(diff).to.be.undefined;
          chai.expect(diffUnit).to.be.undefined;
          chai.expect(expired).to.be.undefined;
        });
      });

      describe('past time case', () => {
        beforeEach(function () {
          calculateValidity = this.module().calculateValidity;
        });

        it('should return null', () => {
          const d = Date.parse('04 Dec 1970 00:12:00 GMT');
          const { diff, diffUnit, expired } = calculateValidity(d / 1000);
          chai.expect(diff).to.be.undefined;
          chai.expect(diffUnit).to.be.undefined;
          chai.expect(expired).to.be.undefined;
        });
      });

      describe('two equals dates', () => {
        beforeEach(function () {
          calculateValidity = this.module().calculateValidity;
        });

        it('should return null', () => {
          const d = Date.parse('04 Dec 1970 00:12:00 GMT');
          const { diff, diffUnit, expired = {} } = calculateValidity(d / 1000, d);
          chai.expect(diff).to.be.equal(0);
          chai.expect(diffUnit.includes('minute')).to.be.true;
          chai.expect(expired.soon).to.be.true;
        });
      });
    });
  });
