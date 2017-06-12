/* global chai */
/* global describeModule */
/* global require */
/* eslint-disable func-names */

export default describeModule('market-analysis/common/utils',
  () => ({}),
  () => {
    describe('getHpnTimeStamp function', () => {
      let getHpnTimeStamp;

      beforeEach(function () {
        getHpnTimeStamp = this.module().getHpnTimeStamp;
      });

      it('check against today', () => {
        const today = new Date().toISOString();
        const isoYear = today.substring(0, 4);
        const isoMonth = today.substring(5, 7);
        const isoDay = today.substring(8, 10);
        const expected = `${isoYear}${isoMonth}${isoDay}`;
        chai.expect(getHpnTimeStamp()).eql(expected);
      });
    });

    describe('getTopLevelCategory function', () => {
      let getTopLevelCategory;

      beforeEach(function () {
        getTopLevelCategory = this.module().getTopLevelCategory;
      });

      it('check getTopLevelCategory', () => {
        chai.expect(getTopLevelCategory('Home.Bedline')).eql('Home');
        chai.expect(getTopLevelCategory('Home')).eql('Home');
        chai.expect(getTopLevelCategory('')).eql('');
      });
    });

    describe('joinKeyVal/splitKeyVal function', () => {
      let joinKeyVal;
      let splitKeyVal;

      beforeEach(function () {
        joinKeyVal = this.module().joinKeyVal;
        splitKeyVal = this.module().splitKeyVal;
      });

      it('check joinKeyVal', () => {
        chai.expect(joinKeyVal('cat', 'Home.Bedline')).eql('cat|Home.Bedline');
      });

      it('check splitKeyVal', () => {
        chai.expect(splitKeyVal('domain|amazon.de')).eql(['domain', 'amazon.de']);
      });
    });

    describe('generateItems function', () => {
      let generateItems;

      beforeEach(function () {
        generateItems = this.module().generateItems;
      });

      it('check generateItems', () => {
        const items = ['a', 'b', 'c'];
        const generator = generateItems(items);
        chai.expect(generator.next().value).eql('a');
        chai.expect(generator.next().value).eql('b');
        chai.expect(generator.next().value).eql('c');
        chai.expect(generator.next().value).eql(undefined);
      });
    });
  },
);
