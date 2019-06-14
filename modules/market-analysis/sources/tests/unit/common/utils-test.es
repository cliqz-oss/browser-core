/* global chai */
/* global describeModule */
/* eslint-disable func-names */

const prefs = {};

export default describeModule('market-analysis/common/utils',
  () => ({
    'core/prefs': {
      default: {
        get: function (k, v) {
          return prefs[k] || v;
        },
      }
    },
  }),
  () => {
    describe('getHpnTimeStamp function', () => {
      let getHpnTimeStamp;

      beforeEach(function () {
        getHpnTimeStamp = this.module().getHpnTimeStamp;
      });

      it('check against default', () => {
        chai.expect(getHpnTimeStamp()).eql('19700101');
      });

      describe('getHpnTimeStamp with prefs', () => {
        beforeEach(function () {
          prefs.config_ts = '20180404';
        });

        afterEach(function () {
          prefs.config_ts = undefined;
        });

        it('check against april 4', () => {
          chai.expect(getHpnTimeStamp()).eql('20180404');
        });
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
  });
